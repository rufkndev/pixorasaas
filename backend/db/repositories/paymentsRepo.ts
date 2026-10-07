import { query, queryOne } from '../pool';
import { Payment, ProductType } from '../types';

// Процесс мог умереть посреди сборки брендбука. После этого срока заказ
// снова считается свободным, иначе он навсегда завис бы в processing.
const STALE_DELIVERY = '20 minutes';

// Потолок попыток и пауза между ними. Без паузы упавшую выдачу повторял каждый
// опрос страницы успеха — раз в три секунды, и каждый повтор стоил вызовов GenAPI
export const MAX_DELIVERY_ATTEMPTS = 5;
const RETRY_PAUSE = '2 minutes';

// Заказ можно взять в выдачу. Одно условие на захват и на поиск досборщиком,
// чтобы досборщик не находил заказы, которые потом не сможет захватить
const CLAIMABLE = `
  status = 'succeeded'
  AND delivery_attempts < ${MAX_DELIVERY_ATTEMPTS}
  AND (
    delivery_status = 'pending'
    OR (delivery_status = 'failed'
        AND delivery_started_at < now() - INTERVAL '${RETRY_PAUSE}')
    OR (delivery_status = 'processing'
        AND delivery_started_at < now() - INTERVAL '${STALE_DELIVERY}')
  )`;

const toPayment = (row: any): Payment => ({
  id: Number(row.id),
  orderId: row.order_id,
  yookassaPaymentId: row.yookassa_payment_id,
  userId: row.user_id,
  productType: row.product_type,
  // NUMERIC приходит строкой, чтобы не терять точность
  amount: Number(row.amount),
  currency: row.currency,
  status: row.status,
  deliveryStatus: row.delivery_status,
  deliveryError: row.delivery_error,
  deliveryAttempts: Number(row.delivery_attempts ?? 0),
  productData: row.product_data ?? {},
  description: row.description,
  createdAt: row.created_at,
  paidAt: row.paid_at,
  deliveredAt: row.delivered_at,
});

export const paymentsRepo = {
  // Строка появляется до обращения к ЮKassa: иначе при сбое между созданием
  // платежа и вставкой оставался бы платёж, который некому сопоставить.
  async createPending(input: {
    orderId: string;
    userId: string;
    productType: ProductType;
    amount: number;
    currency: string;
    productData: Record<string, any>;
    description: string;
  }): Promise<Payment> {
    const rows = await query(
      `INSERT INTO payments
         (order_id, user_id, product_type, amount, currency,
          status, product_data, description)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb, $7)
       RETURNING *`,
      [
        input.orderId,
        input.userId,
        input.productType,
        input.amount,
        input.currency,
        JSON.stringify(input.productData),
        input.description,
      ]
    );
    return toPayment(rows[0]);
  },

  async attachYookassaId(id: number, yookassaPaymentId: string): Promise<void> {
    await query('UPDATE payments SET yookassa_payment_id = $2 WHERE id = $1', [
      id,
      yookassaPaymentId,
    ]);
  },

  async findByOrderId(orderId: string, userId?: string | null): Promise<Payment | null> {
    const row = userId
      ? await queryOne('SELECT * FROM payments WHERE order_id = $1 AND user_id = $2', [
          orderId,
          userId,
        ])
      : await queryOne('SELECT * FROM payments WHERE order_id = $1', [orderId]);

    return row ? toPayment(row) : null;
  },

  // Лимит генераций на адрес рассчитан на фарм и не должен упираться в клиента
  async hasSucceededForUser(userId: string): Promise<boolean> {
    const row = await queryOne(
      `SELECT 1 FROM payments WHERE user_id = $1 AND status = 'succeeded' LIMIT 1`,
      [userId]
    );
    return Boolean(row);
  },

  async findByYookassaId(yookassaPaymentId: string): Promise<Payment | null> {
    const row = await queryOne('SELECT * FROM payments WHERE yookassa_payment_id = $1', [
      yookassaPaymentId,
    ]);
    return row ? toPayment(row) : null;
  },

  // paid_at ставится один раз: повторный вебхук не должен сдвигать дату оплаты
  async markSucceeded(id: number): Promise<Payment | null> {
    const rows = await query(
      `UPDATE payments
          SET status = 'succeeded', paid_at = COALESCE(paid_at, now())
        WHERE id = $1
        RETURNING *`,
      [id]
    );
    return rows.length > 0 ? toPayment(rows[0]) : null;
  },

  async markStatus(id: number, status: string): Promise<void> {
    await query(`UPDATE payments SET status = $2 WHERE id = $1 AND status <> 'succeeded'`, [
      id,
      status,
    ]);
  },

  // Единственная защита от двойной выдачи. Заявку получает ровно один
  // вызывающий: вебхук, опрос со страницы успеха и досборщик идут через неё.
  // Упавшую выдачу пробуем снова после паузы, зависшую — после STALE_DELIVERY.
  async claimDelivery(id: number): Promise<Payment | null> {
    const rows = await query(
      `UPDATE payments
          SET delivery_status = 'processing',
              delivery_started_at = now(),
              delivery_attempts = delivery_attempts + 1,
              delivery_error = NULL
        WHERE id = $1 AND ${CLAIMABLE}
        RETURNING *`,
      [id]
    );
    return rows.length > 0 ? toPayment(rows[0]) : null;
  },

  async listForRedelivery(limit: number = 20): Promise<Payment[]> {
    const rows = await query(
      `SELECT * FROM payments WHERE ${CLAIMABLE} ORDER BY paid_at LIMIT $1`,
      [limit]
    );
    return rows.map(toPayment);
  },

  // Платежи, по которым могло потеряться уведомление, по возрасту в минутах.
  // Самые свежие не берём: уведомление о них обычно ещё в пути
  async listPendingToSync(minAgeMinutes: number, maxAgeMinutes: number, limit = 100): Promise<Payment[]> {
    const rows = await query(
      `SELECT * FROM payments
        WHERE status IN ('pending', 'waiting_for_capture')
          AND yookassa_payment_id IS NOT NULL
          AND created_at < now() - make_interval(mins => $1)
          AND created_at > now() - make_interval(mins => $2)
        ORDER BY created_at
        LIMIT $3`,
      [minAgeMinutes, maxAgeMinutes, limit]
    );
    return rows.map(toPayment);
  },

  async finishDelivery(id: number): Promise<void> {
    await query(
      `UPDATE payments
          SET delivery_status = 'completed', delivered_at = now(), delivery_error = NULL
        WHERE id = $1`,
      [id]
    );
  },

  async failDelivery(id: number, error: string): Promise<void> {
    await query(
      `UPDATE payments SET delivery_status = 'failed', delivery_error = $2 WHERE id = $1`,
      [id, error.slice(0, 500)]
    );
  },
};
