import { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool';

// Верхние границы корзин длительности, мс. Последняя корзина — всё, что дольше
// минуты: генерация логотипа как раз около 45 секунд
export const LATENCY_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000];

interface Cell {
  count: number;
  s4xx: number;
  s5xx: number;
  sumMs: number;
  maxMs: number;
  hist: number[];
}

const cells = new Map<string, Cell>();
let timer: NodeJS.Timeout | null = null;

const SKIP = new Set(['/api/health']);

const minuteOf = (date: Date): string => {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy.toISOString();
};

// Маршрут берётся шаблоном (/api/download-logo/:logoId), а не настоящим путём:
// иначе каждый id давал бы свою строку и метрики не сводились бы
const routeOf = (req: Request): string => {
  if (req.route?.path) return `${req.baseUrl}${req.route.path}`;
  if (req.originalUrl.startsWith('/generated-logos/')) return '/generated-logos/*';
  return 'не найден';
};

export const httpMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    if (SKIP.has(path)) return;

    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const key = `${minuteOf(new Date())}|${req.method}|${routeOf(req)}`;

    let cell = cells.get(key);
    if (!cell) {
      cell = { count: 0, s4xx: 0, s5xx: 0, sumMs: 0, maxMs: 0, hist: new Array(LATENCY_BUCKETS.length + 1).fill(0) };
      cells.set(key, cell);
    }

    cell.count++;
    if (res.statusCode >= 500) cell.s5xx++;
    else if (res.statusCode >= 400) cell.s4xx++;
    cell.sumMs += ms;
    cell.maxMs = Math.max(cell.maxMs, ms);

    const bucket = LATENCY_BUCKETS.findIndex((limit) => ms <= limit);
    cell.hist[bucket === -1 ? LATENCY_BUCKETS.length : bucket]++;
  });

  next();
};

// Сливаем всё накопленное; та же минута может прийти второй раз после
// перезапуска или на границе — поэтому складываем, а не перезаписываем
export const flushHttpMetrics = async (): Promise<void> => {
  if (cells.size === 0) return;

  const batch = [...cells.entries()];
  cells.clear();

  for (const [key, cell] of batch) {
    const [minute, method, route] = key.split('|');
    try {
      await query(
        `INSERT INTO http_metrics AS m (minute, method, route, count, s4xx, s5xx, sum_ms, max_ms, hist)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (minute, method, route) DO UPDATE SET
           count = m.count + EXCLUDED.count,
           s4xx = m.s4xx + EXCLUDED.s4xx,
           s5xx = m.s5xx + EXCLUDED.s5xx,
           sum_ms = m.sum_ms + EXCLUDED.sum_ms,
           max_ms = GREATEST(m.max_ms, EXCLUDED.max_ms),
           hist = (SELECT array_agg(a + b ORDER BY i)
                     FROM unnest(m.hist, EXCLUDED.hist) WITH ORDINALITY AS t(a, b, i))`,
        [minute, method, route, cell.count, cell.s4xx, cell.s5xx, Math.round(cell.sumMs), Math.round(cell.maxMs), cell.hist]
      );
    } catch {
      // Минута метрик потеряна — не повод шуметь в логах каждую минуту
    }
  }
};

export const startHttpMetrics = (): void => {
  timer = setInterval(() => void flushHttpMetrics(), 60_000);
};

export const stopHttpMetrics = async (): Promise<void> => {
  if (timer) clearInterval(timer);
  await flushHttpMetrics();
};

// Перцентиль по гистограмме: верхняя граница корзины, в которую он попал.
// Грубо, но для «стало медленнее или нет» хватает
export const percentileFromHist = (hist: number[], p: number): number | null => {
  const total = hist.reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  const target = total * p;
  let seen = 0;
  for (let i = 0; i < hist.length; i++) {
    seen += hist[i];
    if (seen >= target) return LATENCY_BUCKETS[i] ?? LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1] * 2;
  }
  return null;
};
