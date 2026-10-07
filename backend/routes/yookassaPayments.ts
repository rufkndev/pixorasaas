// Оплата по сценарию «Умный платёж»: мы создаём платёж, уводим пользователя на
// форму ЮKassa и ждём уведомления. Способ оплаты выбирает он сам, поэтому
// никаких payment_method_data мы не передаём.

import { Router } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';

import { YookassaError, YookassaPayment, trimDescription, yookassaService } from '../services/yookassaService';
import { brandbooksRepo, consentsRepo, logosRepo, paymentsRepo } from '../db/repositories';
import { Payment } from '../db/types';
import { requireAuth } from '../auth/middleware';
import { createPaymentSchema, firstError, orderIdSchema } from '../auth/schemas';
import { clientMeta } from '../auth/service';
import { LEGAL_VERSIONS } from '../legal';
import { BuildProgress, toProgress } from '../services/brandbookServices/progress';
import { CURRENCY, PRODUCTS, startDelivery, syncWithYookassa } from '../services/orderService';
import { log } from '../logger';

const router = Router();

// ИП на УСН: НДС нет. payment_subject/payment_mode — цифровая услуга, оплачена целиком
const VAT_NONE = 1;

const getAppUrl = (): string =>
  (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Оплата денег не стоит только для нас: каждая попытка создаёт платёж в ЮKassa
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток оплаты. Повторите через несколько минут.' },
});

// Опрос статуса дёргает API ЮKassa, пока платёж не подтверждён. Запас
// рассчитан на страницу успеха с её опросом раз в три секунды.
const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Повторите позже.' },
});

// ЮKassa ждёт телефон цифрами в формате ITU-T E.164, без плюса и скобок
const normalizePhone = (raw: string): string | undefined => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return undefined;
  return digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
};

const productRedirect = (payment: Payment): string =>
  payment.productType === 'brandbook'
    ? `/pages/brandbook/${payment.orderId}`
    : '/pages/dashboard';

const publicPayment = (payment: Payment, build: BuildProgress | null = null) => ({
  orderId: payment.orderId,
  productType: payment.productType,
  status: payment.status,
  deliveryStatus: payment.deliveryStatus,
  amount: payment.amount,
  currency: payment.currency,
  description: payment.description,
  createdAt: payment.createdAt,
  paidAt: payment.paidAt,
  deliveredAt: payment.deliveredAt,
  redirectUrl: productRedirect(payment),
  // Нужен странице успеха, чтобы дать скачать сразу, не уводя в кабинет
  logoId: payment.productType === 'logo' ? payment.productData?.logoId ?? null : null,
  // Сборка брендбука идёт минутами, и покупатель должен видеть, на каком она шаге
  build,
});

// Ход сборки берём одним запросом по индексу и только для брендбуков:
// страницу успеха опрашивают раз в три секунды
const buildProgressFor = async (payment: Payment): Promise<BuildProgress | null> => {
  if (payment.productType !== 'brandbook' || !payment.userId) return null;

  const brandbook = await brandbooksRepo.findByOrderIdForUser(payment.orderId, payment.userId);
  return brandbook ? toProgress(brandbook) : null;
};

router.post('/yookassa/create-payment', requireAuth, paymentLimiter, async (req: any, res: any) => {
  const parsed = createPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const { productType, productData } = parsed.data;
  const userId = req.user.id;
  const product = PRODUCTS[productType];

  try {
    // Оплачивать можно только свой логотип. Раньше выдача создавала запись
    // по данным из запроса, то есть по чему угодно, что прислал клиент.
    const logo = await logosRepo.findByIdForUser(productData.logoId, userId);

    if (!logo) {
      return res.status(404).json({ error: 'Логотип не найден. Сгенерируйте его заново.' });
    }

    // Брендбук поверх оплаченного логотипа — нормально, второй раз тот же
    // логотип — нет: покупать нечего, он уже без водяного знака
    if (productType === 'logo' && logo.isPaid) {
      return res.status(409).json({ error: 'Этот логотип уже оплачен — он есть в личном кабинете.' });
    }

    // Стиль в записи авторитетнее присланного: именно им набран локап
    const brandStyle = logo.style || productData.brandStyle;
    const industry = logo.industry || productData.industry;

    if (!logo.name) {
      return res.status(409).json({ error: 'У логотипа не сохранилось название. Сгенерируйте его заново.' });
    }

    // Брендбук без ниши и стиля собрать нельзя — упадёт уже после списания денег
    if (productType === 'brandbook' && (!brandStyle || !industry)) {
      return res.status(400).json({ error: 'Для брендбука нужны ниша и стиль бренда' });
    }

    // Акцепт оферты — момент заключения договора, фиксируем в журнале
    const meta = clientMeta(req);
    await consentsRepo.record({
      userId,
      subject: productData.email,
      kind: 'offer',
      docVersion: LEGAL_VERSIONS.offer,
      source: 'payment',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const orderId = randomUUID();
    const description = trimDescription(`${product.title} «${logo.name}»`);

    // Строка заводится до обращения к ЮKassa: при сбое посередине останется
    // заказ, к которому можно привязать платёж, а не осиротевший платёж
    const local = await paymentsRepo.createPending({
      orderId,
      userId,
      productType,
      amount: product.price,
      currency: CURRENCY,
      // Всё, что попадёт в PDF и в письмо, берётся из записи логотипа, а не от клиента
      productData: {
        logoId: logo.id,
        logoUrl: logo.logoUrl,
        name: logo.name,
        keywords: logo.keywords || '',
        slogan: logo.demoSlogan || '',
        industry,
        brandStyle,
        email: productData.email,
        phone: productData.phone,
      },
      description,
    });

    let payment: YookassaPayment;

    try {
      payment = await yookassaService.createPayment({
        amount: product.price,
        currency: CURRENCY,
        description,
        // Адрес возврата строит сервер: с клиентским значением это открытый редирект
        returnUrl: `${getAppUrl()}/pages/payment/success?orderId=${orderId}`,
        // Тот же ключ на повторе вернёт тот же платёж, а не создаст второй
        idempotenceKey: orderId,
        metadata: { orderId, productType, userId },
        receiptEmail: productData.email,
        receiptPhone: normalizePhone(productData.phone),
        receiptItems: [
          {
            description,
            quantity: '1.00',
            amount: { value: product.price.toFixed(2), currency: CURRENCY },
            vat_code: VAT_NONE,
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      });
    } catch (error: any) {
      await paymentsRepo.markStatus(local.id, 'canceled');
      throw error;
    }

    await paymentsRepo.attachYookassaId(local.id, payment.id);

    return res.status(201).json({
      success: true,
      orderId,
      confirmationUrl: payment.confirmation!.confirmation_url,
    });
  } catch (error: any) {
    log.error('Не удалось создать платёж:', error.message);

    const status = error instanceof YookassaError ? 502 : 500;
    return res.status(status).json({
      error: 'Не удалось создать платёж. Попробуйте ещё раз или напишите в поддержку.',
    });
  }
});

// Страница успеха опрашивает этот маршрут: пользователь возвращается с формы
// ЮKassa раньше уведомления, а иногда уведомление и вовсе теряется.
router.get('/yookassa/payment/:orderId', requireAuth, statusLimiter, async (req: any, res: any) => {
  const parsed = orderIdSchema.safeParse(req.params.orderId);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Некорректный номер заказа' });
  }

  try {
    // Строго по текущему пользователю: иначе по чужому номеру заказа
    // можно прочитать чужие данные
    const local = await paymentsRepo.findByOrderId(parsed.data, req.user.id);

    if (!local) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const synced = await syncWithYookassa(local);

    // Выдача идёт минутами, ответ её не ждёт — клиент опрашивает статус
    startDelivery(synced);

    const build = await buildProgressFor(synced);

    return res.status(200).json({ success: true, payment: publicPayment(synced, build) });
  } catch (error: any) {
    log.error('Не удалось получить статус заказа:', error.message);
    return res.status(502).json({ error: 'Не удалось проверить статус платежа' });
  }
});

// Уведомления ЮKassa. Подписи у них нет: подлинность проверяется адресом
// отправителя, а данные всё равно перезапрашиваются через API.
// https://yookassa.ru/developers/using-api/webhooks
router.post('/yookassa/webhook', async (req: any, res: any) => {
  const ip = req.ip;

  if (!yookassaService.isNotificationIp(ip)) {
    log.warn(`Уведомление ЮKassa с постороннего адреса ${ip}`);
    return res.status(403).end();
  }

  const paymentId = req.body?.object?.id;
  const orderId = req.body?.object?.metadata?.orderId;

  if (req.body?.type !== 'notification' || typeof paymentId !== 'string') {
    // Повтор такого уведомления ничего не изменит, поэтому 200
    log.warn('Уведомление ЮKassa непонятного формата:', req.body?.type, req.body?.event);
    return res.status(200).end();
  }

  try {
    // Тело уведомления — только сигнал. Состояние берём из API.
    const local =
      (await paymentsRepo.findByYookassaId(paymentId)) ??
      (typeof orderId === 'string' ? await paymentsRepo.findByOrderId(orderId) : null);

    if (!local) {
      log.error(`Уведомление о неизвестном платеже ${paymentId} (заказ ${orderId})`);
      return res.status(200).end();
    }

    // Заказ мог не успеть получить id платежа при создании
    if (!local.yookassaPaymentId) {
      await paymentsRepo.attachYookassaId(local.id, paymentId);
    }

    const synced = await syncWithYookassa({ ...local, yookassaPaymentId: paymentId });

    startDelivery(synced);

    return res.status(200).end();
  } catch (error: any) {
    // Любой код кроме 200 заставит ЮKassa повторять уведомление сутки —
    // здесь это как раз то, что нужно: сбой на нашей стороне
    log.error('Ошибка обработки уведомления ЮKassa:', error.message);
    return res.status(500).end();
  }
});

export default router;
