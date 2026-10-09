import { Request } from 'express';

// Описание модели для админки в духе Django: список, фильтры, поиск, карточка,
// действия. SQL пишется здесь целиком — значения из запроса в него не попадают,
// только параметрами

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

export type Tone = 'ok' | 'warn' | 'fail' | 'info' | 'muted';

export interface Column {
  key: string;
  label: string;
  sql: string;
  type?: FieldType;
  sortable?: boolean;
  tones?: Record<string, Tone>;
  // Ссылка на карточку другой модели: id берётся из поля строки
  link?: { resource?: string; resourceField?: string; field: string };
}

export interface FilterOption {
  value: string;
  label: string;
  where: string;
}

export interface Filter {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface ActionField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select';
  required?: boolean;
  default?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ActionContext {
  id: string | null;
  row: Record<string, any> | null;
  input: Record<string, any>;
  req: Request;
}

export interface Action {
  key: string;
  label: string;
  scope: 'row' | 'collection';
  danger?: boolean;
  confirm?: string;
  fields?: ActionField[];
  visible?: (row: Record<string, any>) => boolean;
  // Возвращает текст для админа: что именно произошло
  run: (ctx: ActionContext) => Promise<string>;
}

export interface Inline {
  key: string;
  label: string;
  // $1 — id записи
  sql: string;
  columns: Array<Omit<Column, 'sql'>>;
  resource?: string;
}

export interface Resource {
  key: string;
  label: string;
  group: string;
  description?: string;
  from: string;
  pk: string;
  idType: 'uuid' | 'int' | 'text';
  title: string;
  columns: Column[];
  search?: string[];
  filters?: Filter[];
  defaultOrder: string;
  view?: 'table' | 'gallery';
  detail?: Column[];
  // Служебные поля карточки: нужны условиям видимости действий, не показываются
  hidden?: Record<string, string>;
  inlines?: Inline[];
  actions?: Action[];
}

export class ActionError extends Error {}
