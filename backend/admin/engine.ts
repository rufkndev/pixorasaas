import { query, queryOne } from '../db/pool';
import { Column, Resource } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validId = (resource: Resource, id: string): boolean => {
  if (resource.idType === 'uuid') return UUID.test(id);
  if (resource.idType === 'int') return /^\d{1,18}$/.test(id);
  return id.length > 0 && id.length <= 200;
};

// Только то, что нужно фронту для отрисовки; SQL наружу не уходит
const columnMeta = ({ sql, ...rest }: Column) => rest;

export const resourceMeta = (resource: Resource) => ({
  key: resource.key,
  label: resource.label,
  group: resource.group,
  description: resource.description ?? null,
  view: resource.view ?? 'table',
  searchable: Boolean(resource.search?.length),
  columns: resource.columns.map(columnMeta),
  filters: (resource.filters ?? []).map((filter) => ({
    key: filter.key,
    label: filter.label,
    options: filter.options.map(({ value, label }) => ({ value, label })),
  })),
  collectionActions: (resource.actions ?? [])
    .filter((action) => action.scope === 'collection')
    .map(({ key, label, danger, confirm, fields }) => ({ key, label, danger, confirm, fields })),
});

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
  filters: Record<string, string>;
}

// Значения фильтров сверяются со списком опций, поиск идёт параметром —
// в SQL попадают только строки из описания модели
const buildWhere = (resource: Resource, params: ListParams): { where: string; values: unknown[] } => {
  const clauses: string[] = [];
  const values: unknown[] = [];

  for (const filter of resource.filters ?? []) {
    const chosen = params.filters[filter.key];
    const option = filter.options.find((o) => o.value === chosen);
    if (option) clauses.push(`(${option.where})`);
  }

  const q = params.q?.trim();
  if (q && resource.search?.length) {
    values.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    clauses.push(`(${resource.search.map((expr) => `(${expr})::text ILIKE $${values.length}`).join(' OR ')})`);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
};

const selectList = (resource: Resource): string =>
  [`${resource.pk} AS "__id"`, ...resource.columns.map((c) => `${c.sql} AS "${c.key}"`)].join(', ');

const orderBy = (resource: Resource, params: ListParams): string => {
  const column = resource.columns.find((c) => c.key === params.sort && c.sortable);
  if (!column) return resource.defaultOrder;
  return `${column.sql} ${params.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
};

export const listRows = async (resource: Resource, params: ListParams) => {
  const pageSize = Math.min(Math.max(params.pageSize || 50, 10), 200);
  const page = Math.max(params.page || 1, 1);
  const { where, values } = buildWhere(resource, params);

  const [rows, total] = await Promise.all([
    query(
      `SELECT ${selectList(resource)} FROM ${resource.from} ${where}
        ORDER BY ${orderBy(resource, params)}
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      values
    ),
    queryOne<{ n: string }>(`SELECT COUNT(*) AS n FROM ${resource.from} ${where}`, values),
  ]);

  return { rows, total: Number(total?.n ?? 0), page, pageSize };
};

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text =
    value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Точка с запятой и BOM — иначе русский Excel откроет файл одной колонкой кракозябрами
export const exportCsv = async (resource: Resource, params: ListParams): Promise<string> => {
  const { where, values } = buildWhere(resource, params);
  const rows = await query(
    `SELECT ${selectList(resource)} FROM ${resource.from} ${where} ORDER BY ${orderBy(resource, params)} LIMIT 20000`,
    values
  );

  const columns = resource.columns.filter((c) => c.type !== 'image');
  const lines = [
    columns.map((c) => csvCell(c.label)).join(';'),
    ...rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(';')),
  ];
  return `﻿${lines.join('\r\n')}`;
};

export const detailRow = async (resource: Resource, id: string): Promise<Record<string, any> | null> => {
  const fields = resource.detail ?? resource.columns;
  const select = [
    `${resource.pk} AS "__id"`,
    `${resource.title} AS "__title"`,
    ...fields.map((c) => `${c.sql} AS "${c.key}"`),
    ...Object.entries(resource.hidden ?? {}).map(([key, sql]) => `${sql} AS "${key}"`),
  ].join(', ');

  return queryOne(`SELECT ${select} FROM ${resource.from} WHERE ${resource.pk} = $1`, [id]);
};

export const detailPayload = async (resource: Resource, id: string) => {
  const row = await detailRow(resource, id);
  if (!row) return null;

  const inlines = await Promise.all(
    (resource.inlines ?? []).map(async (inline) => ({
      key: inline.key,
      label: inline.label,
      resource: inline.resource ?? null,
      columns: inline.columns,
      rows: await query(inline.sql, [id]),
    }))
  );

  return {
    id: String(row.__id),
    title: row.__title,
    fields: (resource.detail ?? resource.columns).map(columnMeta),
    row,
    inlines,
    actions: (resource.actions ?? [])
      .filter((action) => action.scope === 'row' && (!action.visible || action.visible(row)))
      .map(({ key, label, danger, confirm, fields }) => ({ key, label, danger, confirm, fields })),
  };
};
