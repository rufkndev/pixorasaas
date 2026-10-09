"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiJson } from '../../../../lib/authClient';
import { Card, Cell, ColumnMeta, ErrorBox, Spinner } from '../../../../components/admin/ui';
import ActionDialog, { ActionMeta, needsDialog, runAdminAction } from '../../../../components/admin/ActionDialog';

interface Detail {
  meta: { key: string; label: string };
  id: string;
  title: string;
  fields: ColumnMeta[];
  row: Record<string, any>;
  inlines: Array<{ key: string; label: string; resource: string | null; columns: ColumnMeta[]; rows: Array<Record<string, any>> }>;
  actions: ActionMeta[];
}

export default function ResourceDetailPage() {
  const { resource, id } = useParams<{ resource: string; id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'fail'; text: string } | null>(null);
  const [dialog, setDialog] = useState<ActionMeta | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    apiJson<Detail>(`/api/admin/r/${resource}/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [resource, id]);

  useEffect(load, [load]);

  const actionUrl = (action: ActionMeta) => `/api/admin/r/${resource}/${id}/actions/${action.key}`;

  const run = async (action: ActionMeta) => {
    if (needsDialog(action)) return setDialog(action);
    setBusy(action.key);
    try {
      setNotice({ tone: 'ok', text: (await runAdminAction(actionUrl(action), {})).message });
      load();
    } catch (err: any) {
      setNotice({ tone: 'fail', text: err.message });
    } finally {
      setBusy('');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  // Картинки — отдельной полосой сверху, как превью в карточке
  const images = data.fields.filter((field) => field.type === 'image');
  const fields = data.fields.filter((field) => field.type !== 'image');

  return (
    <div className="space-y-5">
      <div className="text-sm text-gray-500">
        <Link href="/admin" className="hover:underline">
          Главная
        </Link>{' '}
        ›{' '}
        <Link href={`/admin/r/${resource}`} className="hover:underline">
          {data.meta.label}
        </Link>{' '}
        › <span className="text-gray-700">{data.title || data.id}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{data.title || data.id}</h1>
        <div className="flex flex-wrap gap-2">
          {data.actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void run(action)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                action.danger
                  ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                  : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {busy === action.key ? 'Выполняется…' : action.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          className={`flex justify-between rounded-md border p-3 text-sm ${
            notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>
            {notice.tone === 'ok' ? '● ' : '✕ '}
            {notice.text}
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {images.map((field) => (
            <figure key={field.key} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex h-56 w-56 items-center justify-center">
                <Cell column={field} row={data.row} />
              </div>
              <figcaption className="mt-2 text-center text-xs text-gray-500">{field.label}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <Card padded={false}>
        <dl className="divide-y divide-gray-100">
          {fields.map((field) => (
            <div key={field.key} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[220px_1fr] sm:gap-4">
              <dt className="text-gray-500">{field.label}</dt>
              <dd className="min-w-0 text-gray-900">
                <Cell column={field} row={data.row} />
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {data.inlines.map((inline) => (
        <Card key={inline.key} title={`${inline.label} · ${inline.rows.length}`} padded={false}>
          {inline.rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Нет записей</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {inline.columns.map((column) => (
                      <th key={column.key} className="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inline.rows.map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      onClick={() => inline.resource && row.id && router.push(`/admin/r/${inline.resource}/${encodeURIComponent(row.id)}`)}
                      className={inline.resource && row.id ? 'cursor-pointer hover:bg-sky-50/50' : ''}
                    >
                      {inline.columns.map((column) => (
                        <td key={column.key} className="border-b border-gray-100 px-3 py-2 align-top">
                          <Cell column={column} row={row} compact />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}

      {dialog && (
        <ActionDialog
          action={dialog}
          url={actionUrl(dialog)}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            setDialog(null);
            setNotice({ tone: 'ok', text: message });
            load();
          }}
        />
      )}
    </div>
  );
}
