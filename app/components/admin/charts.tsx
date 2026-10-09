"use client";

import React, { useMemo, useRef, useState } from 'react';

// Порядок цветов фиксирован и проверен на различимость при дальтонизме.
// Больше трёх серий на один график не кладём — дальше цвета путаются
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'] as const;

export interface Series {
  key: string;
  label: string;
  color?: string;
}

const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
};

const compact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)} тыс`;
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
};

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

// Время по оси X и подпись в подсказке. Ось одна: величины разного масштаба
// рисуются отдельными графиками, а не второй шкалой
export const TimeChart = ({
  data,
  x,
  series,
  kind = 'line',
  formatX,
  formatY = compact,
  height = H,
  stacked = false,
}: {
  data: Array<Record<string, any>>;
  x: string;
  series: Series[];
  kind?: 'line' | 'bar';
  formatX: (value: any) => string;
  formatY?: (value: number) => string;
  height?: number;
  stacked?: boolean;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const colored = series.slice(0, 3).map((s, i) => ({ ...s, color: s.color ?? SERIES_COLORS[i] }));
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const max = useMemo(() => {
    const values = data.map((row) =>
      stacked ? colored.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0) : Math.max(...colored.map((s) => Number(row[s.key]) || 0))
    );
    return niceMax(Math.max(0, ...values));
  }, [data, colored, stacked]);

  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-400">Нет данных за период</div>;
  }

  const step = innerW / data.length;
  const xAt = (i: number) => PAD.left + step * i + step / 2;
  const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.floor((px - PAD.left) / step);
    setHover(index >= 0 && index < data.length ? index : null);
  };

  const barW = Math.max(1, Math.min(28, step * (stacked ? 0.7 : 0.8 / colored.length)));

  return (
    <div className="relative">
      {colored.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-gray-600">
          {colored.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full touch-none select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke="#eceae6" strokeWidth={1} />
            <text x={PAD.left - 6} y={yAt(t) + 3} textAnchor="end" fontSize={10} fill="#6b6a66">
              {formatY(t)}
            </text>
          </g>
        ))}

        {data.map((row, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={xAt(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#6b6a66">
              {formatX(row[x])}
            </text>
          ) : null
        )}

        {hover !== null && (
          <rect x={PAD.left + step * hover} y={PAD.top} width={step} height={innerH} fill="#000" opacity={0.04} />
        )}

        {kind === 'bar'
          ? data.map((row, i) => {
              let base = 0;
              return colored.map((s, si) => {
                const v = Number(row[s.key]) || 0;
                if (v <= 0) return null;
                const x0 = stacked ? xAt(i) - barW / 2 : xAt(i) - (barW * colored.length) / 2 + barW * si;
                const y1 = yAt(stacked ? base + v : v);
                const y0 = yAt(stacked ? base : 0);
                if (stacked) base += v;
                return (
                  <rect
                    key={`${i}-${s.key}`}
                    x={x0 + (stacked ? 0 : 1)}
                    y={y1}
                    width={Math.max(1, barW - (stacked ? 0 : 2))}
                    height={Math.max(1, y0 - y1 - (stacked && si > 0 ? 1 : 0))}
                    rx={Math.min(3, barW / 3)}
                    fill={s.color}
                  />
                );
              });
            })
          : colored.map((s) => (
              <g key={s.key}>
                <polyline
                  points={data.map((row, i) => `${xAt(i)},${yAt(Number(row[s.key]) || 0)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hover !== null && (
                  <circle cx={xAt(hover)} cy={yAt(Number(data[hover][s.key]) || 0)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
                )}
              </g>
            ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={yAt(0)} y2={yAt(0)} stroke="#c9c7c1" strokeWidth={1} />
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-6 z-10 min-w-[140px] rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(xAt(hover) / W) * 100}%`,
            transform: hover > data.length / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="mb-1 font-medium text-gray-900">{formatX(data[hover][x])}</div>
          {colored.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums text-gray-900">{formatY(Number(data[hover][s.key]) || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Горизонтальные полосы для категорий: источники, страницы, стили
export const BarList = ({
  rows,
  format = (v: number) => v.toLocaleString('ru-RU'),
  color = SERIES_COLORS[0],
}: {
  rows: Array<{ label: string; value: number; note?: string }>;
  format?: (value: number) => string;
  color?: string;
}) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) return <div className="py-4 text-sm text-gray-400">Нет данных</div>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="text-sm" title={`${row.label}: ${format(row.value)}`}>
          <div className="mb-0.5 flex justify-between gap-3">
            <span className="truncate text-gray-700">{row.label}</span>
            <span className="shrink-0 tabular-nums text-gray-900">
              {format(row.value)}
              {row.note && <span className="ml-2 text-xs text-gray-500">{row.note}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

// Воронка: доля от первого шага и потеря на каждом переходе
export const Funnel = ({ steps }: { steps: Array<{ key: string; label: string; value: number }> }) => {
  const top = steps[0]?.value || 0;
  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const fromTop = top ? step.value / top : 0;
        const fromPrev = prev ? step.value / prev : null;
        return (
          <li key={step.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-gray-800">{step.label}</span>
              <span className="tabular-nums text-gray-900">
                <strong>{step.value.toLocaleString('ru-RU')}</strong>
                <span className="ml-2 text-xs text-gray-500">{(fromTop * 100).toFixed(1)} % от регистраций</span>
              </span>
            </div>
            <div className="h-6 rounded bg-gray-100">
              <div
                className="flex h-6 items-center rounded px-2 text-[11px] font-medium text-white"
                style={{ width: `${Math.max(fromTop * 100, 0.5)}%`, background: SERIES_COLORS[0] }}
              />
            </div>
            {fromPrev !== null && (
              <div className={`mt-0.5 text-xs ${fromPrev < 0.3 ? 'text-red-700' : 'text-gray-500'}`}>
                переход с прошлого шага: {(fromPrev * 100).toFixed(1)} %
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

// Шкала заполнения: диск, память, бюджет
export const Meter = ({ value, max, warnAt = 0.8, failAt = 0.95 }: { value: number; max: number; warnAt?: number; failAt?: number }) => {
  const share = max > 0 ? Math.min(value / max, 1) : 0;
  const color = share >= failAt ? '#e34948' : share >= warnAt ? '#eda100' : '#1baf7a';
  return (
    <div className="h-2 rounded-full bg-gray-100" title={`${(share * 100).toFixed(0)} %`}>
      <div className="h-2 rounded-full" style={{ width: `${share * 100}%`, background: color }} />
    </div>
  );
};
