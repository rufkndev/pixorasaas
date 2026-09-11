import { query } from '../pool';
import { ConsentInput, ConsentKind } from '../types';

// Журнал согласий. Версия документа, время, источник, IP и браузер —
// без них факт согласия недоказуем при проверке.
export const consentsRepo = {
  async record(input: ConsentInput): Promise<void> {
    await query(
      `INSERT INTO user_consents (user_id, subject, kind, doc_version, source, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.userId ?? null,
        input.subject ?? null,
        input.kind,
        input.docVersion,
        input.source,
        input.ip ?? null,
        input.userAgent ?? null,
      ]
    );
  },

  async recordMany(inputs: ConsentInput[]): Promise<void> {
    for (const input of inputs) {
      await this.record(input);
    }
  },

  // Отзыв: строка не удаляется, проставляется revoked_at
  async revoke(userId: string, kind: ConsentKind): Promise<void> {
    await query(
      `UPDATE user_consents
       SET revoked_at = now()
       WHERE user_id = $1 AND kind = $2 AND revoked_at IS NULL`,
      [userId, kind]
    );
  },

  async revokeAll(userId: string): Promise<void> {
    await query(
      'UPDATE user_consents SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  },

  async listForUser(userId: string) {
    const rows = await query(
      `SELECT kind, doc_version, source, granted_at, revoked_at
       FROM user_consents
       WHERE user_id = $1
       ORDER BY granted_at DESC`,
      [userId]
    );

    return rows.map((row) => ({
      kind: row.kind as ConsentKind,
      docVersion: row.doc_version,
      source: row.source,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
    }));
  },
};
