import { query, queryOne } from '../pool';
import { Brandbook, BuildStep, BuildStepState } from '../types';

// Сборка, зависшая дольше этого срока, снова считается свободной — как у платежей
const STALE_BUILD = '20 minutes';

const toBrandbook = (row: any): Brandbook => ({
  id: Number(row.id),
  userId: row.user_id,
  orderId: row.order_id,
  businessName: row.business_name,
  keywords: row.keywords,
  slogan: row.slogan,
  originalLogoUrl: row.original_logo_url,
  logoVariants: row.logo_variants ?? [],
  fonts: row.fonts ?? [],
  colorPalette: row.color_palette ?? [],
  icons: row.icons ?? [],
  guidelines: row.guidelines,
  applications: row.applications,
  status: row.status,
  paymentStatus: row.payment_status,
  isDemo: row.is_demo,
  style: row.style ?? null,
  industry: row.industry ?? null,
  buildStep: row.build_step ?? null,
  buildProgress: Number(row.build_progress ?? 0),
  buildSteps: row.build_steps ?? [],
  buildStartedAt: row.build_started_at ?? null,
  buildError: row.build_error ?? null,
  assets: row.assets ?? {},
  pdfUrl: row.pdf_url ?? null,
  emailSentAt: row.email_sent_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

export interface CreateBrandbookInput {
  userId: string;
  orderId: string;
  businessName: string;
  keywords?: string | null;
  slogan?: string | null;
  originalLogoUrl?: string | null;
  logoVariants?: any[];
  fonts?: any[];
  colorPalette?: any[];
  icons?: any[];
  guidelines?: any | null;
  applications?: any | null;
  status?: string;
  paymentStatus?: string;
  isDemo?: boolean;
  style?: string | null;
  industry?: string | null;
  completedAt?: Date | null;
}

// Что шаг сборки вправе записать в строку. Белый список, а не произвольный SQL:
// имена колонок приходят из кода сборщика и не должны попадать в запрос как есть.
export interface BrandbookPatch {
  slogan?: string;
  originalLogoUrl?: string | null;
  logoVariants?: any[];
  fonts?: any[];
  colorPalette?: any[];
  icons?: any[];
  guidelines?: any | null;
  applications?: any | null;
  assets?: Record<string, any>;
  pdfUrl?: string | null;
}

const PATCH_COLUMNS: Record<keyof BrandbookPatch, { column: string; json: boolean }> = {
  slogan: { column: 'slogan', json: false },
  originalLogoUrl: { column: 'original_logo_url', json: false },
  logoVariants: { column: 'logo_variants', json: true },
  fonts: { column: 'fonts', json: true },
  colorPalette: { column: 'color_palette', json: true },
  icons: { column: 'icons', json: true },
  guidelines: { column: 'guidelines', json: true },
  applications: { column: 'applications', json: true },
  assets: { column: 'assets', json: true },
  pdfUrl: { column: 'pdf_url', json: false },
};

// Шаги хранятся массивом, а не отдельными колонками: их состав меняется вместе
// со сборщиком, и миграция на каждый новый шаг того не стоит.
const putStep = (steps: BuildStep[], step: BuildStep): BuildStep[] =>
  steps.some((item) => item.key === step.key)
    ? steps.map((item) => (item.key === step.key ? step : item))
    : [...steps, step];

export const brandbooksRepo = {
  // У order_id стоит UNIQUE: при гонке вебхука и клиента вторая вставка упадёт
  // с кодом 23505. Вызывающий код обязан это поймать через isUniqueViolation.
  async create(input: CreateBrandbookInput): Promise<Brandbook> {
    const rows = await query(
      `INSERT INTO brandbooks
         (user_id, order_id, business_name, keywords, slogan, original_logo_url,
          logo_variants, fonts, color_palette, icons, guidelines, applications,
          status, payment_status, is_demo, style, industry, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6,
               $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
               $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        input.userId,
        input.orderId,
        input.businessName,
        input.keywords ?? null,
        input.slogan ?? '',
        input.originalLogoUrl ?? null,
        JSON.stringify(input.logoVariants ?? []),
        JSON.stringify(input.fonts ?? []),
        JSON.stringify(input.colorPalette ?? []),
        JSON.stringify(input.icons ?? []),
        input.guidelines ? JSON.stringify(input.guidelines) : null,
        input.applications ? JSON.stringify(input.applications) : null,
        input.status ?? 'processing',
        input.paymentStatus ?? 'completed',
        input.isDemo ?? false,
        input.style ?? null,
        input.industry ?? null,
        input.completedAt ?? null,
      ]
    );
    return toBrandbook(rows[0]);
  },

  // Строку заводит тот, кто первым дошёл до выдачи, а второй получает её же.
  // UNIQUE по order_id из аварийного пути превращается в примитив синхронизации:
  // ловить 23505 в вызывающем коде больше не нужно.
  async ensure(input: CreateBrandbookInput): Promise<Brandbook> {
    const rows = await query(
      `INSERT INTO brandbooks
         (user_id, order_id, business_name, keywords, slogan, original_logo_url,
          status, payment_status, is_demo, style, industry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (order_id) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [
        input.userId,
        input.orderId,
        input.businessName,
        input.keywords ?? null,
        input.slogan ?? '',
        input.originalLogoUrl ?? null,
        input.status ?? 'processing',
        input.paymentStatus ?? 'completed',
        input.isDemo ?? false,
        input.style ?? null,
        input.industry ?? null,
      ]
    );
    return toBrandbook(rows[0]);
  },

  // Сборку получает ровно один вызывающий — и вебхук, и опрос со страницы успеха
  // идут сюда. Тот же приём, что paymentsRepo.claimDelivery.
  async claimBuild(id: number): Promise<Brandbook | null> {
    const row = await queryOne(
      `UPDATE brandbooks
          SET status = 'processing', build_started_at = now(),
              build_error = NULL, updated_at = now()
        WHERE id = $1
          AND status <> 'completed'
          AND (build_started_at IS NULL
               OR build_started_at < now() - INTERVAL '${STALE_BUILD}')
        RETURNING *`,
      [id]
    );
    return row ? toBrandbook(row) : null;
  },

  async startStep(id: number, key: string, label: string, progress: number): Promise<void> {
    const current = await queryOne('SELECT build_steps FROM brandbooks WHERE id = $1', [id]);
    const steps = putStep(current?.build_steps ?? [], {
      key,
      label,
      state: 'running',
      at: new Date().toISOString(),
    });

    await query(
      `UPDATE brandbooks
          SET build_step = $2, build_progress = $3,
              build_steps = $4::jsonb, updated_at = now()
        WHERE id = $1`,
      [id, key, Math.min(100, Math.max(0, Math.round(progress))), JSON.stringify(steps)]
    );
  },

  async finishStep(id: number, key: string, state: BuildStepState, error?: string): Promise<void> {
    const current = await queryOne(
      'SELECT build_steps FROM brandbooks WHERE id = $1',
      [id]
    );
    const previous: BuildStep[] = current?.build_steps ?? [];
    const before = previous.find((step) => step.key === key);
    const steps = putStep(previous, {
      key,
      label: before?.label ?? key,
      state,
      error: error ? error.slice(0, 300) : undefined,
      at: new Date().toISOString(),
    });

    await query(
      'UPDATE brandbooks SET build_steps = $2::jsonb, updated_at = now() WHERE id = $1',
      [id, JSON.stringify(steps)]
    );
  },

  // Результат шага ложится в строку сразу: падение в середине оставляет
  // частично собранный брендбук, а не пустоту
  async patch(id: number, patch: BrandbookPatch): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [id];

    for (const [field, value] of Object.entries(patch)) {
      const column = PATCH_COLUMNS[field as keyof BrandbookPatch];
      if (!column || value === undefined) continue;

      values.push(column.json ? JSON.stringify(value) : value);
      sets.push(`${column.column} = $${values.length}${column.json ? '::jsonb' : ''}`);
    }

    if (!sets.length) return;

    await query(
      `UPDATE brandbooks SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`,
      values
    );
  },

  async findByOrderId(orderId: string): Promise<Brandbook | null> {
    const row = await queryOne('SELECT * FROM brandbooks WHERE order_id = $1', [orderId]);
    return row ? toBrandbook(row) : null;
  },

  async findByOrderIdForUser(orderId: string, userId: string): Promise<Brandbook | null> {
    const row = await queryOne(
      'SELECT * FROM brandbooks WHERE order_id = $1 AND user_id = $2',
      [orderId, userId]
    );
    return row ? toBrandbook(row) : null;
  },

  // Кабинет показывает и незавершённые: покупатель должен видеть заказ, который
  // ещё собирается или сорвался, а не пустой список
  async listByUser(userId: string): Promise<Brandbook[]> {
    const rows = await query(
      'SELECT * FROM brandbooks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map(toBrandbook);
  },

  async markCompleted(id: number | string): Promise<void> {
    await query(
      `UPDATE brandbooks
          SET status = 'completed', build_progress = 100, build_step = NULL,
              build_error = NULL, completed_at = now(), updated_at = now()
        WHERE id = $1`,
      [id]
    );
  },

  async markFailed(id: number, error: string): Promise<void> {
    await query(
      `UPDATE brandbooks
          SET status = 'failed', build_error = $2, updated_at = now()
        WHERE id = $1`,
      [id, error.slice(0, 500)]
    );
  },

  async markEmailSent(id: number): Promise<void> {
    await query('UPDATE brandbooks SET email_sent_at = now() WHERE id = $1', [id]);
  },
};
