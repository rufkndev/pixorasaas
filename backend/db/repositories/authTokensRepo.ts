import { query, queryOne } from '../pool';
import { AuthTokenKind } from '../types';

// Одноразовые токены подтверждения почты и сброса пароля.
// В базе только SHA-256 — сам токен существует лишь в письме.
export const authTokensRepo = {
  async create(input: {
    userId: string;
    kind: AuthTokenKind;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.userId, input.kind, input.tokenHash, input.expiresAt]
    );
  },

  // Гасит токен и возвращает id пользователя. null — если токен не найден,
  // просрочен или уже использован: повторный переход по ссылке не сработает.
  async consume(tokenHash: string, kind: AuthTokenKind): Promise<string | null> {
    const row = await queryOne<{ user_id: string }>(
      `UPDATE auth_tokens
       SET used_at = now()
       WHERE token_hash = $1
         AND kind = $2
         AND used_at IS NULL
         AND expires_at > now()
       RETURNING user_id`,
      [tokenHash, kind]
    );
    return row ? row.user_id : null;
  },

  // Гасит все живые токены вида — например, при повторной отправке письма
  async invalidateAll(userId: string, kind: AuthTokenKind): Promise<void> {
    await query(
      `UPDATE auth_tokens
       SET used_at = now()
       WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`,
      [userId, kind]
    );
  },

  // Сколько токенов выпущено за последние N минут — для защиты от флуда
  async countRecent(userId: string, kind: AuthTokenKind, minutes: number): Promise<number> {
    const row = await queryOne<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM auth_tokens
       WHERE user_id = $1
         AND kind = $2
         AND created_at > now() - ($3 || ' minutes')::interval`,
      [userId, kind, String(minutes)]
    );
    return row ? Number(row.count) : 0;
  },

  async deleteExpired(): Promise<void> {
    await query('DELETE FROM auth_tokens WHERE expires_at < now() - interval \'7 days\'');
  },
};
