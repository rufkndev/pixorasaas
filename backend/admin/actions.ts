// Ручные действия админа. Раньше всё это делалось SQL-запросами из docs/run.md

import { query, queryOne } from '../db/pool';
import { generationUsageRepo, paymentsRepo, usersRepo, blockedIpsRepo } from '../db/repositories';
import { startDelivery, syncWithYookassa, notifyBrandbookReady, PRODUCTS } from '../services/orderService';
import { yookassaService } from '../services/yookassaService';
import { ipLimitKey } from '../utils/ipRange';
import { isAdminEmail } from './access';
import { ActionError } from './types';

// Совпадает с окном устаревания выдачи: моложе — значит, её прямо сейчас кто-то ведёт
const BUSY_DELIVERY = `delivery_status = 'processing' AND delivery_started_at > now() - INTERVAL '20 minutes'`;

// Счётчик попыток обнуляется: ручной перезапуск — это новое решение, а не шестая попытка
export const retryDelivery = async (orderId: string, rebuild: boolean): Promise<string> => {
  const row = await queryOne(
    `UPDATE payments
        SET delivery_attempts = 0, delivery_status = 'pending', delivery_error = NULL
      WHERE order_id = $1 AND status = 'succeeded' AND NOT (${BUSY_DELIVERY})
      RETURNING product_type`,
    [orderId]
  );

  if (!row) throw new ActionError('Заказ сейчас выдаётся или не оплачен — подождите пару минут');

  // Без сброса build_started_at сборка взялась бы только через 20 минут
  if (row.product_type === 'brandbook') {
    await query(
      `UPDATE brandbooks SET build_started_at = NULL ${rebuild ? `, status = 'failed'` : ''}
        WHERE order_id = $1 ${rebuild ? '' : `AND status <> 'completed'`}`,
      [orderId]
    );
  }

  const payment = await paymentsRepo.findByOrderId(orderId);
  if (payment) startDelivery(payment);

  return rebuild ? 'Брендбук поставлен на пересборку' : 'Выдача запущена заново';
};

export const syncPayment = async (orderId: string): Promise<string> => {
  const payment = await paymentsRepo.findByOrderId(orderId);
  if (!payment) throw new ActionError('Заказ не найден');

  const synced = await syncWithYookassa(payment);
  startDelivery(synced);
  return `Статус в ЮKassa: ${synced.status}`;
};

export const resendBrandbookEmail = async (orderId: string): Promise<string> => {
  const brandbook = await queryOne(
    `SELECT b.id, b.business_name, b.status, p.product_data->>'email' AS email
       FROM brandbooks b JOIN payments p ON p.order_id::text = b.order_id
      WHERE b.order_id = $1`,
    [orderId]
  );

  if (!brandbook) throw new ActionError('Брендбук не найден');
  if (brandbook.status !== 'completed') throw new ActionError('Брендбук ещё не собран');
  if (!brandbook.email) throw new ActionError('В заказе нет почты покупателя');

  await notifyBrandbookReady(Number(brandbook.id), orderId, brandbook.business_name, brandbook.email);
  return 'Письмо отправлено повторно';
};

// Возврат полной суммы. Доступ к файлам закрывается, если на тот же логотип
// нет другого оплаченного заказа: брендбук включает логотип
export const refundOrder = async (orderId: string, revoke: boolean, reason: string): Promise<string> => {
  const payment = await paymentsRepo.findByOrderId(orderId);
  if (!payment) throw new ActionError('Заказ не найден');
  if (payment.status !== 'succeeded') throw new ActionError('Заказ не оплачен');
  if (!payment.yookassaPaymentId) throw new ActionError('У заказа нет платежа в ЮKassa');

  const already = await queryOne('SELECT refunded_amount FROM payments WHERE order_id = $1', [orderId]);
  if (Number(already?.refunded_amount) > 0) throw new ActionError('Возврат уже сделан');

  const email = payment.productData?.email;
  if (!email) throw new ActionError('В заказе нет почты для чека возврата (аккаунт удалён?)');

  const description = payment.description || PRODUCTS[payment.productType].title;
  const refund = await yookassaService.createRefund({
    paymentId: payment.yookassaPaymentId,
    amount: payment.amount,
    currency: payment.currency,
    description: reason || `Возврат: ${description}`,
    idempotenceKey: `refund-${orderId}`,
    receiptEmail: email,
    receiptItems: [
      {
        description,
        quantity: '1.00',
        amount: { value: payment.amount.toFixed(2), currency: payment.currency },
        vat_code: 1,
        payment_subject: 'service',
        payment_mode: 'full_payment',
      },
    ],
  });

  await query('UPDATE payments SET refunded_amount = amount, refunded_at = now() WHERE order_id = $1', [orderId]);

  if (revoke) {
    if (payment.productType === 'brandbook') {
      await query(`UPDATE brandbooks SET payment_status = 'refunded' WHERE order_id = $1`, [orderId]);
    }
    const logoId = Number(payment.productData?.logoId);
    if (logoId) {
      await query(
        `UPDATE generated_logos SET is_paid = false
          WHERE id = $1
            AND NOT EXISTS (
              SELECT 1 FROM payments p
               WHERE p.status = 'succeeded' AND p.refunded_amount = 0
                 AND p.order_id <> $2 AND p.product_data->>'logoId' = $1::text)`,
        [logoId, orderId]
      );
    }
  }

  return `Возврат ${refund.id} создан, статус ${refund.status}${revoke ? '. Доступ к файлам закрыт' : ''}`;
};

const ensureNotAdmin = async (userId: string): Promise<void> => {
  const user = await usersRepo.findById(userId);
  if (user && isAdminEmail(user.email)) throw new ActionError('Это аккаунт админа');
};

export const blockUser = async (userId: string): Promise<string> => {
  await ensureNotAdmin(userId);
  await query('UPDATE users SET blocked_at = now(), updated_at = now() WHERE id = $1', [userId]);
  // Сессии удаляем сразу: access-токен проверяется по таблице sessions
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  return 'Пользователь заблокирован, все сессии завершены';
};

export const unblockUser = async (userId: string): Promise<string> => {
  await query('UPDATE users SET blocked_at = NULL, updated_at = now() WHERE id = $1', [userId]);
  return 'Пользователь разблокирован';
};

export const revokeSessions = async (userId: string): Promise<string> => {
  const rows = await query('DELETE FROM sessions WHERE user_id = $1 RETURNING id', [userId]);
  return `Завершено сессий: ${rows.length}`;
};

export const verifyEmail = async (userId: string): Promise<string> => {
  await usersRepo.markEmailVerified(userId);
  return 'Почта отмечена подтверждённой';
};

export const resetQuota = async (userId: string): Promise<string> => {
  await generationUsageRepo.reset(userId);
  return 'Квота сброшена, окно началось заново';
};

export const grantQuota = async (userId: string, names: number, logos: number): Promise<string> => {
  if (!Number.isInteger(names) || !Number.isInteger(logos) || names < 0 || logos < 0 || names + logos === 0) {
    throw new ActionError('Укажите целое число генераций');
  }
  if (names > 100 || logos > 100) throw new ActionError('Не больше 100 за раз');
  await generationUsageRepo.grant(userId, names, logos);
  return `Подарено: названий ${names}, логотипов ${logos} (до конца текущего окна)`;
};

export const blockIp = async (rawIp: string, reason: string | null, by: string): Promise<string> => {
  const value = rawIp.trim();
  // Готовый ключ (подсеть /64) принимаем как есть, адрес приводим к ключу
  const key = value.includes('/') ? value : ipLimitKey(value);
  if (!key || key.startsWith('raw:') || key.length > 60) throw new ActionError('Не похоже на IP-адрес');
  await blockedIpsRepo.add(key, reason, by);
  return `Адрес ${key} заблокирован для регистрации и бесплатных генераций`;
};
