import { query, queryOne } from '../db/pool';
import { lastCheckResults, serverResources } from '../monitoring/checks';
import { flushHttpMetrics, percentileFromHist, LATENCY_BUCKETS } from '../monitoring/httpMetrics';
import { flushLogs } from '../monitoring/logSink';
import { schedulerStatus } from '../jobs/scheduler';
import { activeDeliveriesCount } from '../services/orderService';
import { logoSlots } from '../routes/generateLogo';
import { settingsService } from '../services/settingsService';
import { spendRepo } from '../db/repositories';
import { FREE_SPEND_KINDS } from '../limits';

export const RANGES = {
  '1h': { interval: '1 hour', bucket: '1 minute' },
  '24h': { interval: '24 hours', bucket: '15 minutes' },
  '7d': { interval: '7 days', bucket: '2 hours' },
  '30d': { interval: '30 days', bucket: '12 hours' },
} as const;

export type RangeKey = keyof typeof RANGES;

const num = (value: unknown): number => Number(value ?? 0) || 0;

// Сумма гистограмм по корзинам в SQL: поэлементного sum для массивов в Postgres нет
const histSql = (groupBy: string, where: string) => `
  SELECT ${groupBy} AS g, u.i AS i, SUM(u.v) AS v
    FROM http_metrics m, unnest(m.hist) WITH ORDINALITY AS u(v, i)
   WHERE ${where}
   GROUP BY 1, 2`;

const collectHist = (rows: any[]): Map<string, number[]> => {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const key = String(row.g instanceof Date ? row.g.toISOString() : row.g);
    if (!map.has(key)) map.set(key, new Array(LATENCY_BUCKETS.length + 1).fill(0));
    map.get(key)![num(row.i) - 1] = num(row.v);
  }
  return map;
};

export const overview = async () => {
  const settings = await settingsService.get();

  // Прогноз по балансу: средний реальный расход за неделю по снимкам
  const balance = await queryOne<any>(
    `WITH s AS (SELECT at, balance, LAG(balance) OVER (ORDER BY at) AS prev FROM genapi_balance
                 WHERE at > now() - INTERVAL '8 days')
     SELECT (SELECT balance FROM genapi_balance ORDER BY at DESC LIMIT 1) AS current,
            (SELECT at FROM genapi_balance ORDER BY at DESC LIMIT 1) AS at,
            COALESCE(SUM(GREATEST(prev - balance, 0)) FILTER (WHERE at > now() - INTERVAL '7 days'), 0) AS spent7,
            COALESCE(SUM(GREATEST(prev - balance, 0)) FILTER (WHERE at > now() - INTERVAL '1 day'), 0) AS spent1,
            MIN(at) AS since
       FROM s WHERE prev IS NOT NULL`
  );

  const sinceDays = balance?.since ? Math.min(7, (Date.now() - new Date(balance.since).getTime()) / 86_400_000) : 0;
  const perDay = sinceDays >= 0.5 ? num(balance?.spent7) / sinceDays : null;

  const counts = await queryOne<any>(
    `SELECT
       (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND delivery_status <> 'completed') AS undelivered,
       (SELECT COUNT(*) FROM payments WHERE status = 'succeeded' AND delivery_status <> 'completed' AND delivery_attempts >= 5) AS exhausted,
       (SELECT COUNT(*) FROM brandbooks WHERE status = 'processing') AS building,
       (SELECT COUNT(*) FROM app_logs WHERE level = 'error' AND at > now() - INTERVAL '1 hour') AS errors1h,
       (SELECT COUNT(*) FROM app_logs WHERE level = 'error' AND at > now() - INTERVAL '24 hours') AS errors24h,
       (SELECT COUNT(*) FROM app_logs WHERE level = 'error' AND source = 'client' AND at > now() - INTERVAL '24 hours') AS client_errors24h,
       (SELECT COUNT(*) FROM genapi_calls WHERE NOT ok AND at > now() - INTERVAL '24 hours') AS genapi_failed24h,
       (SELECT COUNT(*) FROM genapi_calls WHERE at > now() - INTERVAL '24 hours') AS genapi_calls24h`
  );

  const alerts = await query(
    `SELECT at, message FROM app_logs WHERE level = 'error' AND message LIKE '[ALERT]%'
      ORDER BY at DESC LIMIT 15`
  );

  return {
    checks: lastCheckResults(),
    resources: await serverResources(),
    jobs: schedulerStatus(),
    runtime: {
      logoSlots: logoSlots.stats(),
      activeDeliveries: activeDeliveriesCount(),
      freePaused: settings.freePaused,
      budget: settings.dailyBudgetRub,
      spentToday: await spendRepo.todayTotal(FREE_SPEND_KINDS),
    },
    balance: {
      current: balance?.current !== null && balance?.current !== undefined ? num(balance.current) : null,
      at: balance?.at ?? null,
      spent24h: num(balance?.spent1),
      perDay,
      daysLeft: perDay && balance?.current ? num(balance.current) / perDay : null,
      alertBelow: settings.genapiBalanceAlertRub,
    },
    counts: {
      undelivered: num(counts?.undelivered),
      exhausted: num(counts?.exhausted),
      building: num(counts?.building),
      errors1h: num(counts?.errors1h),
      errors24h: num(counts?.errors24h),
      clientErrors24h: num(counts?.client_errors24h),
      genapiFailed24h: num(counts?.genapi_failed24h),
      genapiCalls24h: num(counts?.genapi_calls24h),
    },
    alerts: alerts.map((row) => ({ at: row.at, message: String(row.message).replace(/^\[ALERT\]\s*/, '') })),
  };
};

export const metrics = async (range: RangeKey) => {
  // Свежая минута ещё в памяти — сливаем, чтобы график доходил до «сейчас»
  await flushHttpMetrics();

  const { interval, bucket } = RANGES[range];
  const since = `minute > now() - INTERVAL '${interval}'`;
  const bin = `date_bin(INTERVAL '${bucket}', minute, TIMESTAMPTZ '2000-01-01')`;

  const [httpRows, httpHist, routeRows, routeHist, genapiRows, genapiSeries, errorSeries, delivery, steps] = await Promise.all([
    query(
      `SELECT ${bin} AS t, SUM(count) AS count, SUM(s4xx) AS s4xx, SUM(s5xx) AS s5xx, SUM(sum_ms) AS sum_ms
         FROM http_metrics WHERE ${since} GROUP BY 1 ORDER BY 1`
    ),
    query(histSql(bin, since)),
    query(
      `SELECT method || ' ' || route AS route, SUM(count) AS count, SUM(s4xx) AS s4xx, SUM(s5xx) AS s5xx,
              SUM(sum_ms) AS sum_ms, MAX(max_ms) AS max_ms
         FROM http_metrics WHERE ${since} GROUP BY 1 ORDER BY count DESC LIMIT 40`
    ),
    query(histSql(`m.method || ' ' || m.route`, since)),
    query(
      `SELECT model, label, COUNT(*) AS calls, COUNT(*) FILTER (WHERE NOT ok) AS failed,
              AVG(duration_ms) AS avg_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
              SUM(est_cost) AS cost,
              COUNT(*) FILTER (WHERE order_id IS NOT NULL) AS paid_calls
         FROM genapi_calls WHERE at > now() - INTERVAL '${interval}'
        GROUP BY 1, 2 ORDER BY calls DESC`
    ),
    query(
      `SELECT date_bin(INTERVAL '${bucket}', at, TIMESTAMPTZ '2000-01-01') AS t,
              COUNT(*) AS calls, COUNT(*) FILTER (WHERE NOT ok) AS failed, AVG(duration_ms) AS avg_ms
         FROM genapi_calls WHERE at > now() - INTERVAL '${interval}' GROUP BY 1 ORDER BY 1`
    ),
    query(
      `SELECT date_bin(INTERVAL '${bucket}', at, TIMESTAMPTZ '2000-01-01') AS t,
              COUNT(*) FILTER (WHERE level = 'error' AND source = 'server') AS server,
              COUNT(*) FILTER (WHERE level = 'error' AND source = 'client') AS client,
              COUNT(*) FILTER (WHERE level = 'warn') AS warn
         FROM app_logs WHERE at > now() - INTERVAL '${interval}' AND level IN ('error', 'warn') GROUP BY 1 ORDER BY 1`
    ),
    queryOne<any>(
      `SELECT COUNT(*) AS paid,
              COUNT(*) FILTER (WHERE delivery_status = 'completed') AS delivered,
              COUNT(*) FILTER (WHERE delivery_attempts > 1) AS retried,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM delivered_at - paid_at))
                FILTER (WHERE delivered_at IS NOT NULL AND product_type = 'logo') AS logo_median_s,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM delivered_at - paid_at))
                FILTER (WHERE delivered_at IS NOT NULL AND product_type = 'brandbook') AS brandbook_median_s,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM delivered_at - paid_at))
                FILTER (WHERE delivered_at IS NOT NULL AND product_type = 'brandbook') AS brandbook_p95_s
         FROM payments WHERE status = 'succeeded' AND paid_at > now() - INTERVAL '${interval}'`
    ),
    query(
      `SELECT s->>'label' AS label,
              COUNT(*) FILTER (WHERE s->>'state' = 'failed') AS failed,
              COUNT(*) FILTER (WHERE s->>'state' = 'skipped') AS skipped,
              COUNT(*) AS total
         FROM brandbooks b, jsonb_array_elements(b.build_steps) s
        WHERE b.created_at > now() - INTERVAL '${interval}'
        GROUP BY 1 ORDER BY failed DESC, label`
    ),
  ]);

  const histByTime = collectHist(httpHist);
  const histByRoute = collectHist(routeHist);
  const iso = (value: any) => (value instanceof Date ? value.toISOString() : String(value));

  return {
    range,
    bucket,
    http: httpRows.map((row) => {
      const hist = histByTime.get(iso(row.t)) ?? [];
      return {
        t: iso(row.t),
        count: num(row.count),
        s4xx: num(row.s4xx),
        s5xx: num(row.s5xx),
        avgMs: num(row.count) ? num(row.sum_ms) / num(row.count) : 0,
        p95Ms: percentileFromHist(hist, 0.95),
      };
    }),
    routes: routeRows.map((row) => {
      const hist = histByRoute.get(row.route) ?? [];
      return {
        route: row.route,
        count: num(row.count),
        s4xx: num(row.s4xx),
        s5xx: num(row.s5xx),
        avgMs: num(row.count) ? num(row.sum_ms) / num(row.count) : 0,
        p50Ms: percentileFromHist(hist, 0.5),
        p95Ms: percentileFromHist(hist, 0.95),
        maxMs: num(row.max_ms),
      };
    }),
    genapi: genapiRows.map((row) => ({
      model: row.model,
      label: row.label,
      calls: num(row.calls),
      failed: num(row.failed),
      avgMs: num(row.avg_ms),
      p95Ms: num(row.p95_ms),
      cost: num(row.cost),
      paidCalls: num(row.paid_calls),
    })),
    genapiSeries: genapiSeries.map((row) => ({ t: iso(row.t), calls: num(row.calls), failed: num(row.failed), avgMs: num(row.avg_ms) })),
    errors: errorSeries.map((row) => ({ t: iso(row.t), server: num(row.server), client: num(row.client), warn: num(row.warn) })),
    delivery: {
      paid: num(delivery?.paid),
      delivered: num(delivery?.delivered),
      retried: num(delivery?.retried),
      logoMedianS: delivery?.logo_median_s ?? null,
      brandbookMedianS: delivery?.brandbook_median_s ?? null,
      brandbookP95S: delivery?.brandbook_p95_s ?? null,
    },
    buildSteps: steps.map((row) => ({ label: row.label, failed: num(row.failed), skipped: num(row.skipped), total: num(row.total) })),
  };
};

export interface LogQuery {
  levels: string[];
  source?: string;
  q?: string;
  requestId?: string;
  before?: number;
  limit?: number;
}

export const logs = async (params: LogQuery) => {
  await flushLogs();

  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  const levels = params.levels.filter((level) => ['info', 'warn', 'error'].includes(level));
  if (levels.length) add('level = ANY(?)', levels);
  if (params.source === 'server' || params.source === 'client') add('source = ?', params.source);
  if (params.q?.trim()) add('message ILIKE ?', `%${params.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (params.requestId?.trim()) add('request_id = ?', params.requestId.trim());
  if (params.before) add('id < ?', params.before);

  const limit = Math.min(Math.max(params.limit || 100, 20), 500);
  const rows = await query(
    `SELECT id, at, level, source, message, request_id, context FROM app_logs
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY id DESC LIMIT ${limit}`,
    values
  );

  return {
    rows: rows.map((row) => ({
      id: Number(row.id),
      at: row.at,
      level: row.level,
      source: row.source,
      message: row.message,
      requestId: row.request_id,
      context: row.context,
    })),
    hasMore: rows.length === limit,
  };
};
