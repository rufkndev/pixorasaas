// Оплата по сценарию «Умный платёж»: мы создаём платёж, уводим пользователя на
// форму ЮKassa и ждём уведомления. Способ оплаты выбирает он сам, поэтому
// никаких payment_method_data мы не передаём.

import { Router } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';

import {
  YookassaError,
  YookassaPayment,
  trimDescription,
  yookassaService,
} from '../services/yookassaService';
import {
  brandbooksRepo,
  consentsRepo,
  generationUsageRepo,
  logosRepo,
  paymentsRepo,
} from '../db/repositories';
import { Payment } from '../db/types';
import { requireAuth } from '../auth/middleware';
import { createPaymentSchema, firstError, orderIdSchema } from '../auth/schemas';
import { clientMeta } from '../auth/service';
import { LEGAL_VERSIONS } from '../legal';
import { buildBrandbook } from '../services/brandbookServices/brandbookBuilder';
import { BuildProgress, toProgress } from '../services/brandbookServices/progress';
import { logoService } from '../services/logoService';
import { mailService } from '../services/mailService';
import { brandbookReadyTemplate } from '../emails/brandbookReady';

const router = Router();

// Цены только на сервере: клиент их не присылает и повлиять на них не может.
// При изменении поправьте app/lib/legal.ts — там те же цифры для витрины.
const PRODUCTS = {
  logo: { price: 299, title: 'Логотип без водяного знака' },
  brandbook: { price: 499, title: 'Брендбук' },
} as const;

const CURRENCY = 'RUB';

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
    const logo = await logosRepo.findLatestByUrl(userId, productData.logoUrl);

    if (!logo) {
      return res.status(404).json({ error: 'Логотип не найден. Сгенерируйте его заново.' });
    }

    // Брендбук поверх оплаченного логотипа — нормально, второй раз тот же
    // логотип — нет: покупать нечего, он уже без водяного знака
    if (productType === 'logo' && logo.isPaid) {
      return res.status(409).json({ error: 'Этот логотип уже оплачен — он есть в личном кабинете.' });
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
    const description = trimDescription(`${product.title} «${productData.name}»`);

    // Строка заводится до обращения к ЮKassa: при сбое посередине останется
    // заказ, к которому можно привязать платёж, а не осиротевший платёж
    const local = await paymentsRepo.createPending({
      orderId,
      userId,
      productType,
      amount: product.price,
      currency: CURRENCY,
      productData: { ...productData, logoId: logo.id },
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
    console.error('Не удалось создать платёж:', error.message);

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
    console.error('Не удалось получить статус заказа:', error.message);
    return res.status(502).json({ error: 'Не удалось проверить статус платежа' });
  }
});

// Уведомления ЮKassa. Подписи у них нет: подлинность проверяется адресом
// отправителя, а данные всё равно перезапрашиваются через API.
// https://yookassa.ru/developers/using-api/webhooks
router.post('/yookassa/webhook', async (req: any, res: any) => {
  const ip = req.ip;

  if (!yookassaService.isNotificationIp(ip)) {
    console.warn(`Уведомление ЮKassa с постороннего адреса ${ip}`);
    return res.status(403).end();
  }

  const paymentId = req.body?.object?.id;
  const orderId = req.body?.object?.metadata?.orderId;

  if (req.body?.type !== 'notification' || typeof paymentId !== 'string') {
    // Повтор такого уведомления ничего не изменит, поэтому 200
    console.warn('Уведомление ЮKassa непонятного формата:', req.body?.type, req.body?.event);
    return res.status(200).end();
  }

  try {
    // Тело уведомления — только сигнал. Состояние берём из API.
    const local =
      (await paymentsRepo.findByYookassaId(paymentId)) ??
      (typeof orderId === 'string' ? await paymentsRepo.findByOrderId(orderId) : null);

    if (!local) {
      console.error(`Уведомление о неизвестном платеже ${paymentId} (заказ ${orderId})`);
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
    console.error('Ошибка обработки уведомления ЮKassa:', error.message);
    return res.status(500).end();
  }
});

// Приводит локальный статус к тому, что говорит API ЮKassa
async function syncWithYookassa(local: Payment): Promise<Payment> {
  if (!local.yookassaPaymentId || local.status === 'succeeded') return local;

  const remote = await yookassaService.getPayment(local.yookassaPaymentId);

  if (remote.status !== 'succeeded') {
    await paymentsRepo.markStatus(local.id, remote.status);
    return { ...local, status: remote.status };
  }

  // Сумма из ответа сверяется с ценой заказа: расхождение означает, что
  // платёж не наш или его подменили, товар по нему выдавать нельзя
  const expected = PRODUCTS[local.productType].price;

  if (Number(remote.amount.value) !== expected || remote.amount.currency !== local.currency) {
    console.error(
      `Платёж ${remote.id}: сумма ${remote.amount.value} ${remote.amount.currency}` +
        ` вместо ${expected} ${local.currency}. Выдача остановлена.`
    );
    return local;
  }

  return (await paymentsRepo.markSucceeded(local.id)) ?? local;
}

// Выдача не должна задерживать ответ: вебхуку ЮKassa нужен быстрый 200,
// а сборка брендбука занимает минуты. Ошибку внутри пишет сам deliverOrder.
function startDelivery(payment: Payment): void {
  if (payment.status !== 'succeeded' || payment.deliveryStatus === 'completed') return;

  deliverOrder(payment).catch((error: any) => {
    console.error(`Выдача заказа ${payment.orderId} сорвалась:`, error.message);
  });
}

// Заявку на выдачу получает ровно один вызывающий — и вебхук, и опрос со
// страницы успеха идут сюда. Гарантию даёт claimDelivery.
async function deliverOrder(payment: Payment): Promise<void> {
  const claimed = await paymentsRepo.claimDelivery(payment.id);

  if (!claimed) return;

  try {
    // Оплата возвращает бесплатные генерации. Сбой счётчиков не должен
    // мешать выдаче оплаченного заказа
    if (claimed.userId) {
      try {
        await generationUsageRepo.reset(claimed.userId);
      } catch (error: any) {
        console.error('Не удалось сбросить счётчик генераций:', error.message);
      }
    }

    if (claimed.productType === 'brandbook') {
      await deliverBrandbook(claimed);
    } else {
      await deliverLogo(claimed);
    }

    await paymentsRepo.finishDelivery(claimed.id);
    console.log(`Заказ ${claimed.orderId} (${claimed.productType}) выдан`);
  } catch (error: any) {
    // Заказ остаётся оплаченным и переходит в failed: следующий опрос
    // со страницы успеха или повтор уведомления попробует снова
    console.error(`Не удалось выдать заказ ${claimed.orderId}:`, error.message);
    await paymentsRepo.failDelivery(claimed.id, error.message);
  }
}

async function deliverLogo(payment: Payment): Promise<void> {
  const { logoId, logoUrl, email, phone } = payment.productData;
  const userId = payment.userId;

  if (!userId) {
    throw new Error('Заказ без пользователя: аккаунт удалён');
  }

  // logoId проверен при создании платежа, поиск по URL — запасной путь
  const logo =
    (logoId ? await logosRepo.findByIdForUser(logoId, userId) : null) ??
    (await logosRepo.findLatestByUrl(userId, logoUrl));

  if (!logo) {
    throw new Error(`Логотип заказа ${payment.orderId} не найден`);
  }

  await logosRepo.markPaid(logo.id, {
    orderId: payment.orderId,
    paymentId: payment.yookassaPaymentId,
    email,
    phone: phone || null,
  });

  await buildVector(logo.id, logo.originalLogoUrl);
}

// Вектор стоит денег за каждую обводку, поэтому строится только здесь —
// после оплаты, а не на каждое бесплатное превью. Сбой векторизации не повод
// не отдать оплаченный заказ: растр у покупателя уже есть
async function buildVector(logoId: number, sourceUrl: string | null): Promise<string | null> {
  if (!sourceUrl) return null;

  try {
    const svgUrl = await logoService.vectorize(sourceUrl);
    if (svgUrl) {
      await logosRepo.setSvgUrl(logoId, svgUrl);
    }
    return svgUrl;
  } catch (error: any) {
    console.error('Не удалось векторизовать логотип:', error.message);
    return null;
  }
}

async function deliverBrandbook(payment: Payment): Promise<void> {
  const { name, keywords, logoUrl, slogan, industry, brandStyle } = payment.productData;
  const userId = payment.userId;
  const orderId = payment.orderId;

  if (!userId) {
    throw new Error('Заказ без пользователя: аккаунт удалён');
  }

  // Оплата прошла, поэтому брендбук строится на чистом логотипе, а не на превью.
  // Вектор строим до releaseSource, чтобы открытая копия легла рядом с растром
  const paidLogo = await logosRepo.findLatestByUrl(userId, logoUrl);

  if (paidLogo) {
    await buildVector(paidLogo.id, paidLogo.originalLogoUrl);
  }

  const sourceLogoUrl = logoService.releaseSource(paidLogo?.originalLogoUrl || logoUrl);

  // Стиль из записи логотипа авторитетнее данных заказа: именно им набран локап
  const style = paidLogo?.style || brandStyle;

  // Строка заводится до сборки, иначе оплативший минуты видит «Брендбук не найден».
  // ON CONFLICT делает UNIQUE по order_id примитивом синхронизации, а не аварией.
  const row = await brandbooksRepo.ensure({
    userId,
    orderId,
    businessName: name,
    keywords,
    slogan: slogan || '',
    originalLogoUrl: sourceLogoUrl,
    status: 'processing',
    paymentStatus: 'completed',
    isDemo: false,
    style,
    industry,
  });

  // Готовый брендбук не пересобираем — это замена прежней проверки findByOrderId,
  // которая теперь всегда находила бы строку
  if (row.status === 'completed') {
    console.warn(`Брендбук заказа ${orderId} уже собран`);
    return;
  }

  // Сборку ведёт ровно один вызывающий, остальные выходят молча
  const claimed = await brandbooksRepo.claimBuild(row.id);

  if (!claimed) {
    console.warn(`Брендбук заказа ${orderId} уже собирается`);
    return;
  }

  await buildBrandbook({
    brandbookId: row.id,
    orderId,
    name,
    keywords,
    industry,
    style,
    logoUrl: sourceLogoUrl,
    slogan: slogan || '',
    logo: paidLogo,
  });

  // Брендбук включает логотип, значит он тоже оплачен
  await logosRepo.markPaidByUrl(userId, logoUrl, {
    orderId,
    paymentId: payment.yookassaPaymentId,
  });

  await notifyBrandbookReady(row.id, orderId, name, payment.productData.email);
}

// Сборка идёт минутами, и покупатель обычно уходит со страницы успеха.
// Сбой почты не повод считать заказ невыданным — товар уже в кабинете.
async function notifyBrandbookReady(
  brandbookId: number,
  orderId: string,
  businessName: string,
  email: string | undefined
): Promise<void> {
  if (!email) return;

  const sent = await mailService.sendQuietly({
    to: email,
    ...brandbookReadyTemplate({ businessName, orderId }),
  });

  if (sent) await brandbooksRepo.markEmailSent(brandbookId);
}

export default router;
