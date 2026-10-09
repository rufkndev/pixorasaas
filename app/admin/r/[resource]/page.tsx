"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiJson } from '../../../lib/authClient';
import { Cell, ColumnMeta, ErrorBox, Spinner } from '../../../components/admin/ui';
import ActionDialog, { ActionMeta, needsDialog, runAdminAction } from '../../../components/admin/ActionDialog';

interface Meta {
  key: string;
  label: string;
  description: string | null;
  view: 'table' | 'gallery';
  searchable: boolean;
  columns: ColumnMeta[];
  filters: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
  collectionActions: ActionMeta[];
}

interface ListResponse {
  meta: Meta;
  rows: Array<Record<string, any>>;
  total: number;
  page: number;
  pageSize: number;
}

function ResourceList() {
  const { resource } = useParams<{ resource: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [dialog, setDialog] = useState<ActionMeta | null>(null);
  const [notice, setNotice] = useState('');

  const query = searchParams.toString();

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    apiJson<ListResponse>(`/api/admin/r/${resource}?${query}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resource, query]);

  useEffect(load, [load]);
  useEffect(() => setSearch(searchParams.get('q') || ''), [searchParams]);

  // Состояние списка живёт в адресе: ссылку на отфильтрованный список можно отправить
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    router.push(`/admin/r/${resource}?${next.toString()}`);
  };

  const sortBy = (column: ColumnMeta) => {
    if (!column.sortable) return;
    const current = searchParams.get('sort');
    const dir = current === column.key && searchParams.get('dir') !== 'asc' ? 'asc' : 'desc';
    update({ sort: column.key, dir });
  };

  const runCollection = async (action: ActionMeta) => {
    if (needsDialog(action)) return setDialog(action);
    try {
      setNotice((await runAdminAction(`/api/admin/r/${resource}/actions/${action.key}`, {})).message);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error && !data) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const { meta, rows, total, page, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = meta.filters.filter((f) => searchParams.get(`f_${f.key}`));
  const visibleColumns = meta.columns.filter((c) => !(meta.view === 'gallery' && c.type === 'image'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{meta.label}</h1>
          {meta.description && <p className="mt-0.5 text-sm text-gray-500">{meta.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.collectionActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => void runCollection(action)}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              {action.label}
            </button>
          ))}
          <a
            href={`/api/admin/r/${resource}/export.csv?${query}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            CSV
          </a>
        </div>
      </div>

      {notice && (
        <div className="flex justify-between rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <span>● {notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}
      {error && <ErrorBox message={error} />}

      <div className="flex flex-col gap-4 xl:flex-row-reverse">
        {meta.filters.length > 0 && (
          <aside className="w-full shrink-0 xl:w-56">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Фильтр</div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 xl:block xl:space-y-4">
                {meta.filters.map((filter) => {
                  const current = searchParams.get(`f_${filter.key}`);
                  return (
                    <div key={filter.key}>
                      <div className="mb-1 text-xs font-medium text-gray-700">{filter.label}</div>
                      <ul className="flex flex-wrap gap-1 text-sm xl:block xl:space-y-0.5">
                        {[{ value: '', label: 'Все' }, ...filter.options].map((option) => (
                          <li key={option.value}>
                            <button
                              type="button"
                              onClick={() => update({ [`f_${filter.key}`]: option.value })}
                              className={`rounded px-1.5 py-0.5 text-left ${
                                (current || '') === option.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {option.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {meta.searchable && (
              <form
                className="flex min-w-0 flex-1 gap-2 sm:max-w-md"
                onSubmit={(event) => {
                  event.preventDefault();
                  update({ q: search.trim() || null });
                }}
              >
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск…"
                  className="min-w-0 flex-1 text-sm"
                />
                <button type="submit" className="rounded-md border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50">
                  Найти
                </button>
              </form>
            )}
            <span className="text-sm text-gray-500">
              {loading ? 'загрузка…' : `${total.toLocaleString('ru-RU')} ${total === 1 ? 'запись' : 'записей'}`}
            </span>
            {(activeFilters.length > 0 || searchParams.get('q')) && (
              <button type="button" onClick={() => router.push(`/admin/r/${resource}`)} className="text-sm text-sky-700 hover:underline">
                сбросить фильтры
              </button>
            )}
          </div>

          {meta.view === 'gallery' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {rows.map((row) => (
                <Link
                  key={row.__id}
                  href={`/admin/r/${resource}/${encodeURIComponent(row.__id)}`}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white hover:border-gray-400"
                >
                  <div className="aspect-square bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                  </div>
                  <div className="space-y-0.5 border-t border-gray-100 p-2 text-xs">
                    <div className="truncate font-medium text-gray-900">{row.name || '—'}</div>
                    <div className="truncate text-gray-500">
                      {[row.style, row.pattern, row.subject].filter(Boolean).join(' · ')}
                    </div>
                    <div className="flex items-center justify-between text-gray-500">
                      <span>{row.is_paid ? <span className="text-emerald-700">✓ оплачен</span> : 'не оплачен'}</span>
                      <span>{new Date(row.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {visibleColumns.map((column) => {
                      const sorted = searchParams.get('sort') === column.key;
                      return (
                        <th
                          key={column.key}
                          onClick={() => sortBy(column)}
                          className={`whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 ${
                            column.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''
                          }`}
                        >
                          {column.label}
                          {column.sortable && (
                            <span className="ml-1 text-gray-400">{sorted ? (searchParams.get('dir') === 'asc' ? '↑' : '↓') : '↕'}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.__id}
                      onClick={() => router.push(`/admin/r/${resource}/${encodeURIComponent(row.__id)}`)}
                      className="cursor-pointer hover:bg-sky-50/50"
                    >
                      {visibleColumns.map((column) => (
                        <td key={column.key} className="border-b border-gray-100 px-3 py-2 align-top">
                          <Cell column={column} row={row} compact />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-3 py-10 text-center text-gray-400">
                        Ничего не найдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                ← Назад
              </button>
              <span className="text-gray-600">
                Страница {page} из {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => update({ page: String(page + 1) })}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      </div>

      {dialog && (
        <ActionDialog
          action={dialog}
          url={`/api/admin/r/${resource}/actions/${dialog.key}`}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            setDialog(null);
            setNotice(message);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function ResourceListPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResourceList />
    </Suspense>
  );
}
