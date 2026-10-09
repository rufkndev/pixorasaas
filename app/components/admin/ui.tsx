"use client";

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';

export type Tone = 'ok' | 'warn' | 'fail' | 'info' | 'muted';
export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'money'
  | 'datetime'
  | 'bool'
  | 'badge'
  | 'json'
  | 'image'
  | 'id';

export interface ColumnMeta {
  key: string;
  label: string;
  type?: FieldType;
  sortable?: boolean;
  tones?: Record<string, Tone>;
  link?: { resource?: string; resourceField?: string; field: string };
}

// Цвет статуса всегда идёт вместе со значком и словом: одним цветом статус не читается
const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  fail: 'bg-red-50 text-red-800 ring-red-600/20',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  muted: 'bg-gray-100 text-gray-600 ring-gray-500/15',
};

const TONE_ICON: Record<Tone, string> = { ok: '●', warn: '▲', fail: '✕', info: '●', muted: '○' };

export const Badge = ({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`}>
    <span aria-hidden className="text-[9px] leading-none">{TONE_ICON[tone]}</span>
    {children}
  </span>
);

export const fmtMoney = (value: unknown, digits = 0): string =>
  value === null || value === undefined || value === ''
    ? '—'
    : `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ₽`;

export const fmtNumber = (value: unknown, digits = 0): string =>
  value === null || value === undefined || value === ''
    ? '—'
    : Number(value).toLocaleString('ru-RU', { maximumFractionDigits: digits });

export const fmtPct = (value: number | null | undefined, digits = 1): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(digits)} %`;

export const fmtDate = (value: unknown, withTime = true): string => {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const fmtBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const fmtDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)} мс`;
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} с`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} ч`;
  return `${Math.round(seconds / 86400)} дн.`;
};

export const fmtMs = (ms: number | null | undefined): string =>
  ms === null || ms === undefined ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} с` : `${Math.round(ms)} мс`;

const CopyId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const short = value.length > 13 ? `${value.slice(0, 8)}…` : value;
  return (
    <button
      type="button"
      title={`${value} — нажмите, чтобы скопировать`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="font-mono text-xs text-gray-700 hover:text-gray-900"
    >
      {copied ? 'скопировано' : short}
    </button>
  );
};

export const JsonView = ({ value }: { value: unknown }) => {
  const [open, setOpen] = useState(false);
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
  const text = JSON.stringify(value, null, 2);
  const short = JSON.stringify(value);
  if (short.length <= 60) return <code className="break-all text-xs text-gray-700">{short}</code>;
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="text-xs text-sky-700 hover:underline">
        {open ? 'свернуть' : `${short.slice(0, 50)}…`}
      </button>
      {open && <pre className="mt-1 max-h-96 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-800">{text}</pre>}
    </div>
  );
};

export const Value = ({ column, value, compact = false }: { column: ColumnMeta; value: unknown; compact?: boolean }) => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-400">—</span>;

  switch (column.type) {
    case 'money':
      return <span className="tabular-nums">{fmtMoney(value)}</span>;
    case 'number':
      return <span className="tabular-nums">{fmtNumber(value, 1)}</span>;
    case 'datetime':
      return <span className="whitespace-nowrap tabular-nums">{fmtDate(value)}</span>;
    case 'bool':
      return value ? <span className="text-emerald-700">✓ да</span> : <span className="text-gray-400">нет</span>;
    case 'badge':
      return <Badge tone={column.tones?.[String(value)] ?? 'muted'}>{String(value)}</Badge>;
    case 'json':
      return <JsonView value={value} />;
    case 'id':
      return <CopyId value={String(value)} />;
    case 'image':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(value)}
          alt=""
          loading="lazy"
          className={`${compact ? 'h-12 w-12' : 'max-h-64 max-w-full'} rounded border border-gray-200 bg-white object-contain`}
          onError={(event) => {
            (event.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      );
    case 'longtext':
      return (
        <span className={compact ? 'line-clamp-2 max-w-md' : 'whitespace-pre-wrap break-words'}>{String(value)}</span>
      );
    default:
      return <span className="break-words">{String(value)}</span>;
  }
};

// Ссылка на карточку другой модели, если в строке есть id
export const linkFor = (column: ColumnMeta, row: Record<string, any>): string | null => {
  if (!column.link) return null;
  const resource = column.link.resource ?? (column.link.resourceField ? row[column.link.resourceField] : null);
  const id = row[column.link.field];
  if (!resource || id === null || id === undefined || id === '') return null;
  return `/admin/r/${resource}/${encodeURIComponent(String(id))}`;
};

export const Cell = ({ column, row, compact }: { column: ColumnMeta; row: Record<string, any>; compact?: boolean }) => {
  const href = linkFor(column, row);
  const content = <Value column={column} value={row[column.key]} compact={compact} />;
  return href ? (
    <Link href={href} className="text-sky-700 hover:underline" onClick={(event) => event.stopPropagation()}>
      {content}
    </Link>
  ) : (
    content
  );
};

export const Card = ({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <section className={`rounded-lg border border-gray-200 bg-white ${className}`}>
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </header>
    )}
    <div className={padded ? 'p-4' : ''}>{children}</div>
  </section>
);

export const Stat = ({
  label,
  value,
  hint,
  delta,
  deltaGoodWhenUp = true,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: number | null;
  deltaGoodWhenUp?: boolean;
  tone?: Tone;
  href?: string;
}) => {
  const deltaTone =
    delta === null || delta === undefined || !Number.isFinite(delta) || Math.abs(delta) < 0.005
      ? 'text-gray-500'
      : (delta > 0) === deltaGoodWhenUp
        ? 'text-emerald-700'
        : 'text-red-700';

  const body = (
    <div
      className={`h-full rounded-lg border bg-white p-4 ${
        tone === 'fail' ? 'border-red-300' : tone === 'warn' ? 'border-amber-300' : 'border-gray-200'
      } ${href ? 'transition hover:border-gray-400' : ''}`}
    >
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span className={`tabular-nums ${deltaTone}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : ''} {Math.abs(delta * 100).toFixed(0)} % к прошлому периоду
          </span>
        )}
        {hint && <span className="text-gray-500">{hint}</span>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
};

export const Spinner = ({ label = 'Загрузка…' }: { label?: string }) => (
  <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
    {label}
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    {message}
    {onRetry && (
      <button type="button" onClick={onRetry} className="ml-3 font-medium underline">
        Повторить
      </button>
    )}
  </div>
);

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5 text-sm">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded px-3 py-1 ${value === option.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">{children}</table>
  </div>
);

export const Th = ({ children, right = false }: { children?: ReactNode; right?: boolean }) => (
  <th className={`whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

export const Td = ({ children, right = false, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <td className={`border-b border-gray-100 px-3 py-2 align-top ${right ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>
);

export const Hint = ({ children }: { children: ReactNode }) => <p className="text-xs leading-relaxed text-gray-500">{children}</p>;
