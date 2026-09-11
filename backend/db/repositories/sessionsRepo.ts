import { query, queryOne } from '../pool';

export interface SessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
}

// Сессии, они же refresh-токены. В базе только SHA-256.
// При каждом обновлении токен меняется на новый.
export const sessionsRepo = {
  async create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<string> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.userId,
        input.refreshTokenHash,
        input.expiresAt,
        input.ip ?? null,
        input.userAgent ?? null,
      ]
    );
    return row!.id;
  },

  // Проверяется на каждом защищённом запросе: access-токен сам по себе не
  // отзывается, а выход и смена пароля должны срабатывать сразу.
  // Запрос по первичному ключу, поэтому дешёвый.
  async isActive(id: string): Promise<boolean> {
    const row = await queryOne<{ ok: boolean }>(
      'SELECT true AS ok FROM sessions WHERE id = $1 AND expires_at > now()',
      [id]
    );
    return Boolean(row);
  },

  async findByTokenHash(refreshTokenHash: string): Promise<SessionRow | null> {
    const row = await queryOne(
      `SELECT id, user_id, expires_at
       FROM sessions
       WHERE refresh_token_hash = $1 AND expires_at > now()`,
      [refreshTokenHash]
    );

    return row
      ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at }
      : null;
  },

  // Условие по старому хешу защищает от гонки: параллельный refresh
  // со старым токеном ничего не найдёт.
  async rotate(input: {
    id: string;
    oldTokenHash: string;
    newTokenHash: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const rows = await query(
      `UPDATE sessions
       SET refresh_token_hash = $3, expires_at = $4, last_used_at = now()
       WHERE id = $1 AND refresh_token_hash = $2
       RETURNING id`,
      [input.id, input.oldTokenHash, input.newTokenHash, input.expiresAt]
    );
    return rows.length > 0;
  },

  async deleteByTokenHash(refreshTokenHash: string): Promise<void> {
    await query('DELETE FROM sessions WHERE refresh_token_hash = $1', [refreshTokenHash]);
  },

  // Все сессии пользователя — вызывается после смены пароля
  async deleteAllForUser(userId: string): Promise<void> {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },

  async deleteExpired(): Promise<void> {
    await query('DELETE FROM sessions WHERE expires_at < now()');
  },
};
