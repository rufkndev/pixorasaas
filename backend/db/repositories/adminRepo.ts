import { query, queryOne } from '../pool';

// Блок-лист проверяется на каждой бесплатной генерации и регистрации, а меняется
// раз в сто лет — держим копию в памяти
let blockedCache: { at: number; keys: Set<string> } | null = null;
const BLOCKED_TTL_MS = 60_000;

export const blockedIpsRepo = {
  async isBlocked(ipKey: string): Promise<boolean> {
    if (!blockedCache || Date.now() - blockedCache.at > BLOCKED_TTL_MS) {
      const rows = await query<{ ip_key: string }>('SELECT ip_key FROM blocked_ips');
      blockedCache = { at: Date.now(), keys: new Set(rows.map((row) => row.ip_key)) };
    }
    return blockedCache.keys.has(ipKey);
  },

  async add(ipKey: string, reason: string | null, by: string): Promise<void> {
    await query(
      `INSERT INTO blocked_ips (ip_key, reason, created_by) VALUES ($1, $2, $3)
       ON CONFLICT (ip_key) DO UPDATE SET reason = EXCLUDED.reason`,
      [ipKey, reason, by]
    );
    blockedCache = null;
  },

  async remove(ipKey: string): Promise<void> {
    await query('DELETE FROM blocked_ips WHERE ip_key = $1', [ipKey]);
    blockedCache = null;
  },
};

export const adminActionsRepo = {
  async record(input: {
    adminId: string;
    adminEmail: string;
    action: string;
    targetType: string;
    targetId: string | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await query(
      `INSERT INTO admin_actions (admin_id, admin_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [input.adminId, input.adminEmail, input.action, input.targetType, input.targetId, JSON.stringify(input.details ?? {})]
    );
  },
};

export const contactMessagesRepo = {
  async create(input: { userId: string | null; name: string; email: string; message: string; ip: string | null }): Promise<number> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO contact_messages (user_id, name, email, message, ip) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.userId, input.name, input.email, input.message, input.ip]
    );
    return Number(row!.id);
  },
};
