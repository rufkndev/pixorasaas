// Аналитика под нашу модель: бесплатная квота → покупка логотипа или брендбука.
// Главный вопрос, на который она отвечает, — окупает ли продажа бесплатное.
// Даты — календарные дни по Москве, обе границы включительно.

import { query, queryOne } from '../db/pool';
import { FREE_GENERATIONS } from '../db/repositories';
import { PRODUCTS } from '../services/orderService';
import { settingsService } from '../services/settingsService';

const MSK = `'Europe/Moscow'`;

// $1 и $2 — даты начала и конца периода
const inRange = (col: string) =>
  `${col} >= ($1::date::timestamp AT TIME ZONE ${MSK}) AND ${col} < (($2::date + 1)::timestamp AT TIME ZONE ${MSK})`;

const dayOf = (col: string) => `(${col} AT TIME ZONE ${MSK})::date`;

const PAID = `p.status = 'succeeded'`;

// Неоплаченные логотипы удаляются через 90 дней, а событий до этой версии нет.
// Поэтому число генераций — большее из двух источников, и для старых периодов оно
// занижено. Посчитано по пользователю, чтобы не сложить одно и то же дважды
const perUserGenerations = (table: 'generated_logos' | 'generated_names', event: string) => `
  SELECT COALESCE(t.user_id, e.user_id) AS user_id,
         GREATEST(COALESCE(t.n, 0), COALESCE(e.n, 0)) AS n
    FROM (SELECT user_id, COUNT(*) AS n FROM ${table} WHERE ${inRange('created_at')} GROUP BY 1) t
    FULL JOIN (SELECT user_id, COUNT(*) AS n FROM app_events
                WHERE name = '${event}' AND user_id IS NOT NULL AND ${inRange('at')} GROUP BY 1) e
      ON e.user_id = t.user_id`;

const num = (value: unknown): number => Number(value ?? 0) || 0;
const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

const shiftDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;

const totals = async (from: string, to: string) => {
  const row = await queryOne<any>(
    `WITH paid AS (SELECT * FROM payments p WHERE ${PAID} AND ${inRange('p.paid_at')}),
          logos AS (${perUserGenerations('generated_logos', 'logo_generated')}),
          names AS (${perUserGenerations('generated_names', 'names_generated')}),
          active AS (SELECT user_id FROM logos UNION SELECT user_id FROM names)
     SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM paid) AS revenue,
       (SELECT COUNT(*) FROM paid) AS orders,
       (SELECT COUNT(*) FROM paid WHERE product_type = 'logo') AS logo_orders,
       (SELECT COUNT(*) FROM paid WHERE product_type = 'brandbook') AS brandbook_orders,
       (SELECT COUNT(DISTINCT user_id) FROM paid) AS payers,
       (SELECT COALESCE(SUM(refunded_amount), 0) FROM payments WHERE refunded_at IS NOT NULL AND ${inRange('refunded_at')}) AS refunds,
       (SELECT COUNT(*) FROM payments WHERE refunded_at IS NOT NULL AND ${inRange('refunded_at')}) AS refund_count,
       (SELECT COUNT(*) FROM users WHERE ${inRange('created_at')}) AS registrations,
       (SELECT COUNT(*) FROM users WHERE ${inRange('created_at')} AND email_verified_at IS NOT NULL) AS verified,
       (SELECT COALESCE(SUM(n), 0) FROM logos) AS logos_generated,
       (SELECT COALESCE(SUM(n), 0) FROM names) AS names_generated,
       (SELECT COUNT(*) FROM active) AS active_users,
       (SELECT COUNT(*) FROM active a WHERE EXISTS (
          SELECT 1 FROM payments p WHERE p.user_id = a.user_id AND ${PAID}
            AND p.paid_at >= ($1::date::timestamp AT TIME ZONE ${MSK}))) AS active_payers,
       (SELECT COALESCE(SUM(est_cost), 0) FROM genapi_calls WHERE ${inRange('at')}) AS genapi_total,
       (SELECT COALESCE(SUM(est_cost), 0) FROM genapi_calls WHERE order_id IS NULL AND ${inRange('at')}) AS genapi_free,
       (SELECT COALESCE(SUM(est_cost), 0) FROM genapi_calls WHERE order_id IS NOT NULL AND ${inRange('at')}) AS genapi_paid,
       (SELECT COUNT(*) FROM genapi_calls WHERE ${inRange('at')}) AS genapi_calls,
       (SELECT COALESCE(SUM(amount), 0) FROM genapi_spend WHERE day BETWEEN $1::date AND $2::date) AS legacy_free_estimate,
       (SELECT COALESCE(SUM(count), 0) FROM traffic_daily WHERE metric = 'session' AND day BETWEEN $1::date AND $2::date) AS sessions`,
    [from, to]
  );

  const real = await queryOne<any>(
    `SELECT COALESCE(SUM(GREATEST(prev - balance, 0)), 0) AS spent,
            COALESCE(SUM(GREATEST(balance - prev, 0)), 0) AS topups,
            MIN(at) AS since
       FROM (SELECT at, balance, LAG(balance) OVER (ORDER BY at) AS prev FROM genapi_balance) s
      WHERE prev IS NOT NULL AND ${inRange('at')}`,
    [from, to]
  );

  return {
    revenue: num(row.revenue),
    refunds: num(row.refunds),
    refundCount: num(row.refund_count),
    orders: num(row.orders),
    logoOrders: num(row.logo_orders),
    brandbookOrders: num(row.brandbook_orders),
    payers: num(row.payers),
    registrations: num(row.registrations),
    verified: num(row.verified),
    logosGenerated: num(row.logos_generated),
    namesGenerated: num(row.names_generated),
    activeUsers: num(row.active_users),
    activePayers: num(row.active_payers),
    genapiTotal: num(row.genapi_total),
    genapiFree: num(row.genapi_free),
    genapiPaid: num(row.genapi_paid),
    genapiCalls: num(row.genapi_calls),
    legacyFreeEstimate: num(row.legacy_free_estimate),
    genapiRealSpent: num(real?.spent),
    genapiTopups: num(real?.topups),
    genapiRealSince: real?.since ?? null,
    sessions: num(row.sessions),
  };
};

type Totals = Awaited<ReturnType<typeof totals>>;

// Деньги после всех вычетов. Комиссия и налог считаются от выручки по ставкам из
// настроек: в коде их нет, и без них прибыль выглядела бы на 10 % лучше
const economics = (t: Totals, days: number, s: Awaited<ReturnType<typeof settingsService.get>>) => {
  const netRevenue = t.revenue - t.refunds;
  const fees = (t.revenue * s.yookassaFeePct) / 100;
  const tax = (netRevenue * s.taxPct) / 100;
  const fixed = (s.monthlyFixedRub * days) / 30.4;
  const grossProfit = netRevenue - fees - tax - t.genapiTotal;
  const profit = grossProfit - fixed;

  // Пока учёт вызовов только начался, а смета бесплатного уже есть — берём большее
  const freeCost = Math.max(t.genapiFree, t.legacyFreeEstimate);
  const costPerFreeUser = ratio(freeCost, t.activeUsers);
  const aov = ratio(t.revenue, t.orders);
  const orderCost = ratio(t.genapiPaid, t.orders) ?? 0;
  const marginPerOrder =
    aov !== null ? aov * (1 - s.yookassaFeePct / 100 - s.taxPct / 100) - orderCost : null;
  const breakEvenConversion =
    costPerFreeUser !== null && marginPerOrder ? costPerFreeUser / marginPerOrder : null;
  const conversion = ratio(t.activePayers, t.activeUsers);

  return {
    netRevenue,
    fees,
    tax,
    fixed,
    grossProfit,
    profit,
    freeCost,
    costPerFreeUser,
    aov,
    orderCost,
    marginPerOrder,
    breakEvenConversion,
    conversion,
    // Сколько бесплатных пользователей окупает один заказ
    freeUsersPerOrder: costPerFreeUser && marginPerOrder ? marginPerOrder / costPerFreeUser : null,
    arpu: ratio(netRevenue, t.registrations),
    // Тратим на GenAPI на рубль выручки
    genapiShare: ratio(t.genapiTotal, t.revenue),
  };
};

const series = async (from: string, to: string) =>
  (
    await query(
      `WITH days AS (SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS day),
            rev AS (SELECT ${dayOf('paid_at')} AS d, SUM(amount) AS revenue, COUNT(*) AS orders,
                           COUNT(*) FILTER (WHERE product_type = 'brandbook') AS brandbooks
                      FROM payments p WHERE ${PAID} AND ${inRange('paid_at')} GROUP BY 1),
            reg AS (SELECT ${dayOf('created_at')} AS d, COUNT(*) AS n FROM users WHERE ${inRange('created_at')} GROUP BY 1),
            lt AS (SELECT ${dayOf('created_at')} AS d, COUNT(*) AS n FROM generated_logos WHERE ${inRange('created_at')} GROUP BY 1),
            le AS (SELECT ${dayOf('at')} AS d, COUNT(*) AS n FROM app_events WHERE name = 'logo_generated' AND ${inRange('at')} GROUP BY 1),
            nt AS (SELECT ${dayOf('created_at')} AS d, COUNT(*) AS n FROM generated_names WHERE ${inRange('created_at')} GROUP BY 1),
            ne AS (SELECT ${dayOf('at')} AS d, COUNT(*) AS n FROM app_events WHERE name = 'names_generated' AND ${inRange('at')} GROUP BY 1),
            gc AS (SELECT ${dayOf('at')} AS d, SUM(est_cost) AS cost FROM genapi_calls WHERE ${inRange('at')} GROUP BY 1),
            tr AS (SELECT day AS d, SUM(count) AS n FROM traffic_daily WHERE metric = 'session' AND day BETWEEN $1::date AND $2::date GROUP BY 1)
       SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
              COALESCE(rev.revenue, 0) AS revenue,
              COALESCE(rev.orders, 0) AS orders,
              COALESCE(rev.brandbooks, 0) AS brandbooks,
              COALESCE(reg.n, 0) AS registrations,
              GREATEST(COALESCE(lt.n, 0), COALESCE(le.n, 0)) AS logos,
              GREATEST(COALESCE(nt.n, 0), COALESCE(ne.n, 0)) AS names,
              COALESCE(gc.cost, 0) AS genapi,
              COALESCE(tr.n, 0) AS sessions
         FROM days
         LEFT JOIN rev ON rev.d = days.day
         LEFT JOIN reg ON reg.d = days.day
         LEFT JOIN lt ON lt.d = days.day
         LEFT JOIN le ON le.d = days.day
         LEFT JOIN nt ON nt.d = days.day
         LEFT JOIN ne ON ne.d = days.day
         LEFT JOIN gc ON gc.d = days.day
         LEFT JOIN tr ON tr.d = days.day
        ORDER BY days.day`,
      [from, to]
    )
  ).map((row) => ({
    day: row.day,
    revenue: num(row.revenue),
    orders: num(row.orders),
    brandbooks: num(row.brandbooks),
    registrations: num(row.registrations),
    logos: num(row.logos),
    names: num(row.names),
    genapi: num(row.genapi),
    sessions: num(row.sessions),
  }));

const hasGeneration = (user: string) => `(
  EXISTS (SELECT 1 FROM generated_logos l WHERE l.user_id = ${user})
  OR EXISTS (SELECT 1 FROM app_events e WHERE e.user_id = ${user} AND e.name = 'logo_generated'))`;

// Когорта — зарегистрированные в периоде. Шаги считаются за всё время после регистрации
const funnel = async (from: string, to: string) => {
  const row = await queryOne<any>(
    `SELECT
       COUNT(*) AS registered,
       COUNT(*) FILTER (WHERE u.email_verified_at IS NOT NULL) AS verified,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM generated_names n WHERE n.user_id = u.id)
                           OR EXISTS (SELECT 1 FROM app_events e WHERE e.user_id = u.id AND e.name = 'names_generated')) AS named,
       COUNT(*) FILTER (WHERE ${hasGeneration('u.id')}) AS logo,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM app_events e WHERE e.user_id = u.id AND e.name = 'brandbook_preview_view')) AS preview,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id)) AS checkout,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID})) AS paid,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID} AND p.product_type = 'brandbook')) AS brandbook,
       COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM payments p WHERE p.user_id = u.id AND ${PAID}) >= 2) AS repeat
     FROM users u WHERE ${inRange('u.created_at')}`,
    [from, to]
  );

  return {
    steps: [
      { key: 'registered', label: 'Зарегистрировались', value: num(row.registered) },
      { key: 'verified', label: 'Подтвердили почту', value: num(row.verified) },
      { key: 'logo', label: 'Сгенерировали логотип', value: num(row.logo) },
      { key: 'checkout', label: 'Перешли к оплате', value: num(row.checkout) },
      { key: 'paid', label: 'Оплатили', value: num(row.paid) },
      { key: 'repeat', label: 'Купили повторно', value: num(row.repeat) },
    ],
    side: [
      { key: 'named', label: 'Генерировали названия', value: num(row.named) },
      { key: 'preview', label: 'Смотрели предпросмотр брендбука', value: num(row.preview) },
      { key: 'brandbook', label: 'Купили брендбук', value: num(row.brandbook) },
    ],
  };
};

const sources = async (from: string, to: string) => {
  const rows = await query(
    `WITH s AS (SELECT dim AS source, SUM(count) AS sessions FROM traffic_daily
                 WHERE metric = 'session' AND day BETWEEN $1::date AND $2::date GROUP BY 1),
          r AS (SELECT COALESCE(NULLIF(lower(u.signup_source->>'source'), ''), 'неизвестно') AS source,
                       COUNT(*) AS registrations,
                       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID})) AS payers,
                       COALESCE(SUM((SELECT SUM(p.amount - p.refunded_amount) FROM payments p WHERE p.user_id = u.id AND ${PAID})), 0) AS revenue
                  FROM users u WHERE ${inRange('u.created_at')} GROUP BY 1)
     SELECT COALESCE(s.source, r.source) AS source,
            COALESCE(s.sessions, 0) AS sessions,
            COALESCE(r.registrations, 0) AS registrations,
            COALESCE(r.payers, 0) AS payers,
            COALESCE(r.revenue, 0) AS revenue
       FROM s FULL JOIN r ON r.source = s.source
      ORDER BY revenue DESC, registrations DESC, sessions DESC
      LIMIT 30`,
    [from, to]
  );

  const pages = await query(
    `SELECT dim AS path, SUM(count) AS views FROM traffic_daily
      WHERE metric = 'pageview' AND day BETWEEN $1::date AND $2::date
      GROUP BY 1 ORDER BY views DESC LIMIT 15`,
    [from, to]
  );

  return {
    sources: rows.map((row) => ({
      source: row.source,
      sessions: num(row.sessions),
      registrations: num(row.registrations),
      payers: num(row.payers),
      revenue: num(row.revenue),
    })),
    pages: pages.map((row) => ({ path: row.path, views: num(row.views) })),
  };
};

// Сколько генераций делают и при каком числе покупают: прямой ответ, не велика
// ли квота и не мала ли
const quota = async (from: string, to: string) => {
  const distribution = async (table: 'generated_logos' | 'generated_names', event: string) =>
    (
      await query(
        `WITH per AS (${perUserGenerations(table, event)})
         SELECT LEAST(n, ${FREE_GENERATIONS + 1}) AS bucket, COUNT(*) AS users,
                COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = per.user_id AND ${PAID})) AS payers
           FROM per GROUP BY 1 ORDER BY 1`,
        [from, to]
      )
    ).map((row) => ({ bucket: num(row.bucket), users: num(row.users), payers: num(row.payers) }));

  const refusals = await query(
    `SELECT props->>'code' AS code, props->>'kind' AS kind, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
       FROM app_events WHERE name = 'generation_refused' AND ${inRange('at')}
      GROUP BY 1, 2 ORDER BY events DESC`,
    [from, to]
  );

  const wall = await queryOne<any>(
    `WITH hit AS (SELECT user_id, MIN(at) AS first_at FROM app_events
                   WHERE name = 'generation_refused' AND props->>'code' = 'GENERATION_LIMIT' AND ${inRange('at')}
                   GROUP BY 1)
     SELECT COUNT(*) AS users,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = hit.user_id AND ${PAID} AND p.paid_at > hit.first_at)) AS paid_after
       FROM hit`,
    [from, to]
  );

  const firstPurchase = await queryOne<any>(
    `WITH first AS (SELECT user_id, MIN(paid_at) AS paid_at FROM payments p
                     WHERE ${PAID} AND user_id IS NOT NULL GROUP BY 1),
          b AS (SELECT f.user_id, f.paid_at, u.created_at FROM first f JOIN users u ON u.id = f.user_id
                 WHERE ${inRange('f.paid_at')})
     SELECT COUNT(*) AS buyers,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM b.paid_at - b.created_at) / 3600) AS median_hours,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY (SELECT COUNT(*) FROM generated_logos l
                                                         WHERE l.user_id = b.user_id AND l.created_at <= b.paid_at)) AS median_logos,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY (SELECT COUNT(*) FROM generated_names n
                                                         WHERE n.user_id = b.user_id AND n.created_at <= b.paid_at)) AS median_names,
            COUNT(*) FILTER (WHERE b.paid_at - b.created_at < INTERVAL '1 day') AS same_day
       FROM b`,
    [from, to]
  );

  return {
    limit: FREE_GENERATIONS,
    logos: await distribution('generated_logos', 'logo_generated'),
    names: await distribution('generated_names', 'names_generated'),
    refusals: refusals.map((row) => ({ code: row.code, kind: row.kind, events: num(row.events), users: num(row.users) })),
    wall: { users: num(wall?.users), paidAfter: num(wall?.paid_after) },
    firstPurchase: {
      buyers: num(firstPurchase?.buyers),
      medianHours: firstPurchase?.median_hours !== null ? num(firstPurchase?.median_hours) : null,
      medianLogos: firstPurchase?.median_logos !== null ? num(firstPurchase?.median_logos) : null,
      medianNames: firstPurchase?.median_names !== null ? num(firstPurchase?.median_names) : null,
      sameDay: num(firstPurchase?.same_day),
    },
  };
};

const products = async (from: string, to: string) => {
  const upsell = await queryOne<any>(
    `WITH lb AS (SELECT user_id, MIN(paid_at) AS at FROM payments p
                  WHERE ${PAID} AND product_type = 'logo' AND user_id IS NOT NULL GROUP BY 1)
     SELECT COUNT(*) AS logo_buyers,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = lb.user_id AND ${PAID}
                                             AND p.product_type = 'brandbook' AND p.paid_at > lb.at)) AS upgraded
       FROM lb WHERE ${inRange('lb.at')}`,
    [from, to]
  );

  const checkout = await queryOne<any>(
    `SELECT COUNT(*) AS created,
            COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
            COUNT(*) FILTER (WHERE status = 'canceled') AS canceled,
            COUNT(*) FILTER (WHERE status IN ('pending', 'waiting_for_capture')) AS pending
       FROM payments WHERE ${inRange('created_at')}`,
    [from, to]
  );

  // Ушли с формы оплаты и так и не купили. Согласие на рассылку показано, потому
  // что написать без него нельзя
  const abandoned = await query(
    `SELECT * FROM (
       SELECT DISTINCT ON (p.user_id) p.order_id, p.user_id, u.email, p.product_type, p.amount, p.status, p.created_at,
              p.product_data->>'name' AS brand,
              EXISTS (SELECT 1 FROM user_consents c WHERE c.user_id = p.user_id AND c.kind = 'marketing' AND c.revoked_at IS NULL) AS marketing
         FROM payments p JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
        WHERE ${inRange('p.created_at')} AND p.status <> 'succeeded'
          AND NOT EXISTS (SELECT 1 FROM payments q WHERE q.user_id = p.user_id AND q.status = 'succeeded' AND q.created_at >= p.created_at)
        ORDER BY p.user_id, p.created_at DESC) t
      ORDER BY created_at DESC LIMIT 50`,
    [from, to]
  );

  return {
    prices: { logo: PRODUCTS.logo.price, brandbook: PRODUCTS.brandbook.price },
    upsell: { logoBuyers: num(upsell?.logo_buyers), upgraded: num(upsell?.upgraded) },
    checkout: {
      created: num(checkout?.created),
      succeeded: num(checkout?.succeeded),
      canceled: num(checkout?.canceled),
      pending: num(checkout?.pending),
    },
    abandoned: abandoned.map((row) => ({
      orderId: row.order_id,
      userId: row.user_id,
      email: row.email,
      brand: row.brand,
      product: row.product_type,
      amount: num(row.amount),
      status: row.status,
      createdAt: row.created_at,
      marketing: Boolean(row.marketing),
    })),
  };
};

// Какие стили, приёмы и ниши покупают. Для периодов старше 90 дней конверсия
// завышена: неоплаченные логотипы к этому времени удалены
const segments = async (from: string, to: string) => {
  const by = async (column: string, limit: number) =>
    (
      await query(
        `SELECT COALESCE(NULLIF(${column}, ''), '—') AS key, COUNT(*) AS generated, COUNT(*) FILTER (WHERE is_paid) AS paid
           FROM generated_logos WHERE ${inRange('created_at')}
          GROUP BY 1 ORDER BY generated DESC LIMIT ${limit}`,
        [from, to]
      )
    ).map((row) => ({ key: row.key, generated: num(row.generated), paid: num(row.paid) }));

  return {
    styles: await by('style', 10),
    patterns: await by('pattern', 15),
    industries: await by('lower(industry)', 15),
  };
};

const cohorts = async (from: string, to: string) =>
  (
    await query(
      `SELECT to_char(date_trunc('week', u.created_at AT TIME ZONE ${MSK}), 'YYYY-MM-DD') AS week,
              COUNT(*) AS registered,
              COUNT(*) FILTER (WHERE ${hasGeneration('u.id')}) AS activated,
              COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM generated_logos l WHERE l.user_id = u.id AND l.created_at > u.created_at + INTERVAL '1 day')
                                  OR EXISTS (SELECT 1 FROM app_events e WHERE e.user_id = u.id AND e.at > u.created_at + INTERVAL '1 day')) AS returned,
              COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID} AND p.paid_at <= u.created_at + INTERVAL '7 days')) AS paid7,
              COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID} AND p.paid_at <= u.created_at + INTERVAL '30 days')) AS paid30,
              COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND ${PAID})) AS paid_any,
              COALESCE(SUM((SELECT SUM(p.amount - p.refunded_amount) FROM payments p WHERE p.user_id = u.id AND ${PAID})), 0) AS revenue
         FROM users u WHERE ${inRange('u.created_at')}
        GROUP BY 1 ORDER BY 1`,
      [from, to]
    )
  ).map((row) => ({
    week: row.week,
    registered: num(row.registered),
    activated: num(row.activated),
    returned: num(row.returned),
    paid7: num(row.paid7),
    paid30: num(row.paid30),
    paidAny: num(row.paid_any),
    revenue: num(row.revenue),
  }));

// Выводы словами: цифры без вывода в админке обычно никто не читает
const insights = (t: Totals, e: ReturnType<typeof economics>, q: Awaited<ReturnType<typeof quota>>, p: Awaited<ReturnType<typeof products>>) => {
  const list: Array<{ tone: 'ok' | 'warn' | 'fail' | 'info'; text: string }> = [];
  const pct = (v: number) => `${(v * 100).toFixed(1)} %`;

  if (e.conversion !== null && e.breakEvenConversion !== null) {
    list.push(
      e.conversion >= e.breakEvenConversion
        ? { tone: 'ok', text: `Бесплатное окупается: конверсия активных в покупку ${pct(e.conversion)} при пороге ${pct(e.breakEvenConversion)}.` }
        : {
            tone: 'fail',
            text: `Бесплатное не окупается: конверсия ${pct(e.conversion)} ниже порога ${pct(e.breakEvenConversion)}. Рычаги — квота, окно или цена.`,
          }
    );
  }

  if (q.wall.users >= 5) {
    const share = q.wall.paidAfter / q.wall.users;
    list.push({
      tone: share >= 0.1 ? 'ok' : 'warn',
      text: `${q.wall.users} чел. упёрлись в лимит, из них ${pct(share)} потом купили.${share < 0.1 ? ' Стена квоты почти не продаёт — возможно, квота избыточна.' : ''}`,
    });
  }

  if (p.checkout.created >= 5) {
    const lost = 1 - p.checkout.succeeded / p.checkout.created;
    if (lost > 0.5) {
      list.push({ tone: 'warn', text: `${pct(lost)} начатых оплат не завершены. Список ушедших — ниже, им можно написать, если есть согласие на рассылку.` });
    }
  }

  if (p.upsell.logoBuyers >= 5) {
    list.push({
      tone: 'info',
      text: `Докупили брендбук после логотипа: ${pct(p.upsell.upgraded / p.upsell.logoBuyers)} покупателей логотипа.`,
    });
  }

  if (e.genapiShare !== null && e.genapiShare > 0.3) {
    list.push({ tone: 'warn', text: `На GenAPI уходит ${pct(e.genapiShare)} выручки.` });
  }

  if (t.genapiRealSpent > 0 && t.genapiTotal > 0) {
    const drift = t.genapiRealSpent / t.genapiTotal;
    if (drift > 1.3 || drift < 0.7) {
      list.push({
        tone: 'warn',
        text: `Реальное списание GenAPI (${Math.round(t.genapiRealSpent)} ₽) расходится со сметой (${Math.round(t.genapiTotal)} ₽) в ${drift.toFixed(1)} раза — поправьте MODEL_COST_RUB.`,
      });
    }
  }

  return list;
};

export const buildAnalytics = async (from: string, to: string) => {
  const days = daysBetween(from, to);
  const prevTo = shiftDays(from, -1);
  const prevFrom = shiftDays(prevTo, -(days - 1));
  const settings = await settingsService.get();

  const [current, previous, daily, funnelData, traffic, quotaData, productData, segmentData, cohortData] =
    await Promise.all([
      totals(from, to),
      totals(prevFrom, prevTo),
      series(from, to),
      funnel(from, to),
      sources(from, to),
      quota(from, to),
      products(from, to),
      segments(from, to),
      cohorts(from, to),
    ]);

  const econ = economics(current, days, settings);
  const prevEcon = economics(previous, days, settings);

  return {
    period: { from, to, days, prevFrom, prevTo },
    settings: {
      yookassaFeePct: settings.yookassaFeePct,
      taxPct: settings.taxPct,
      monthlyFixedRub: settings.monthlyFixedRub,
    },
    totals: current,
    previous,
    economics: econ,
    previousEconomics: prevEcon,
    insights: insights(current, econ, quotaData, productData),
    series: daily,
    funnel: funnelData,
    traffic,
    quota: quotaData,
    products: productData,
    segments: segmentData,
    cohorts: cohortData,
  };
};

export const firstDataDay = async (): Promise<string> => {
  const row = await queryOne<{ day: string }>(
    `SELECT to_char((MIN(created_at) AT TIME ZONE ${MSK})::date, 'YYYY-MM-DD') AS day FROM users`
  );
  return row?.day ?? new Date().toISOString().slice(0, 10);
};
