// Жизненный цикл заказа после оплаты: сверка с ЮKassa и выдача товара. Вызывают
// роуты оплаты и фоновый досборщик — поэтому логика здесь, а не в роуте.

import {
  brandbooksRepo,
  generationUsageRepo,
  logosRepo,
  MAX_DELIVERY_ATTEMPTS,
  paymentsRepo,
} from '../db/repositories';
import { Payment } from '../db/types';
import { YookassaPayment, yookassaService } from './yookassaService';
import { buildBrandbook } from './brandbookServices/brandbookBuilder';
import { logoService } from './logoService';
import { mailService } from './mailService';
import { alertService } from './alertService';
import { brandbookReadyTemplate } from '../emails/brandbookReady';
import { log } from '../logger';

// Цены только на сервере: клиент их не присылает и повлиять на них не может.
// При изменении поправьте app/lib/legal.ts — там те же цифры для витрины.
export const PRODUCTS = {
  logo: { price: 299, title: 'Логотип без водяного знака' },
  brandbook: { price: 499, title: 'Брендбук' },
} as const;

export const CURRENCY = 'RUB';

// Идущие выдачи. При остановке процесса их дожидаемся, чтобы не бросать
// брендбук на середине: иначе заказ висел бы до окна устаревания
const active = new Set<Promise<void>>();
let draining = false;

export const stopAcceptingDeliveries = (): void => {
  draining = true;
};

// true — все выдачи закончились, false — вышло время
export const waitForActiveDeliveries = async (timeoutMs: number): Promise<boolean> => {
  if (active.size === 0) return true;

  const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const done = Promise.allSettled([...active]).then(() => true as const);
  return Promise.race([done, timeout]);
};

// Досборщик: заказы, по которым уведомление потерялось, а покупатель ушёл со
// страницы успеха. Без него такой платёж навсегда оставался бы в pending
export const syncPendingPayments = async (minAgeMinutes: number, maxAgeMinutes: number): Promise<number> => {
  const pending = await paymentsRepo.listPendingToSync(minAgeMinutes, maxAgeMinutes);

  for (const payment of pending) {
    try {
      startDelivery(await syncWithYookassa(payment));
    } catch (error: any) {
      log.error(`Не удалось сверить заказ ${payment.orderId}:`, error.message);
    }
  }
  return pending.length;
};

// Оплаченные, но не выданные: упавшие, брошенные при перезапуске, не начатые
export const redeliverStuckOrders = async (): Promise<number> => {
  const stuck = await paymentsRepo.listForRedelivery();
  stuck.forEach(startDelivery);
  return stuck.length;
};

// Платёж от ЮKassa должен быть ровно за этот заказ: та же сумма, та же валюта
// и тот же номер в метаданных. Иначе платёж не наш или привязан не к тому
// заказу — например, id подсунули в уведомлении о заказе, у которого своего id ещё нет
export const paymentMismatch = (local: Payment, remote: YookassaPayment): string | null => {
  const expected = PRODUCTS[local.productType].price;

  if (!remote.paid) return 'ЮKassa вернула succeeded, но paid = false';
  if (Number(remote.amount.value) !== expected || remote.amount.currency !== local.currency) {
    return `сумма ${remote.amount.value} ${remote.amount.currency} вместо ${expected} ${local.currency}`;
  }
  if (remote.metadata?.orderId !== local.orderId) {
    return `в метаданных платежа заказ ${remote.metadata?.orderId ?? 'не указан'}`;
  }
  return null;
};

// Приводит локальный статус к тому, что говорит API ЮKassa
export async function syncWithYookassa(local: Payment): Promise<Payment> {
  if (!local.yookassaPaymentId || local.status === 'succeeded') return local;

  const remote = await yookassaService.getPayment(local.yookassaPaymentId);

  if (remote.status !== 'succeeded') {
    await paymentsRepo.markStatus(local.id, remote.status);
    return { ...local, status: remote.status };
  }

  const problem = paymentMismatch(local, remote);

  if (problem) {
    await alertService.notify(
      `mismatch:${local.orderId}`,
      'Платёж не сошёлся с заказом, выдача остановлена',
      `Заказ ${local.orderId}, платёж ${remote.id}: ${problem}.\nРазберите вручную в кабинете ЮKassa.`
    );
    return local;
  }

  return (await paymentsRepo.markSucceeded(local.id)) ?? local;
}

// Выдача не должна задерживать ответ: вебхуку ЮKassa нужен быстрый 200,
// а сборка брендбука занимает минуты. Ошибку внутри пишет сам deliverOrder.
export function startDelivery(payment: Payment): void {
  if (draining || payment.status !== 'succeeded' || payment.deliveryStatus === 'completed') return;

  const running = deliverOrder(payment)
    .catch((error: any) => {
      log.error(`Выдача заказа ${payment.orderId} сорвалась:`, error.message);
    })
    .finally(() => active.delete(running));

  active.add(running);
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
        log.error('Не удалось сбросить счётчик генераций:', error.message);
      }
    }

    if (claimed.productType === 'brandbook') {
      await deliverBrandbook(claimed);
    } else {
      await deliverLogo(claimed);
    }

    await paymentsRepo.finishDelivery(claimed.id);
    log.info(`Заказ ${claimed.orderId} (${claimed.productType}) выдан`);
  } catch (error: any) {
    // Заказ остаётся оплаченным и переходит в failed: его повторит досборщик,
    // опрос со страницы успеха или повтор уведомления — но не чаще паузы в claimDelivery
    log.error(`Не удалось выдать заказ ${claimed.orderId}:`, error.message);
    await paymentsRepo.failDelivery(claimed.id, error.message);

    const exhausted = claimed.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS;
    await alertService.notify(
      `delivery:${claimed.orderId}`,
      exhausted
        ? 'Оплаченный заказ не выдан, автоповторы исчерпаны'
        : 'Оплаченный заказ не выдался, будет повтор',
      `Заказ ${claimed.orderId} (${claimed.productType}), попытка ${claimed.deliveryAttempts} ` +
        `из ${MAX_DELIVERY_ATTEMPTS}.\nОшибка: ${error.message}` +
        (exhausted ? '\nНужен ручной разбор: как перезапустить выдачу — в docs/run.md.' : '')
    );
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
    log.error('Не удалось векторизовать логотип:', error.message);
    return null;
  }
}

async function deliverBrandbook(payment: Payment): Promise<void> {
  const { logoId, name, keywords, logoUrl, slogan, industry, brandStyle } = payment.productData;
  const userId = payment.userId;
  const orderId = payment.orderId;

  if (!userId) {
    throw new Error('Заказ без пользователя: аккаунт удалён');
  }

  // Оплата прошла, поэтому брендбук строится на чистом логотипе, а не на превью.
  // Вектор строим до releaseSource, чтобы открытая копия легла рядом с растром
  const paidLogo =
    (logoId ? await logosRepo.findByIdForUser(logoId, userId) : null) ??
    (await logosRepo.findLatestByUrl(userId, logoUrl));

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
    log.warn(`Брендбук заказа ${orderId} уже собран`);
    return;
  }

  // Сборку ведёт ровно один вызывающий, остальные выходят молча
  const claimed = await brandbooksRepo.claimBuild(row.id);

  if (!claimed) {
    log.warn(`Брендбук заказа ${orderId} уже собирается`);
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
