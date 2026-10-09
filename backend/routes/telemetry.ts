// Приём данных из браузера: посещения, продуктовые события, ошибки фронта.
// Всё открыто без входа, поэтому каждое поле режется по длине и белому списку.

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { optionalAuth } from '../auth/middleware';
import { CLIENT_EVENTS, countTraffic, track } from '../services/eventsService';
import { recordClientError } from '../monitoring/logSink';
import { maskPersonalData } from '../logger';

const router = Router();

const telemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов' },
});

const errorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов' },
});

// Путь без query и без id: /pages/brandbook/<uuid> свёлся бы в тысячу строк
const normalizePath = (raw: string): string =>
  raw
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .slice(0, 100);

const visitSchema = z.object({
  path: z.string().max(500),
  source: z.string().max(60).regex(/^[\w.\- ]+$/).optional(),
  newSession: z.boolean().optional(),
});

router.post('/t/visit', telemetryLimiter, async (req, res) => {
  const parsed = visitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(204).end();

  const { path, source, newSession } = parsed.data;
  try {
    await countTraffic('pageview', normalizePath(path));
    if (newSession) await countTraffic('session', (source || 'direct').toLowerCase());
  } catch {
    // Посещение не записалось — не повод отвечать ошибкой
  }
  return res.status(204).end();
});

const eventSchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  props: z.record(z.union([z.string().max(100), z.number(), z.boolean()])).optional(),
});

router.post('/t/event', telemetryLimiter, optionalAuth, (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (parsed.success) {
    // Не больше десятка полей: props пишется в базу как есть
    const props = Object.fromEntries(Object.entries(parsed.data.props || {}).slice(0, 10));
    track(parsed.data.name, req.user?.id, props);
  }
  return res.status(204).end();
});

const clientErrorSchema = z.object({
  message: z.string().max(1000),
  stack: z.string().max(4000).optional(),
  path: z.string().max(500).optional(),
  userAgent: z.string().max(300).optional(),
});

router.post('/t/error', errorLimiter, optionalAuth, (req, res) => {
  const parsed = clientErrorSchema.safeParse(req.body);
  if (parsed.success) {
    const { message, stack, path, userAgent } = parsed.data;
    recordClientError(maskPersonalData(message), {
      stack: stack ? maskPersonalData(stack) : undefined,
      path: path ? normalizePath(path) : undefined,
      userAgent,
      userId: req.user?.id ?? null,
    });
  }
  return res.status(204).end();
});

export default router;
