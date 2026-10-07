import { query, queryOne } from '../pool';

// Сутки считаются по Москве: сброс в полночь UTC пришёлся бы на три часа ночи
const TODAY = `(now() AT TIME ZONE 'Europe/Moscow')::date`;

export type IpGenerationKind = 'names' | 'logos';

export const ipUsageRepo = {
  // Проверка и списание одним запросом, как у квоты аккаунта: раздельные шаги
  // пропустили бы параллельные запросы сверх лимита. null — лимит исчерпан.
  async consume(ipKey: string, kind: IpGenerationKind, limit: number): Promise<number | null> {
    const row = await queryOne<{ used: number }>(
      `INSERT INTO ip_generation_usage AS u (ip_key, kind, day, used)
       VALUES ($1, $2, ${TODAY}, 1)
       ON CONFLICT (ip_key, kind, day) DO UPDATE
          SET used = u.used + 1, updated_at = now()
        WHERE u.used < $3
       RETURNING used`,
      [ipKey, kind, limit]
    );

    return row ? Math.max(limit - row.used, 0) : null;
  },

  // Счётчики нужны только на текущие сутки, неделя — запас для разбора фарма
  async deleteOld(): Promise<void> {
    await query(`DELETE FROM ip_generation_usage WHERE day < ${TODAY} - 7`);
  },

  async release(ipKey: string, kind: IpGenerationKind): Promise<void> {
    await query(
      `UPDATE ip_generation_usage
          SET used = GREATEST(used - 1, 0), updated_at = now()
        WHERE ip_key = $1 AND kind = $2 AND day = ${TODAY}`,
      [ipKey, kind]
    );
  },
};

export const spendRepo = {
  async todayTotal(kinds: readonly string[]): Promise<number> {
    const row = await queryOne<{ total: string | null }>(
      `SELECT SUM(amount) AS total FROM genapi_spend WHERE day = ${TODAY} AND kind = ANY($1)`,
      [kinds]
    );
    return Number(row?.total ?? 0);
  },

  async add(kind: string, amount: number): Promise<void> {
    await query(
      `INSERT INTO genapi_spend AS s (day, kind, amount, calls)
       VALUES (${TODAY}, $1, $2, 1)
       ON CONFLICT (day, kind) DO UPDATE
          SET amount = s.amount + EXCLUDED.amount, calls = s.calls + 1, updated_at = now()`,
      [kind, amount]
    );
  },
};
