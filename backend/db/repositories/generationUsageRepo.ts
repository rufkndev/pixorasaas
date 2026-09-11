import { query, queryOne } from '../pool';

export const FREE_GENERATIONS = 5;
// Квота не разовая, а возобновляемая: через столько дней после начала окна
// счётчики обнуляются сами
export const QUOTA_WINDOW_DAYS = 14;

export type GenerationKind = 'names' | 'logos';

// Имя колонки подставляется в SQL, поэтому берётся только отсюда
const COLUMN: Record<GenerationKind, string> = {
  names: 'names_used',
  logos: 'logos_used',
};

export type GenerationUsage = {
  namesUsed: number;
  logosUsed: number;
  // Когда квота обновится. null — окно ещё не начиналось
  renewsAt: Date | null;
};

const WINDOW = `${QUOTA_WINDOW_DAYS} days`;

// Окно истекло — счётчики считаются нулевыми, даже если в базе лежат старые
const EXPIRED = `(u.reset_at IS NULL OR u.reset_at <= now() - INTERVAL '${WINDOW}')`;

export const generationUsageRepo = {
  async getUsage(userId: string): Promise<GenerationUsage> {
    const row = await queryOne<{ names_used: number; logos_used: number; renews_at: Date | null }>(
      `SELECT
         CASE WHEN ${EXPIRED} THEN 0 ELSE u.names_used END AS names_used,
         CASE WHEN ${EXPIRED} THEN 0 ELSE u.logos_used END AS logos_used,
         CASE WHEN ${EXPIRED} THEN NULL ELSE u.reset_at + INTERVAL '${WINDOW}' END AS renews_at
       FROM user_generation_usage u
       WHERE u.user_id = $1`,
      [userId]
    );

    return {
      namesUsed: row ? Number(row.names_used) : 0,
      logosUsed: row ? Number(row.logos_used) : 0,
      renewsAt: row?.renews_at ?? null,
    };
  },

  // Проверка, обновление окна и списание — один запрос. Раздельные шаги
  // позволили бы двум одновременным запросам пройти сверх лимита.
  // null — лимит исчерпан.
  async consume(userId: string, kind: GenerationKind): Promise<number | null> {
    const column = COLUMN[kind];
    const other = COLUMN[kind === 'names' ? 'logos' : 'names'];

    const row = await queryOne<{ used: number }>(
      `INSERT INTO user_generation_usage AS u (user_id, ${column}, reset_at)
       VALUES ($1, 1, now())
       ON CONFLICT (user_id) DO UPDATE
          SET ${column} = CASE WHEN ${EXPIRED} THEN 1 ELSE u.${column} + 1 END,
              ${other}  = CASE WHEN ${EXPIRED} THEN 0 ELSE u.${other} END,
              reset_at  = CASE WHEN ${EXPIRED} THEN now() ELSE u.reset_at END,
              updated_at = now()
        WHERE u.${column} < $2 OR ${EXPIRED}
       RETURNING ${column} AS used`,
      [userId, FREE_GENERATIONS]
    );

    return row ? Math.max(FREE_GENERATIONS - row.used, 0) : null;
  },

  // Генерация упала — возвращаем списанную попытку
  async release(userId: string, kind: GenerationKind): Promise<void> {
    const column = COLUMN[kind];
    await query(
      `UPDATE user_generation_usage
          SET ${column} = GREATEST(${column} - 1, 0), updated_at = now()
        WHERE user_id = $1`,
      [userId]
    );
  },

  // Вызывается после успешной оплаты: окно начинается заново
  async reset(userId: string): Promise<void> {
    await query(
      `INSERT INTO user_generation_usage (user_id, names_used, logos_used, reset_at)
       VALUES ($1, 0, 0, now())
       ON CONFLICT (user_id) DO UPDATE
          SET names_used = 0, logos_used = 0, reset_at = now(), updated_at = now()`,
      [userId]
    );
  },
};
