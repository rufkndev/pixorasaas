import { query, queryOne, withTransaction } from '../pool';
import { User, UserWithSecret } from '../types';

// Поля, которые можно отдавать наружу
const PUBLIC_COLUMNS = 'id, email, full_name, email_verified_at, created_at';

const toUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  emailVerifiedAt: row.email_verified_at,
  createdAt: row.created_at,
});

const toUserWithSecret = (row: any): UserWithSecret => ({
  ...toUser(row),
  passwordHash: row.password_hash,
  deletedAt: row.deleted_at,
  blockedAt: row.blocked_at ?? null,
});

export const usersRepo = {
  async findById(id: string): Promise<User | null> {
    const row = await queryOne(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return row ? toUser(row) : null;
  },

  // Только для аутентификации: отдаёт хеш пароля
  async findByEmailWithSecret(email: string): Promise<UserWithSecret | null> {
    const row = await queryOne(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return row ? toUserWithSecret(row) : null;
  },

  async findByIdWithSecret(id: string): Promise<UserWithSecret | null> {
    const row = await queryOne(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return row ? toUserWithSecret(row) : null;
  },

  async create(input: {
    email: string;
    passwordHash: string;
    fullName?: string | null;
    signupSource?: Record<string, string | undefined> | null;
  }): Promise<User> {
    const row = await queryOne(
      `INSERT INTO users (email, password_hash, full_name, signup_source)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING ${PUBLIC_COLUMNS}`,
      [
        input.email,
        input.passwordHash,
        input.fullName ?? null,
        input.signupSource ? JSON.stringify(input.signupSource) : null,
      ]
    );
    return toUser(row);
  },

  async markEmailVerified(id: string): Promise<void> {
    await query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now()
       WHERE id = $1`,
      [id]
    );
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(
      'UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1',
      [id, passwordHash]
    );
  },

  // Контент удаляется, строка users остаётся обезличенной: на неё ссылаются
  // платежи, которые обязаны храниться по 54-ФЗ. Записи о согласиях тоже
  // остаются — они доказывают факт получения и отзыва.
  async deleteAccount(id: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM generated_names WHERE user_id = $1', [id]);
      await client.query('DELETE FROM generated_logos WHERE user_id = $1', [id]);
      await client.query('DELETE FROM brandbooks WHERE user_id = $1', [id]);
      await client.query('DELETE FROM user_generation_usage WHERE user_id = $1', [id]);
      await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      await client.query('DELETE FROM auth_tokens WHERE user_id = $1', [id]);
      // Статистика использования хранится до удаления аккаунта — так записано в политике
      await client.query('DELETE FROM app_events WHERE user_id = $1', [id]);

      // Сумма, дата и статус платежа остаются, контактные данные — нет
      await client.query(
        `UPDATE payments
         SET product_data = product_data - 'email' - 'phone' - 'name'
         WHERE user_id = $1`,
        [id]
      );

      await client.query(
        `UPDATE users
         SET email         = 'deleted+' || id::text || '@invalid',
             full_name     = NULL,
             password_hash = '',
             deleted_at    = now(),
             updated_at    = now()
         WHERE id = $1`,
        [id]
      );
    });
  },
};
