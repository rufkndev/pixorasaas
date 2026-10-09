"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiJson } from '../../lib/authClient';
import {
  Badge,
  Card,
  ErrorBox,
  fmtBytes,
  fmtDate,
  fmtDuration,
  fmtMoney,
  fmtMs,
  fmtNumber,
  fmtPct,
  Hint,
  JsonView,
  Segmented,
  Spinner,
  Stat,
  Table,
  Td,
  Th,
  Tone,
} from '../../components/admin/ui';
import { Meter, TimeChart } from '../../components/admin/charts';

type Tab = 'state' | 'metrics' | 'logs';

const CHECK_TONE: Record<string, Tone> = { ok: 'ok', warn: 'warn', fail: 'fail', off: 'muted' };
const CHECK_LABEL: Record<string, string> = { ok: 'в порядке', warn: 'внимание', fail: 'сбой', off: 'не настроено' };

const TIME_FORMAT: Record<string, Intl.DateTimeFormatOptions> = {
  '1 minute': { hour: '2-digit', minute: '2-digit' },
  '15 minutes': { hour: '2-digit', minute: '2-digit' },
  '2 hours': { day: '2-digit', month: '2-digit', hour: '2-digit' },
  '12 hours': { day: '2-digit', month: '2-digit', hour: '2-digit' },
};

const timeLabel = (bucket: string) => (value: string) =>
  new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', ...(TIME_FORMAT[bucket] ?? {}) });

function StateTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const load = useCallback(() => {
    apiJson('/api/admin/monitoring/overview')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const runChecks = async () => {
    setChecking(true);
    try {
      await apiJson('/api/admin/monitoring/checks', { method: 'POST' });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  if (error && !data) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const { checks, resources, jobs, runtime, balance, counts, alerts } = data;
  const failing = checks.filter((check: any) => check.status === 'fail').length;
  const memUsed = resources.memory.hostTotal - resources.memory.hostFree;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-lg border p-3 text-sm ${
          failing || counts.exhausted
            ? 'border-red-300 bg-red-50 text-red-900'
            : counts.undelivered || counts.errors1h
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
        }`}
      >
        {failing
          ? `✕ Сбой проверок: ${failing}. Подробности ниже.`
          : counts.exhausted
            ? `✕ Заказов с исчерпанными попытками выдачи: ${counts.exhausted} — нужен ручной разбор.`
            : counts.undelivered || counts.errors1h
              ? `▲ Есть о чём посмотреть: не выдано ${counts.undelivered}, ошибок за час ${counts.errors1h}.`
              : '● Всё работает. Данные обновляются каждые 30 секунд.'}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Оплачено, не выдано"
          value={counts.undelivered}
          tone={counts.exhausted ? 'fail' : counts.undelivered ? 'warn' : undefined}
          hint={counts.exhausted ? `из них ${counts.exhausted} без автоповторов` : `собирается брендбуков: ${counts.building}`}
          href="/admin/r/payments?f_problem=undelivered"
        />
        <Stat label="Ошибок за час" value={counts.errors1h} tone={counts.errors1h > 10 ? 'warn' : undefined} hint={`за сутки ${counts.errors24h}, из браузера ${counts.clientErrors24h}`} />
        <Stat
          label="Сбоев GenAPI за сутки"
          value={counts.genapiFailed24h}
          tone={counts.genapiCalls24h && counts.genapiFailed24h / counts.genapiCalls24h > 0.1 ? 'warn' : undefined}
          hint={`из ${counts.genapiCalls24h} вызовов (${fmtPct(counts.genapiCalls24h ? counts.genapiFailed24h / counts.genapiCalls24h : null)})`}
        />
        <Stat
          label="Баланс GenAPI"
          value={fmtMoney(balance.current)}
          tone={balance.current !== null && balance.current < balance.alertBelow ? 'warn' : undefined}
          hint={
            balance.daysLeft !== null
              ? `хватит примерно на ${Math.floor(balance.daysLeft)} дн. (${fmtMoney(balance.perDay)}/день)`
              : 'прогноз появится через полдня снимков'
          }
        />
      </div>

      <Card
        title="Проверки"
        action={
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={checking}
            className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {checking ? 'Проверяем…' : 'Проверить сейчас'}
          </button>
        }
        padded={false}
      >
        {checks.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500">Проверки ещё не запускались — первый прогон через 20 секунд после старта, или нажмите «Проверить сейчас».</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Что</Th>
                <Th>Состояние</Th>
                <Th>Детали</Th>
                <Th right>Время</Th>
                <Th>Когда</Th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check: any) => (
                <tr key={check.key}>
                  <Td>{check.label}</Td>
                  <Td>
                    <Badge tone={CHECK_TONE[check.status]}>{CHECK_LABEL[check.status]}</Badge>
                  </Td>
                  <Td className="text-gray-700">{check.detail}</Td>
                  <Td right>{fmtMs(check.ms)}</Td>
                  <Td className="whitespace-nowrap text-gray-500">{fmtDate(check.at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Сейчас в процессе">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Генерации логотипов</dt>
              <dd className="mt-1 text-gray-900">
                идёт {runtime.logoSlots.active} из {runtime.logoSlots.limit}, в очереди {runtime.logoSlots.queued} из {runtime.logoSlots.maxQueue}
              </dd>
              <div className="mt-1">
                <Meter value={runtime.logoSlots.active + runtime.logoSlots.queued} max={runtime.logoSlots.limit + runtime.logoSlots.maxQueue} warnAt={0.5} failAt={0.9} />
              </div>
            </div>
            <div>
              <dt className="text-gray-500">Выдачи заказов</dt>
              <dd className="mt-1 text-gray-900">идёт {runtime.activeDeliveries}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Бюджет бесплатного сегодня</dt>
              <dd className="mt-1 text-gray-900">
                {fmtMoney(runtime.spentToday)} из {fmtMoney(runtime.budget)}
                {runtime.freePaused && <span className="ml-2"><Badge tone="warn">пауза</Badge></span>}
              </dd>
              <div className="mt-1">
                <Meter value={runtime.spentToday} max={runtime.budget} />
              </div>
            </div>
            <div>
              <dt className="text-gray-500">Списано GenAPI за сутки</dt>
              <dd className="mt-1 text-gray-900">{fmtMoney(balance.spent24h)} по балансу</dd>
            </div>
          </dl>
          <div className="mt-3">
            <Hint>
              Бюджет и паузу можно поменять в <Link href="/admin/settings" className="underline">настройках</Link>.
            </Hint>
          </div>
        </Card>

        <Card title="Сервер">
          <dl className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Память хоста</dt>
                <dd>
                  {fmtBytes(memUsed)} из {fmtBytes(resources.memory.hostTotal)} · процесс {fmtBytes(resources.memory.rss)}
                </dd>
              </div>
              <Meter value={memUsed} max={resources.memory.hostTotal} />
            </div>
            {resources.disk && (
              <div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Диск</dt>
                  <dd>
                    свободно {fmtBytes(resources.disk.free)} из {fmtBytes(resources.disk.total)}
                  </dd>
                </div>
                <Meter value={resources.disk.total - resources.disk.free} max={resources.disk.total} warnAt={0.85} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <dt className="text-gray-500">Нагрузка (1/5/15 мин)</dt>
                <dd>
                  {resources.loadAvg.map((v: number) => v.toFixed(2)).join(' / ')} на {resources.cpus} ядр.
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Аптайм</dt>
                <dd>процесс {fmtDuration(resources.uptimeSec)}, хост {fmtDuration(resources.hostUptimeSec)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Картинки</dt>
                <dd>
                  {fmtBytes(resources.generatedDir.bytes)}, {fmtNumber(resources.generatedDir.files)} файлов
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">База</dt>
                <dd>{fmtBytes(resources.dbBytes)}</dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Фоновые задачи" padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Задача</Th>
                <Th>Последний запуск</Th>
                <Th right>Длилась</Th>
                <Th right>Запусков / сбоев</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.name}>
                  <Td>
                    {job.name}
                    <div className="text-xs text-gray-500">раз в {fmtDuration(job.everyMs / 1000)}</div>
                    {job.lastError && <div className="mt-1 text-xs text-red-700">✕ {job.lastError}</div>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {job.running ? <Badge tone="info">идёт</Badge> : job.lastStartedAt ? fmtDate(job.lastStartedAt) : <span className="text-gray-400">ещё не было</span>}
                  </Td>
                  <Td right>{job.lastDurationMs !== null ? fmtMs(job.lastDurationMs) : '—'}</Td>
                  <Td right>
                    {job.runs} / <span className={job.failures ? 'text-red-700' : ''}>{job.failures}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Последние алерты" padded={false}>
          {alerts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">Алертов не было</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {alerts.map((alert: any, i: number) => (
                <li key={i} className="px-4 py-2 text-sm">
                  <div className="text-xs text-gray-500">{fmtDate(alert.at)}</div>
                  <div className="whitespace-pre-wrap break-words text-gray-800">{alert.message}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Самые большие таблицы" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Таблица</Th>
              <Th right>Строк</Th>
              <Th right>Размер</Th>
            </tr>
          </thead>
          <tbody>
            {resources.tables.map((table: any) => (
              <tr key={table.name}>
                <Td className="font-mono text-xs">{table.name}</Td>
                <Td right>{fmtNumber(table.rows)}</Td>
                <Td right>{fmtBytes(table.bytes)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

type Range = '1h' | '24h' | '7d' | '30d';

function MetricsTab() {
  const [range, setRange] = useState<Range>('24h');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    apiJson(`/api/admin/monitoring/metrics?range=${range}`)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [range]);

  useEffect(() => {
    setData(null);
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Segmented<Range>
        value={range}
        onChange={setRange}
        options={[
          { value: '1h', label: 'Час' },
          { value: '24h', label: 'Сутки' },
          { value: '7d', label: 'Неделя' },
          { value: '30d', label: 'Месяц' },
        ]}
      />
      <Hint>Метрики HTTP хранятся 30 дней, сведены по минутам. Перцентили — по корзинам, с точностью до границы корзины.</Hint>
    </div>
  );

  if (error && !data) return <div className="space-y-4">{header}<ErrorBox message={error} onRetry={load} /></div>;
  if (!data) return <div className="space-y-4">{header}<Spinner /></div>;

  const fx = timeLabel(data.bucket);
  const http = data.http.map((p: any) => ({ ...p, p95: p.p95Ms ?? 0, errors: p.s5xx, client: p.s4xx }));
  const totalRequests = data.http.reduce((s: number, p: any) => s + p.count, 0);
  const total5xx = data.http.reduce((s: number, p: any) => s + p.s5xx, 0);
  const d = data.delivery;

  return (
    <div className="space-y-5">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Запросов к API" value={fmtNumber(totalRequests)} />
        <Stat label="Ошибок 5xx" value={fmtNumber(total5xx)} hint={fmtPct(totalRequests ? total5xx / totalRequests : null, 2)} tone={totalRequests && total5xx / totalRequests > 0.01 ? 'warn' : undefined} />
        <Stat label="Оплачено / выдано" value={`${d.paid} / ${d.delivered}`} hint={d.retried ? `не с первой попытки: ${d.retried}` : undefined} />
        <Stat label="Брендбук от оплаты до выдачи" value={fmtDuration(d.brandbookMedianS)} hint={`медиана; 95 % — до ${fmtDuration(d.brandbookP95S)}; логотип ${fmtDuration(d.logoMedianS)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Запросы к API">
          <TimeChart data={http} x="t" kind="bar" series={[{ key: 'count', label: 'Запросов' }]} formatX={fx} />
        </Card>
        <Card title="Ответы с ошибкой">
          <TimeChart
            data={http}
            x="t"
            kind="bar"
            stacked
            series={[
              { key: 'client', label: '4xx — ошибка клиента', color: '#eda100' },
              { key: 'errors', label: '5xx — наша ошибка', color: '#e34948' },
            ]}
            formatX={fx}
          />
        </Card>
        <Card title="Время ответа, мс">
          <TimeChart
            data={http}
            x="t"
            series={[
              { key: 'p95', label: '95-й перцентиль' },
              { key: 'avgMs', label: 'Среднее' },
            ]}
            formatX={fx}
          />
        </Card>
        <Card title="Ошибки и предупреждения в логах">
          <TimeChart
            data={data.errors}
            x="t"
            kind="bar"
            stacked
            series={[
              { key: 'server', label: 'Ошибки сервера', color: '#e34948' },
              { key: 'client', label: 'Ошибки в браузере', color: '#4a3aa7' },
              { key: 'warn', label: 'Предупреждения', color: '#eda100' },
            ]}
            formatX={fx}
          />
        </Card>
        <Card title="Вызовы GenAPI">
          <TimeChart
            data={data.genapiSeries.map((p: any) => ({ ...p, ok: p.calls - p.failed }))}
            x="t"
            kind="bar"
            stacked
            series={[
              { key: 'ok', label: 'Успешные' },
              { key: 'failed', label: 'С ошибкой', color: '#e34948' },
            ]}
            formatX={fx}
          />
        </Card>
        <Card title="Длительность вызова GenAPI, мс">
          <TimeChart data={data.genapiSeries} x="t" series={[{ key: 'avgMs', label: 'Среднее' }]} formatX={fx} formatY={(v) => fmtMs(v)} />
        </Card>
      </div>

      <Card title="GenAPI по моделям" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Что</Th>
              <Th>Модель</Th>
              <Th right>Вызовов</Th>
              <Th right>Ошибок</Th>
              <Th right>Среднее</Th>
              <Th right>95 %</Th>
              <Th right>Смета</Th>
              <Th right>Из них заказы</Th>
            </tr>
          </thead>
          <tbody>
            {data.genapi.map((row: any) => (
              <tr key={`${row.model}-${row.label}`}>
                <Td>{row.label}</Td>
                <Td className="font-mono text-xs">{row.model}</Td>
                <Td right>{fmtNumber(row.calls)}</Td>
                <Td right className={row.failed / row.calls > 0.1 ? 'text-red-700' : ''}>
                  {row.failed} ({fmtPct(row.failed / row.calls, 0)})
                </Td>
                <Td right>{fmtMs(row.avgMs)}</Td>
                <Td right>{fmtMs(row.p95Ms)}</Td>
                <Td right>{fmtMoney(row.cost)}</Td>
                <Td right>{fmtNumber(row.paidCalls)}</Td>
              </tr>
            ))}
            {data.genapi.length === 0 && (
              <tr>
                <Td className="text-gray-400">Вызовов не было</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card title="Маршруты API" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Маршрут</Th>
              <Th right>Запросов</Th>
              <Th right>4xx</Th>
              <Th right>5xx</Th>
              <Th right>Медиана</Th>
              <Th right>95 %</Th>
              <Th right>Максимум</Th>
            </tr>
          </thead>
          <tbody>
            {data.routes.map((row: any) => (
              <tr key={row.route}>
                <Td className="font-mono text-xs">{row.route}</Td>
                <Td right>{fmtNumber(row.count)}</Td>
                <Td right>{row.s4xx || '—'}</Td>
                <Td right className={row.s5xx ? 'font-medium text-red-700' : ''}>{row.s5xx || '—'}</Td>
                <Td right>{row.p50Ms !== null ? `≤ ${fmtMs(row.p50Ms)}` : '—'}</Td>
                <Td right>{row.p95Ms !== null ? `≤ ${fmtMs(row.p95Ms)}` : '—'}</Td>
                <Td right>{fmtMs(row.maxMs)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Шаги сборки брендбука" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Шаг</Th>
              <Th right>Сборок</Th>
              <Th right>Упал</Th>
              <Th right>Пропущен</Th>
            </tr>
          </thead>
          <tbody>
            {data.buildSteps.map((row: any) => (
              <tr key={row.label}>
                <Td>{row.label}</Td>
                <Td right>{row.total}</Td>
                <Td right className={row.failed ? 'text-red-700' : ''}>{row.failed || '—'}</Td>
                <Td right>{row.skipped || '—'}</Td>
              </tr>
            ))}
            {data.buildSteps.length === 0 && (
              <tr>
                <Td className="text-gray-400">Брендбуков за период не собирали</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

const LEVEL_TONE: Record<string, Tone> = { error: 'fail', warn: 'warn', info: 'muted' };

function LogsTab() {
  const searchParams = useSearchParams();
  const [levels, setLevels] = useState<string[]>(['error', 'warn']);
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [requestId, setRequestId] = useState(searchParams.get('requestId') || '');
  const [rows, setRows] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auto, setAuto] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (before?: number) => {
      const params = new URLSearchParams();
      if (levels.length) params.set('levels', levels.join(','));
      if (source) params.set('source', source);
      if (q.trim()) params.set('q', q.trim());
      if (requestId.trim()) params.set('requestId', requestId.trim());
      if (before) params.set('before', String(before));
      return apiJson<{ rows: any[]; hasMore: boolean }>(`/api/admin/monitoring/logs?${params}`);
    },
    [levels, source, q, requestId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPage();
      setRows(result.rows);
      setHasMore(result.hasMore);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [auto, load]);

  const more = async () => {
    const result = await fetchPage(rows[rows.length - 1]?.id);
    setRows([...rows, ...result.rows]);
    setHasMore(result.hasMore);
  };

  const toggleLevel = (level: string) =>
    setLevels(levels.includes(level) ? levels.filter((l) => l !== level) : [...levels, level]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
        <div className="flex gap-1">
          {['error', 'warn', 'info'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              className={`rounded px-2 py-1 ${levels.includes(level) ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700'}`}
            >
              {level}
            </button>
          ))}
        </div>
        <select value={source} onChange={(event) => setSource(event.target.value)} className="text-sm">
          <option value="">сервер и браузер</option>
          <option value="server">только сервер</option>
          <option value="client">только браузер</option>
        </select>
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Текст в сообщении" className="min-w-0 flex-1 text-sm" />
          <input value={requestId} onChange={(event) => setRequestId(event.target.value)} placeholder="requestId" className="w-44 text-sm" />
          <button type="submit" className="rounded-md border border-gray-300 px-3 hover:bg-gray-50">
            Найти
          </button>
        </form>
        <label className="flex items-center gap-1.5 text-gray-700">
          <input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />
          обновлять
        </label>
      </div>
      <Hint>Info хранится 14 дней, ошибки и предупреждения — 60. Почта и телефоны в тексте замаскированы ещё при записи.</Hint>

      {error && <ErrorBox message={error} />}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <Th>Когда</Th>
              <Th>Уровень</Th>
              <Th>Сообщение</Th>
              <Th>requestId</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className={row.context ? 'cursor-pointer hover:bg-gray-50' : ''} onClick={() => row.context && setOpen(open === row.id ? null : row.id)}>
                  <Td className="whitespace-nowrap text-xs text-gray-500">{fmtDate(row.at)}</Td>
                  <Td>
                    <Badge tone={LEVEL_TONE[row.level]}>
                      {row.level}
                      {row.source === 'client' ? ' · браузер' : ''}
                    </Badge>
                  </Td>
                  <Td className="max-w-3xl">
                    <span className="whitespace-pre-wrap break-words font-mono text-xs text-gray-800">{row.message}</span>
                  </Td>
                  <Td>
                    {row.requestId && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRequestId(row.requestId);
                          setLevels(['error', 'warn', 'info']);
                        }}
                        className="font-mono text-xs text-sky-700 hover:underline"
                        title="Показать все строки этого запроса"
                      >
                        {row.requestId.slice(0, 8)}
                      </button>
                    )}
                  </Td>
                </tr>
                {open === row.id && (
                  <tr>
                    <td colSpan={4} className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <JsonView value={row.context} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-gray-400">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button type="button" onClick={() => void more()} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
          Показать старше
        </button>
      )}
    </div>
  );
}

function Monitoring() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get('tab') as Tab) || 'state';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Мониторинг</h1>
        <Segmented<Tab>
          value={tab}
          onChange={(value) => router.push(`/admin/monitoring?tab=${value}`)}
          options={[
            { value: 'state', label: 'Состояние' },
            { value: 'metrics', label: 'Метрики' },
            { value: 'logs', label: 'Логи' },
          ]}
        />
      </div>
      {tab === 'metrics' ? <MetricsTab /> : tab === 'logs' ? <LogsTab /> : <StateTab />}
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Monitoring />
    </Suspense>
  );
}
