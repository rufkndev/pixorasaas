import { AsyncLocalStorage } from 'async_hooks';
import { query } from '../db/pool';
import { MODEL_COST_RUB } from '../limits';

// Номер заказа, внутри выдачи которого идут вызовы. Через контекст, а не
// параметром: вызовы GenAPI сидят глубоко в сервисах брендбука
const orderContext = new AsyncLocalStorage<{ orderId: string }>();

export const withOrderContext = <T>(orderId: string, fn: () => Promise<T>): Promise<T> =>
  orderContext.run({ orderId }, fn);

export const estimateCost = (model: string): number => MODEL_COST_RUB[model] ?? 0;

// Сбой записи метрики не должен ронять генерацию, поэтому ошибки глотаем
export const recordGenapiCall = async (input: {
  model: string;
  label: string;
  ok: boolean;
  durationMs: number;
  error?: string;
}): Promise<void> => {
  try {
    await query(
      `INSERT INTO genapi_calls (model, label, ok, duration_ms, est_cost, order_id, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.model,
        input.label,
        input.ok,
        Math.round(input.durationMs),
        // Упавшая задача тоже могла списать деньги, но чаще нет — считаем ноль
        input.ok ? estimateCost(input.model) : 0,
        orderContext.getStore()?.orderId ?? null,
        input.error ? input.error.slice(0, 300) : null,
      ]
    );
  } catch {
    // Учёт вторичен по отношению к самой генерации
  }
};
