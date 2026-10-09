"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiJson } from '../../lib/authClient';
import {
  Badge,
  Card,
  ErrorBox,
  fmtDate,
  fmtDuration,
  fmtMoney,
  fmtNumber,
  fmtPct,
  Hint,
  Segmented,
  Spinner,
  Stat,
  Table,
  Td,
  Th,
} from '../../components/admin/ui';
import { BarList, Funnel, SERIES_COLORS, TimeChart } from '../../components/admin/charts';

type Preset = '7' | '30' | '90' | '365' | 'all' | 'custom';

const REFUSAL_LABELS: Record<string, string> = {
  GENERATION_LIMIT: 'Кончилась квота',
  IP_LIMIT: 'Лимит на адрес',
  FREE_PAUSED: 'Бесплатное на паузе',
  BUSY: 'Очередь переполнена',
  BLOCKED: 'Адрес в блок-листе',
};

const dayLabel = (value: string) => {
  const [, month, day] = value.split('-');
  return `${day}.${month}`;
};

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const change = (current: number, previous: number): number | null =>
  previous > 0 ? (current - previous) / previous : current > 0 ? null : 0;

// Голубая заливка по доле: насыщеннее — больше
const heat = (share: number | null) =>
  share === null ? undefined : { background: `rgba(42, 120, 214, ${Math.min(0.08 + share * 1.2, 0.75)})`, color: share > 0.45 ? '#fff' : undefined };

const Row = ({ label, value, strong, muted, sign }: { label: string; value: number; strong?: boolean; muted?: boolean; sign?: '-' | '+' }) => (
  <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'border-t border-gray-200 pt-2 font-semibold' : ''} ${muted ? 'text-gray-500' : 'text-gray-800'}`}>
    <span>{label}</span>
    <span className={`tabular-nums ${value < 0 && strong ? 'text-red-700' : ''}`}>
      {sign === '-' && value > 0 ? '− ' : ''}
      {fmtMoney(Math.abs(value))}
    </span>
  </div>
);

function Analytics() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preset = (searchParams.get('p') as Preset) || '30';
  const [customFrom, setCustomFrom] = useState(searchParams.get('from') || shift(today(), -29));
  const [customTo, setCustomTo] = useState(searchParams.get('to') || today());
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const query =
    preset === 'all'
      ? 'from=all'
      : preset === 'custom'
        ? `from=${searchParams.get('from') || customFrom}&to=${searchParams.get('to') || customTo}`
        : `from=${shift(today(), -(Number(preset) - 1))}&to=${today()}`;

  const load = useCallback(() => {
    setLoading(true);
    apiJson(`/api/admin/analytics?${query}`)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(load, [load]);

  const setPreset = (value: Preset) =>
    router.push(value === 'custom' ? `/admin/analytics?p=custom&from=${customFrom}&to=${customTo}` : `/admin/analytics?p=${value}`);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-gray-900">Аналитика</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Preset>
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 дней' },
            { value: '30', label: '30 дней' },
            { value: '90', label: '90 дней' },
            { value: '365', label: 'Год' },
            { value: 'all', label: 'Всё время' },
            { value: 'custom', label: 'Период' },
          ]}
        />
        {preset === 'custom' && (
          <form
            className="flex items-center gap-1 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(`/admin/analytics?p=custom&from=${customFrom}&to=${customTo}`);
            }}
          >
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-sm" />
            —
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-sm" />
            <button type="submit" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
              Показать
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (error && !data) return <div className="space-y-4">{header}<ErrorBox message={error} onRetry={load} /></div>;
  if (!data) return <div className="space-y-4">{header}<Spinner /></div>;

  const t = data.totals;
  const prev = data.previous;
  const e = data.economics;
  const pe = data.previousEconomics;
  const q = data.quota;
  const p = data.products;

  return (
    <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
      {header}
      <p className="-mt-3 text-sm text-gray-500">
        {fmtDate(data.period.from, false)} — {fmtDate(data.period.to, false)} ({data.period.days} дн.), сравнение с {fmtDate(data.period.prevFrom, false)} —{' '}
        {fmtDate(data.period.prevTo, false)}. Даты по Москве.
      </p>

      {data.insights.length > 0 && (
        <Card title="Выводы">
          <ul className="space-y-2">
            {data.insights.map((item: any, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0">
                  <Badge tone={item.tone}>{item.tone === 'ok' ? 'хорошо' : item.tone === 'fail' ? 'плохо' : item.tone === 'warn' ? 'внимание' : 'факт'}</Badge>
                </span>
                <span className="text-gray-800">{item.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Выручка за вычетом возвратов" value={fmtMoney(e.netRevenue)} delta={change(e.netRevenue, pe.netRevenue)} />
        <Stat label="Прибыль" value={fmtMoney(e.profit)} delta={change(e.profit, pe.profit)} hint="после комиссии, налога, GenAPI и постоянных" tone={e.profit < 0 ? 'fail' : undefined} />
        <Stat label="Заказов" value={fmtNumber(t.orders)} delta={change(t.orders, prev.orders)} hint={`логотипов ${t.logoOrders}, брендбуков ${t.brandbookOrders}`} />
        <Stat label="Средний чек" value={fmtMoney(e.aov)} delta={e.aov && pe.aov ? change(e.aov, pe.aov) : null} />
        <Stat label="Регистраций" value={fmtNumber(t.registrations)} delta={change(t.registrations, prev.registrations)} hint={`подтвердили почту ${fmtPct(t.registrations ? t.verified / t.registrations : null, 0)}`} />
        <Stat label="Посещений" value={fmtNumber(t.sessions)} delta={change(t.sessions, prev.sessions)} hint={`в регистрацию ${fmtPct(t.sessions ? t.registrations / t.sessions : null)}`} />
        <Stat
          label="Конверсия активных в покупку"
          value={fmtPct(e.conversion)}
          hint={`порог окупаемости ${fmtPct(e.breakEvenConversion)}`}
          tone={e.conversion !== null && e.breakEvenConversion !== null && e.conversion < e.breakEvenConversion ? 'fail' : undefined}
        />
        <Stat label="GenAPI по смете" value={fmtMoney(t.genapiTotal)} delta={change(t.genapiTotal, prev.genapiTotal)} deltaGoodWhenUp={false} hint={`${fmtPct(e.genapiShare)} выручки`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title="Юнит-экономика" action={<Link href="/admin/settings" className="text-xs text-sky-700 hover:underline">ставки →</Link>}>
          <Row label="Выручка" value={t.revenue} />
          <Row label="Возвраты" value={t.refunds} sign="-" muted={!t.refunds} />
          <Row label={`Комиссия ЮKassa (${data.settings.yookassaFeePct} %)`} value={e.fees} sign="-" />
          <Row label={`Налог (${data.settings.taxPct} %)`} value={e.tax} sign="-" />
          <Row label="GenAPI на бесплатные генерации" value={t.genapiFree} sign="-" />
          <Row label="GenAPI на выдачу заказов" value={t.genapiPaid} sign="-" />
          <Row label="Валовая прибыль" value={e.grossProfit} strong />
          <Row label="Постоянные расходы за период" value={e.fixed} sign="-" muted={!e.fixed} />
          <Row label="Прибыль" value={e.profit} strong />

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-4 text-sm">
            <div>
              <dt className="text-gray-500">Стоимость активного бесплатного пользователя</dt>
              <dd className="font-medium">{fmtMoney(e.costPerFreeUser, 2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Себестоимость заказа (GenAPI)</dt>
              <dd className="font-medium">{fmtMoney(e.orderCost, 2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Маржа с заказа после комиссии и налога</dt>
              <dd className="font-medium">{fmtMoney(e.marginPerOrder)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Один заказ окупает</dt>
              <dd className="font-medium">{e.freeUsersPerOrder ? `${Math.floor(e.freeUsersPerOrder)} бесплатных пользователей` : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Выручка на регистрацию</dt>
              <dd className="font-medium">{fmtMoney(e.arpu, 2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Списано с баланса GenAPI</dt>
              <dd className="font-medium">
                {fmtMoney(t.genapiRealSpent)}
                {t.genapiTopups > 0 && <span className="ml-1 text-xs font-normal text-gray-500">пополнений {fmtMoney(t.genapiTopups)}</span>}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <Hint>
              Порог окупаемости = стоимость активного бесплатного пользователя / маржа с заказа. «Активный» — сделал хотя бы одну
              генерацию за период. Смета GenAPI — по ценам из замеров; реальное списание — по снимкам баланса
              {t.genapiRealSince ? ` (с ${fmtDate(t.genapiRealSince, false)})` : ', их пока нет'}.
            </Hint>
          </div>
        </Card>

        <Card title="Воронка зарегистрировавшихся за период">
          <Funnel steps={data.funnel.steps} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-sm">
            {data.funnel.side.map((step: any) => (
              <div key={step.key}>
                <div className="text-xs text-gray-500">{step.label}</div>
                <div className="font-medium tabular-nums">
                  {fmtNumber(step.value)}{' '}
                  <span className="text-xs font-normal text-gray-500">
                    {fmtPct(data.funnel.steps[0].value ? step.value / data.funnel.steps[0].value : null, 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Hint>Шаги считаются за всё время после регистрации: человек, пришедший в конце периода, ещё может дойти до оплаты.</Hint>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Деньги по дням, ₽">
          <TimeChart
            data={data.series}
            x="day"
            kind="bar"
            series={[
              { key: 'revenue', label: 'Выручка' },
              { key: 'genapi', label: 'GenAPI по смете' },
            ]}
            formatX={dayLabel}
          />
        </Card>
        <Card title="Заказы по дням">
          <TimeChart
            data={data.series.map((d: any) => ({ ...d, logoOrders: d.orders - d.brandbooks }))}
            x="day"
            kind="bar"
            stacked
            series={[
              { key: 'logoOrders', label: 'Логотипы' },
              { key: 'brandbooks', label: 'Брендбуки' },
            ]}
            formatX={dayLabel}
          />
        </Card>
        <Card title="Генерации по дням">
          <TimeChart
            data={data.series}
            x="day"
            series={[
              { key: 'logos', label: 'Логотипы' },
              { key: 'names', label: 'Названия' },
            ]}
            formatX={dayLabel}
          />
        </Card>
        <Card title="Регистрации по дням">
          <TimeChart data={data.series} x="day" kind="bar" series={[{ key: 'registrations', label: 'Регистрации', color: SERIES_COLORS[2] }]} formatX={dayLabel} />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Посещения по дням">
          <TimeChart data={data.series} x="day" series={[{ key: 'sessions', label: 'Посещения' }]} formatX={dayLabel} />
        </Card>
        <Card title="Популярные страницы">
          <BarList rows={data.traffic.pages.map((row: any) => ({ label: row.path, value: row.views }))} />
        </Card>
      </div>

      <Card title="Источники" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Источник</Th>
              <Th right>Посещений</Th>
              <Th right>Регистраций</Th>
              <Th right>Посещение → регистрация</Th>
              <Th right>Купили</Th>
              <Th right>Регистрация → покупка</Th>
              <Th right>Выручка с когорты</Th>
              <Th right>На регистрацию</Th>
            </tr>
          </thead>
          <tbody>
            {data.traffic.sources.map((row: any) => (
              <tr key={row.source}>
                <Td>{row.source}</Td>
                <Td right>{fmtNumber(row.sessions)}</Td>
                <Td right>{fmtNumber(row.registrations)}</Td>
                <Td right>{row.sessions ? fmtPct(row.registrations / row.sessions) : '—'}</Td>
                <Td right>{fmtNumber(row.payers)}</Td>
                <Td right>{fmtPct(row.registrations ? row.payers / row.registrations : null)}</Td>
                <Td right>{fmtMoney(row.revenue)}</Td>
                <Td right>{fmtMoney(row.registrations ? row.revenue / row.registrations : null)}</Td>
              </tr>
            ))}
            {data.traffic.sources.length === 0 && (
              <tr>
                <Td className="text-gray-400">Данных пока нет</Td>
              </tr>
            )}
          </tbody>
        </Table>
        <div className="px-4 py-3">
          <Hint>
            Источник — utm_source или сайт, с которого пришли. Выручка — всё, что заплатили зарегистрировавшиеся за период, в том
            числе после него. Посещения считаются без идентификаторов, поэтому «посещение → регистрация» приблизительно.
          </Hint>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Сколько логотипов делают и кто покупает">
          <div className="space-y-2">
            {q.logos.length === 0 && <p className="text-sm text-gray-400">Нет данных</p>}
            {q.logos.map((row: any) => {
              const max = Math.max(...q.logos.map((r: any) => r.users));
              return (
                <div key={row.bucket} className="grid grid-cols-[90px_1fr_120px] items-center gap-3 text-sm">
                  <span className="text-gray-700">{row.bucket > q.limit ? `больше ${q.limit}` : `${row.bucket} ${row.bucket === 1 ? 'логотип' : row.bucket < 5 ? 'логотипа' : 'логотипов'}`}</span>
                  <div className="h-4 rounded bg-gray-100" title={`${row.users} пользователей`}>
                    <div className="h-4 rounded" style={{ width: `${(row.users / max) * 100}%`, background: SERIES_COLORS[0] }} />
                  </div>
                  <span className="text-right tabular-nums">
                    {row.users} · <span className="text-gray-500">купили {fmtPct(row.payers / row.users, 0)}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm">
            <div>
              <dt className="text-gray-500">Упёрлись в квоту</dt>
              <dd className="font-medium">
                {q.wall.users} чел., потом купили {fmtPct(q.wall.users ? q.wall.paidAfter / q.wall.users : null, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">От регистрации до первой покупки</dt>
              <dd className="font-medium">
                {fmtDuration(q.firstPurchase.medianHours !== null ? q.firstPurchase.medianHours * 3600 : null)} (медиана)
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Логотипов до первой покупки</dt>
              <dd className="font-medium">{q.firstPurchase.medianLogos !== null ? fmtNumber(q.firstPurchase.medianLogos, 1) : '—'} (медиана)</dd>
            </div>
            <div>
              <dt className="text-gray-500">Купили в день регистрации</dt>
              <dd className="font-medium">
                {fmtPct(q.firstPurchase.buyers ? q.firstPurchase.sameDay / q.firstPurchase.buyers : null, 0)} из {q.firstPurchase.buyers}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <Hint>
              Квота — {q.limit} логотипов. Если покупают в основном на 1–2 логотипе, а до лимита доходят и не покупают — квоту можно
              уменьшить. Если покупки растут к концу квоты — она работает как стена.
            </Hint>
          </div>
        </Card>

        <Card title="Отказы в генерации" padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Причина</Th>
                <Th>Что</Th>
                <Th right>Отказов</Th>
                <Th right>Людей</Th>
              </tr>
            </thead>
            <tbody>
              {q.refusals.map((row: any) => (
                <tr key={`${row.code}-${row.kind}`}>
                  <Td>{REFUSAL_LABELS[row.code] ?? row.code}</Td>
                  <Td>{row.kind === 'logos' ? 'логотипы' : 'названия'}</Td>
                  <Td right>{fmtNumber(row.events)}</Td>
                  <Td right>{fmtNumber(row.users)}</Td>
                </tr>
              ))}
              {q.refusals.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Отказов не было</Td>
                </tr>
              )}
            </tbody>
          </Table>
          <div className="px-4 py-3">
            <Hint>«Бесплатное на паузе» и «Очередь переполнена» — потерянные люди из-за нас, а не из-за квоты.</Hint>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Оплата">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Начато оплат</div>
              <div className="text-lg font-semibold tabular-nums">{p.checkout.created}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Оплачено</div>
              <div className="text-lg font-semibold tabular-nums">
                {p.checkout.succeeded}{' '}
                <span className="text-xs font-normal text-gray-500">{fmtPct(p.checkout.created ? p.checkout.succeeded / p.checkout.created : null, 0)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Отменено / висит</div>
              <div className="text-lg font-semibold tabular-nums">
                {p.checkout.canceled} / {p.checkout.pending}
              </div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm">
            <div>
              <dt className="text-gray-500">Докупили брендбук после логотипа</dt>
              <dd className="font-medium">
                {p.upsell.upgraded} из {p.upsell.logoBuyers} ({fmtPct(p.upsell.logoBuyers ? p.upsell.upgraded / p.upsell.logoBuyers : null, 0)})
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Доля брендбуков в заказах</dt>
              <dd className="font-medium">{fmtPct(t.orders ? t.brandbookOrders / t.orders : null, 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Возвратов</dt>
              <dd className="font-medium">
                {t.refundCount} ({fmtPct(t.orders ? t.refundCount / t.orders : null)})
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Цены</dt>
              <dd className="font-medium">
                логотип {fmtMoney(p.prices.logo)}, брендбук {fmtMoney(p.prices.brandbook)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Ушли с оплаты и не купили" padded={false}>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Пользователь</Th>
                  <Th>Что</Th>
                  <Th>Когда</Th>
                  <Th>Рассылка</Th>
                </tr>
              </thead>
              <tbody>
                {p.abandoned.map((row: any) => (
                  <tr key={row.orderId}>
                    <Td>
                      <Link href={`/admin/r/users/${row.userId}`} className="text-sky-700 hover:underline">
                        {row.email}
                      </Link>
                      {row.brand && <div className="text-xs text-gray-500">{row.brand}</div>}
                    </Td>
                    <Td>
                      <Link href={`/admin/r/payments/${row.orderId}`} className="hover:underline">
                        {row.product === 'logo' ? 'логотип' : 'брендбук'}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">{fmtDate(row.createdAt)}</Td>
                    <Td>{row.marketing ? <Badge tone="ok">можно писать</Badge> : <Badge tone="muted">нет согласия</Badge>}</Td>
                  </tr>
                ))}
                {p.abandoned.length === 0 && (
                  <tr>
                    <Td className="text-gray-400">Таких нет</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {[
          { key: 'styles', title: 'Стили логотипа' },
          { key: 'patterns', title: 'Приёмы логотипа' },
          { key: 'industries', title: 'Ниши' },
        ].map(({ key, title }) => (
          <Card key={key} title={title}>
            <BarList
              rows={data.segments[key].map((row: any) => ({
                label: row.key,
                value: row.generated,
                note: `куплено ${fmtPct(row.generated ? row.paid / row.generated : null, 0)}`,
              }))}
            />
          </Card>
        ))}
      </div>
      <Hint>
        Конверсия по стилям — доля оплаченных среди сгенерированных за период. Для периодов старше 90 дней она завышена:
        неоплаченные логотипы к этому времени удалены.
      </Hint>

      <div>
        <Card title="Когорты по неделе регистрации" padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Неделя</Th>
                <Th right>Регистраций</Th>
                <Th right>Сделали логотип</Th>
                <Th right>Вернулись</Th>
                <Th right>Купили за 7 дн.</Th>
                <Th right>За 30 дн.</Th>
                <Th right>Всего</Th>
                <Th right>Выручка</Th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((row: any) => {
                const share = (n: number) => (row.registered ? n / row.registered : null);
                return (
                  <tr key={row.week}>
                    <Td className="whitespace-nowrap">с {fmtDate(row.week, false)}</Td>
                    <Td right>{row.registered}</Td>
                    {[row.activated, row.returned, row.paid7, row.paid30, row.paidAny].map((n: number, i: number) => (
                      <Td key={i} right>
                        <span className="inline-block min-w-[3.5rem] rounded px-1.5 py-0.5" style={heat(share(n))}>
                          {fmtPct(share(n), 0)}
                        </span>
                      </Td>
                    ))}
                    <Td right>{fmtMoney(row.revenue)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="px-4 py-3">
            <Hint>«Вернулись» — была активность позже чем через сутки после регистрации.</Hint>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Analytics />
    </Suspense>
  );
}
