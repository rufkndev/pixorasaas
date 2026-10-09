// Админка: модели в духе Django, мониторинг и аналитика. Всё за requireAdmin,
// каждое изменяющее действие пишется в admin_actions.

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import { requireAdmin, audit } from '../admin/access';
import { RESOURCES, findResource } from '../admin/resources';
import { detailPayload, detailRow, exportCsv, listRows, ListParams, resourceMeta, validId } from '../admin/engine';
import { ActionError } from '../admin/types';
import { buildAnalytics, firstDataDay } from '../admin/analytics';
import { logs, metrics, overview, RANGES, RangeKey } from '../admin/monitoring';
import { runChecks } from '../monitoring/checks';
import { settingsService, SETTING_FIELDS, AppSettings } from '../services/settingsService';
import { query, queryOne } from '../db/pool';
import { resolveGeneratedLogoPath } from '../paths';
import { rawNameFor } from '../services/logoService';
import { YookassaError } from '../services/yookassaService';
import { log } from '../logger';

const router = Router();

router.use(requireAdmin);

// Ответ админки не кэшируется ни браузером, ни прокси: там почта и заказы
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Админу показываем настоящий текст ошибки ЮKassa: без него непонятно, что делать дальше
const fail = (res: Response, error: any, fallback: string) => {
  if (error instanceof ActionError) return res.status(400).json({ error: error.message });
  if (error instanceof YookassaError) return res.status(502).json({ error: `ЮKassa: ${error.message}` });
  log.error(`${fallback}:`, error.message);
  return res.status(500).json({ error: fallback });
};

router.get('/me', (req, res) => {
  res.json({ email: req.user!.email });
});

router.get('/resources', (_req, res) => {
  res.json({ resources: RESOURCES.map(resourceMeta) });
});

const listParams = (req: Request): ListParams => {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith('f_') && typeof value === 'string') filters[key.slice(2)] = value;
  }
  return {
    q: typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : undefined,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 50,
    sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
    dir: req.query.dir === 'asc' ? 'asc' : 'desc',
    filters,
  };
};

router.get('/r/:resource', async (req, res) => {
  const resource = findResource(req.params.resource);
  if (!resource) return res.status(404).json({ error: 'Нет такой модели' });

  try {
    return res.json({ meta: resourceMeta(resource), ...(await listRows(resource, listParams(req))) });
  } catch (error: any) {
    return fail(res, error, 'Не удалось загрузить список');
  }
});

router.get('/r/:resource/export.csv', async (req, res) => {
  const resource = findResource(req.params.resource);
  if (!resource) return res.status(404).json({ error: 'Нет такой модели' });

  try {
    const csv = await exportCsv(resource, listParams(req));
    await audit(req, 'export_csv', resource.key, null, { query: req.query });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${resource.key}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    return fail(res, error, 'Не удалось выгрузить CSV');
  }
});

router.get('/r/:resource/:id', async (req, res) => {
  const resource = findResource(req.params.resource);
  if (!resource || !validId(resource, req.params.id)) return res.status(404).json({ error: 'Запись не найдена' });

  try {
    const payload = await detailPayload(resource, req.params.id);
    if (!payload) return res.status(404).json({ error: 'Запись не найдена' });
    return res.json({ meta: resourceMeta(resource), ...payload });
  } catch (error: any) {
    return fail(res, error, 'Не удалось загрузить запись');
  }
});

const runAction = async (req: Request, res: Response, id: string | null) => {
  const resource = findResource(req.params.resource);
  if (!resource) return res.status(404).json({ error: 'Нет такой модели' });

  const action = resource.actions?.find((a) => a.key === req.params.action && a.scope === (id ? 'row' : 'collection'));
  if (!action) return res.status(404).json({ error: 'Нет такого действия' });

  let row: Record<string, any> | null = null;
  if (id) {
    if (!validId(resource, id)) return res.status(404).json({ error: 'Запись не найдена' });
    row = await detailRow(resource, id);
    if (!row) return res.status(404).json({ error: 'Запись не найдена' });
    // Условие видимости проверяется и здесь: кнопку могли нажать на устаревшей карточке
    if (action.visible && !action.visible(row)) {
      return res.status(409).json({ error: 'Действие сейчас недоступно — обновите страницу' });
    }
  }

  const input = typeof req.body === 'object' && req.body ? req.body : {};
  for (const field of action.fields ?? []) {
    if (field.required && (input[field.key] === undefined || input[field.key] === '')) {
      return res.status(400).json({ error: `Заполните поле «${field.label}»` });
    }
  }

  try {
    const message = await action.run({ id, row, input, req });
    await audit(req, action.key, resource.key, id, { input, message });
    return res.json({ success: true, message });
  } catch (error: any) {
    await audit(req, `${action.key}:failed`, resource.key, id, { input, error: error.message });
    return fail(res, error, 'Действие не выполнено');
  }
};

router.post('/r/:resource/actions/:action', (req, res) => runAction(req, res, null));
router.post('/r/:resource/:id/actions/:action', (req, res) => runAction(req, res, req.params.id));

// Главная админки: то, что требует внимания, и короткая сводка за сегодня
router.get('/home', async (_req, res) => {
  try {
    const today = `(now() AT TIME ZONE 'Europe/Moscow')::date`;
    const inToday = (col: string) => `(${col} AT TIME ZONE 'Europe/Moscow')::date = ${today}`;
    const counts = await queryOne<any>(
      `SELECT
         (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND delivery_status <> 'completed') AS undelivered,
         (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND delivery_status <> 'completed' AND delivery_attempts >= 5) AS exhausted,
         (SELECT COUNT(*) FROM brandbooks WHERE status = 'completed' AND email_sent_at IS NULL) AS no_email,
         (SELECT COUNT(*) FROM contact_messages WHERE handled_at IS NULL) AS messages,
         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND ${inToday('paid_at')}) AS revenue,
         (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND ${inToday('paid_at')}) AS orders,
         (SELECT COUNT(*) FROM users WHERE ${inToday('created_at')}) AS registrations,
         (SELECT COUNT(*) FROM generated_logos WHERE ${inToday('created_at')}) AS logos,
         (SELECT COUNT(*) FROM generated_names WHERE ${inToday('created_at')}) AS names,
         (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS users_total,
         (SELECT COUNT(*) FROM app_logs WHERE level = 'error' AND at > now() - INTERVAL '24 hours') AS errors24h`
    );

    const recentOrders = await query(
      `SELECT p.order_id, p.product_type, p.amount, p.status, p.delivery_status, p.created_at,
              p.product_data->>'name' AS name
         FROM payments p ORDER BY p.created_at DESC LIMIT 8`
    );
    const recentActions = await query(
      `SELECT created_at, admin_email, action, target_type, target_id FROM admin_actions ORDER BY created_at DESC LIMIT 8`
    );

    const settings = await settingsService.get();
    return res.json({
      counts: Object.fromEntries(Object.entries(counts ?? {}).map(([k, v]) => [k, Number(v)])),
      recentOrders,
      recentActions,
      freePaused: settings.freePaused,
    });
  } catch (error: any) {
    return fail(res, error, 'Не удалось загрузить сводку');
  }
});

router.get('/settings', async (_req, res) => {
  try {
    res.json({ fields: SETTING_FIELDS, values: await settingsService.get() });
  } catch (error: any) {
    fail(res, error, 'Не удалось загрузить настройки');
  }
});

router.put('/settings', async (req, res) => {
  const changes = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    const applied: Record<string, unknown> = {};
    for (const field of SETTING_FIELDS) {
      if (!(field.key in changes)) continue;
      const value = changes[field.key];
      if (field.type === 'boolean' && typeof value !== 'boolean') continue;
      if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000_000)) {
        return res.status(400).json({ error: `Некорректное значение «${field.label}»` });
      }
      await settingsService.set(field.key as keyof AppSettings, value, req.user!.email);
      applied[field.key] = value;
    }
    await audit(req, 'settings', 'settings', null, applied);
    return res.json({ success: true, values: await settingsService.get() });
  } catch (error: any) {
    return fail(res, error, 'Не удалось сохранить настройки');
  }
});

// Чистый файл и кадр модели закрыты от статики — админу они нужны, чтобы
// оценить качество генерации без водяного знака
router.get('/logos/:id/file', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).end();

  try {
    const logo = await queryOne<{ original_logo_url: string | null; logo_url: string }>(
      'SELECT original_logo_url, logo_url FROM generated_logos WHERE id = $1',
      [id]
    );
    if (!logo) return res.status(404).end();

    const source = resolveGeneratedLogoPath(logo.original_logo_url || logo.logo_url);
    const filePath =
      req.query.kind === 'raw' && source ? path.join(path.dirname(source), rawNameFor(source)) : source;

    if (!filePath || !fs.existsSync(filePath)) return res.status(404).end();
    return res.sendFile(filePath);
  } catch (error: any) {
    log.error('Не удалось отдать файл логотипа админу:', error.message);
    return res.status(500).end();
  }
});

router.get('/monitoring/overview', async (_req, res) => {
  try {
    res.json(await overview());
  } catch (error: any) {
    fail(res, error, 'Не удалось загрузить мониторинг');
  }
});

router.post('/monitoring/checks', async (_req, res) => {
  try {
    res.json({ checks: await runChecks() });
  } catch (error: any) {
    fail(res, error, 'Проверки не выполнились');
  }
});

router.get('/monitoring/metrics', async (req, res) => {
  const range = (typeof req.query.range === 'string' && req.query.range in RANGES ? req.query.range : '24h') as RangeKey;
  try {
    res.json(await metrics(range));
  } catch (error: any) {
    fail(res, error, 'Не удалось загрузить метрики');
  }
});

router.get('/monitoring/logs', async (req, res) => {
  try {
    res.json(
      await logs({
        levels: typeof req.query.levels === 'string' ? req.query.levels.split(',') : [],
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        q: typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : undefined,
        requestId: typeof req.query.requestId === 'string' ? req.query.requestId.slice(0, 64) : undefined,
        before: Number(req.query.before) || undefined,
        limit: Number(req.query.limit) || undefined,
      })
    );
  } catch (error: any) {
    fail(res, error, 'Не удалось загрузить логи');
  }
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

router.get('/analytics', async (req, res) => {
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const to = dateSchema.safeParse(req.query.to).success ? String(req.query.to) : today;
  let from: string;

  if (req.query.from === 'all') {
    from = await firstDataDay().catch(() => today);
  } else if (dateSchema.safeParse(req.query.from).success) {
    from = String(req.query.from);
  } else {
    const d = new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 29);
    from = d.toISOString().slice(0, 10);
  }

  if (from > to) return res.status(400).json({ error: 'Начало периода позже конца' });

  try {
    return res.json(await buildAnalytics(from, to));
  } catch (error: any) {
    return fail(res, error, 'Не удалось посчитать аналитику');
  }
});

export default router;
