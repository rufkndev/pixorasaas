import { query, queryOne } from '../pool';
import { GeneratedLogo } from '../types';

const toLogo = (row: any): GeneratedLogo => ({
  id: Number(row.id),
  userId: row.user_id,
  name: row.name,
  keywords: row.keywords,
  logoUrl: row.logo_url,
  industry: row.industry,
  isPaid: row.is_paid,
  orderId: row.order_id,
  paymentId: row.payment_id,
  paymentMethod: row.payment_method,
  email: row.email,
  phone: row.phone,
  originalLogoUrl: row.original_logo_url,
  style: row.style,
  pattern: row.pattern,
  subject: row.subject,
  concept: row.concept,
  palette: row.palette,
  svgUrl: row.svg_url,
  originalSvgUrl: row.original_svg_url,
  lockupFont: row.lockup_font ?? null,
  markSvgUrl: row.mark_svg_url ?? null,
  demoSlogan: row.demo_slogan ?? null,
  demoVariants: row.demo_variants ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const logosRepo = {
  async create(input: {
    userId: string;
    name?: string | null;
    keywords?: string | null;
    logoUrl: string;
    originalLogoUrl?: string | null;
    industry?: string | null;
    isPaid?: boolean;
    orderId?: string | null;
    paymentId?: string | null;
    paymentMethod?: string | null;
    email?: string | null;
    phone?: string | null;
    style?: string | null;
    pattern?: string | null;
    subject?: string | null;
    concept?: string | null;
    palette?: string[] | null;
    svgUrl?: string | null;
    originalSvgUrl?: string | null;
    lockupFont?: string | null;
  }): Promise<GeneratedLogo> {
    const rows = await query(
      `INSERT INTO generated_logos
         (user_id, name, keywords, logo_url, original_logo_url, industry, is_paid,
          order_id, payment_id, payment_method, email, phone,
          style, pattern, subject, concept, palette, svg_url, original_svg_url,
          lockup_font)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
               $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        input.userId,
        input.name ?? null,
        input.keywords ?? null,
        input.logoUrl,
        input.originalLogoUrl ?? null,
        input.industry ?? null,
        input.isPaid ?? false,
        input.orderId ?? null,
        input.paymentId ?? null,
        input.paymentMethod ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.style ?? null,
        input.pattern ?? null,
        input.subject ?? null,
        input.concept ?? null,
        input.palette ? JSON.stringify(input.palette) : null,
        input.svgUrl ?? null,
        input.originalSvgUrl ?? null,
        input.lockupFont ?? null,
      ]
    );
    return toLogo(rows[0]);
  },

  // Что уже показывали этому пользователю по этому названию. Без списка
  // исключений модель раз за разом предлагает один и тот же предмет
  async recentConcepts(
    userId: string,
    name: string,
    limit: number = 12
  ): Promise<{ patterns: string[]; subjects: string[] }> {
    const rows = await query(
      `SELECT pattern, subject FROM generated_logos
       WHERE user_id = $1 AND name = $2 AND (pattern IS NOT NULL OR subject IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, name, limit]
    );

    return {
      patterns: [...new Set(rows.map((row: any) => row.pattern).filter(Boolean))] as string[],
      subjects: [...new Set(rows.map((row: any) => row.subject).filter(Boolean))] as string[],
    };
  },

  // Вектор появляется после оплаты, отдельным шагом
  async setSvgUrl(id: number | string, svgUrl: string): Promise<void> {
    await query(
      'UPDATE generated_logos SET original_svg_url = $2, updated_at = now() WHERE id = $1',
      [id, svgUrl]
    );
  },

  // Вектор голого знака без надписи — кэш: обводка платная за вызов, и повтор
  // упавшей сборки брендбука не должен покупать её второй раз
  async setMarkSvgUrl(id: number | string, markSvgUrl: string): Promise<void> {
    await query(
      'UPDATE generated_logos SET mark_svg_url = $2, updated_at = now() WHERE id = $1',
      [id, markSvgUrl]
    );
  },

  async setDemo(id: number, input: { slogan: string; variants: unknown[] }): Promise<void> {
    await query(
      `UPDATE generated_logos
       SET demo_slogan = $2, demo_variants = $3, updated_at = now()
       WHERE id = $1`,
      [id, input.slogan, JSON.stringify(input.variants)]
    );
  },

  // Кэш предпросмотра по id логотипов — чистке нужно знать, какие файлы ещё в деле
  async demoVariantsByIds(ids: number[]): Promise<Map<number, unknown[]>> {
    const rows = await query(
      'SELECT id, demo_variants FROM generated_logos WHERE id = ANY($1) AND demo_variants IS NOT NULL',
      [ids]
    );
    return new Map(rows.map((row: any) => [Number(row.id), row.demo_variants]));
  },

  // Неоплаченные логотипы старше срока, на которые не ссылается ни один заказ:
  // ожидающий оплаты платёж не должен лишиться своего логотипа
  async listExpiredUnpaid(days: number, limit: number): Promise<GeneratedLogo[]> {
    const rows = await query(
      `SELECT l.* FROM generated_logos l
        WHERE l.is_paid = false
          AND l.created_at < now() - make_interval(days => $1)
          AND NOT EXISTS (
            SELECT 1 FROM payments p WHERE p.product_data->>'logoId' = l.id::text
          )
        ORDER BY l.created_at
        LIMIT $2`,
      [days, limit]
    );
    return rows.map(toLogo);
  },

  // Условия повторяются при удалении: между выборкой и удалением логотип могли
  // оплатить. false — строка не удалена, и файлы трогать нельзя
  async deleteUnpaid(id: number): Promise<boolean> {
    const rows = await query(
      `DELETE FROM generated_logos l
        WHERE l.id = $1
          AND l.is_paid = false
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.product_data->>'logoId' = l.id::text)
        RETURNING id`,
      [id]
    );
    return rows.length > 0;
  },

  async findByIdForUser(id: number | string, userId: string): Promise<GeneratedLogo | null> {
    const row = await queryOne(
      'SELECT * FROM generated_logos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return row ? toLogo(row) : null;
  },

  // По паре (user_id, logo_url) оплата привязывается к уже показанному логотипу.
  // Дубликаты возможны, поэтому берём последний, а не падаем на неоднозначности.
  async findLatestByUrl(userId: string, logoUrl: string): Promise<GeneratedLogo | null> {
    const row = await queryOne(
      `SELECT * FROM generated_logos
       WHERE user_id = $1 AND logo_url = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, logoUrl]
    );
    return row ? toLogo(row) : null;
  },

  async listByUser(userId: string): Promise<GeneratedLogo[]> {
    const rows = await query(
      'SELECT * FROM generated_logos WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map(toLogo);
  },

  async markPaid(
    id: number | string,
    input: {
      orderId?: string | null;
      paymentId?: string | null;
      paymentMethod?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ): Promise<GeneratedLogo | null> {
    const rows = await query(
      `UPDATE generated_logos
       SET is_paid        = true,
           order_id       = COALESCE($2, order_id),
           payment_id     = COALESCE($3, payment_id),
           payment_method = COALESCE($4, payment_method),
           email          = COALESCE($5, email),
           phone          = COALESCE($6, phone),
           updated_at     = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.orderId ?? null,
        input.paymentId ?? null,
        input.paymentMethod ?? null,
        input.email ?? null,
        input.phone ?? null,
      ]
    );
    return rows.length > 0 ? toLogo(rows[0]) : null;
  },

  // Ищет и по logo_url, и по original_logo_url. Возвращает число строк.
  async markPaidByUrl(
    userId: string,
    logoUrl: string,
    input: { orderId?: string | null; paymentId?: string | null }
  ): Promise<number> {
    const rows = await query(
      `UPDATE generated_logos
       SET is_paid    = true,
           order_id   = COALESCE($3, order_id),
           payment_id = COALESCE($4, payment_id),
           updated_at = now()
       WHERE user_id = $1
         AND (logo_url = $2 OR original_logo_url = $2)
       RETURNING id`,
      [userId, logoUrl, input.orderId ?? null, input.paymentId ?? null]
    );
    return rows.length;
  },
};
