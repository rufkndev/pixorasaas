import { query } from '../db/pool';
import { FREE_GENERATIONS, QUOTA_WINDOW_DAYS } from '../db/repositories';
import { BRAND_STYLES } from '../auth/schemas';
import { LOGO_PATTERNS } from '../utils/logoPatterns';
import { SERVER_EVENTS, CLIENT_EVENTS } from '../services/eventsService';
import { blockedIpsRepo } from '../db/repositories';
import {
  blockIp,
  blockUser,
  grantQuota,
  refundOrder,
  resendBrandbookEmail,
  resetQuota,
  retryDelivery,
  revokeSessions,
  syncPayment,
  unblockUser,
  verifyEmail,
} from './actions';
import { Resource, Tone } from './types';

const WINDOW_EXPIRED = `(g.reset_at IS NULL OR g.reset_at <= now() - INTERVAL '${QUOTA_WINDOW_DAYS} days')`;

const PAYMENT_STATUS_SQL = `CASE
  WHEN p.refunded_amount > 0 THEN 'возврат'
  WHEN p.status = 'succeeded' THEN 'оплачен'
  WHEN p.status = 'canceled' THEN 'отменён'
  ELSE 'ожидает' END`;

const PAYMENT_STATUS_TONES: Record<string, Tone> = {
  оплачен: 'ok',
  ожидает: 'warn',
  отменён: 'muted',
  возврат: 'fail',
};

const DELIVERY_SQL = `CASE
  WHEN p.status <> 'succeeded' THEN '—'
  WHEN p.delivery_status = 'completed' THEN 'выдан'
  WHEN p.delivery_status = 'failed' THEN 'сбой'
  WHEN p.delivery_status = 'processing' THEN 'выдаётся'
  ELSE 'ждёт выдачи' END`;

const DELIVERY_TONES: Record<string, Tone> = {
  выдан: 'ok',
  сбой: 'fail',
  выдаётся: 'info',
  'ждёт выдачи': 'warn',
  '—': 'muted',
};

const PRODUCT_SQL = `CASE p.product_type WHEN 'logo' THEN 'логотип' ELSE 'брендбук' END`;
const PRODUCT_TONES: Record<string, Tone> = { логотип: 'info', брендбук: 'info' };

const USER_STATUS_SQL = `CASE
  WHEN u.deleted_at IS NOT NULL THEN 'удалён'
  WHEN u.blocked_at IS NOT NULL THEN 'заблокирован'
  WHEN u.email_verified_at IS NULL THEN 'не подтверждён'
  ELSE 'активен' END`;

const USER_STATUS_TONES: Record<string, Tone> = {
  активен: 'ok',
  'не подтверждён': 'warn',
  заблокирован: 'fail',
  удалён: 'muted',
};

const BUILD_STATUS_SQL = `CASE b.status WHEN 'completed' THEN 'готов' WHEN 'failed' THEN 'сбой' ELSE 'собирается' END`;
const BUILD_TONES: Record<string, Tone> = { готов: 'ok', сбой: 'fail', собирается: 'info' };

const adminEmail = (ctx: { req: { user?: { email: string } } }): string => ctx.req.user?.email ?? 'admin';

const users: Resource = {
  key: 'users',
  label: 'Пользователи',
  group: 'Клиенты',
  from: `users u LEFT JOIN user_generation_usage g ON g.user_id = u.id`,
  pk: 'u.id',
  idType: 'uuid',
  title: 'u.email',
  columns: [
    { key: 'email', label: 'Почта', sql: 'u.email', sortable: true },
    { key: 'name', label: 'Имя', sql: 'u.full_name' },
    { key: 'status', label: 'Статус', sql: USER_STATUS_SQL, type: 'badge', tones: USER_STATUS_TONES },
    {
      key: 'paid',
      label: 'Оплачено',
      sql: `(SELECT COALESCE(SUM(amount - refunded_amount), 0) FROM payments p WHERE p.user_id = u.id AND p.status = 'succeeded')`,
      type: 'money',
      sortable: true,
    },
    { key: 'logos', label: 'Логотипов', sql: '(SELECT COUNT(*) FROM generated_logos l WHERE l.user_id = u.id)', type: 'number', sortable: true },
    { key: 'source', label: 'Источник', sql: `u.signup_source->>'source'` },
    { key: 'created_at', label: 'Регистрация', sql: 'u.created_at', type: 'datetime', sortable: true },
  ],
  search: ['u.email', 'u.full_name', 'u.id::text'],
  filters: [
    {
      key: 'status',
      label: 'Статус',
      options: [
        { value: 'active', label: 'Активные', where: 'u.deleted_at IS NULL AND u.blocked_at IS NULL AND u.email_verified_at IS NOT NULL' },
        { value: 'unverified', label: 'Не подтвердили почту', where: 'u.deleted_at IS NULL AND u.email_verified_at IS NULL' },
        { value: 'blocked', label: 'Заблокированные', where: 'u.blocked_at IS NOT NULL' },
        { value: 'deleted', label: 'Удалённые', where: 'u.deleted_at IS NOT NULL' },
      ],
    },
    {
      key: 'paying',
      label: 'Покупки',
      options: [
        { value: 'yes', label: 'Платили', where: `EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'succeeded')` },
        { value: 'no', label: 'Не платили', where: `NOT EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'succeeded')` },
      ],
    },
    {
      key: 'quota',
      label: 'Квота',
      options: [
        {
          value: 'exhausted',
          label: 'Исчерпал логотипы',
          where: `g.logos_used >= ${FREE_GENERATIONS} AND NOT ${WINDOW_EXPIRED}`,
        },
      ],
    },
  ],
  defaultOrder: 'u.created_at DESC',
  detail: [
    { key: 'id', label: 'ID', sql: 'u.id', type: 'id' },
    { key: 'email', label: 'Почта', sql: 'u.email' },
    { key: 'name', label: 'Имя', sql: 'u.full_name' },
    { key: 'status', label: 'Статус', sql: USER_STATUS_SQL, type: 'badge', tones: USER_STATUS_TONES },
    { key: 'created_at', label: 'Регистрация', sql: 'u.created_at', type: 'datetime' },
    { key: 'verified_at', label: 'Почта подтверждена', sql: 'u.email_verified_at', type: 'datetime' },
    { key: 'blocked_at', label: 'Заблокирован', sql: 'u.blocked_at', type: 'datetime' },
    { key: 'deleted_at', label: 'Удалён', sql: 'u.deleted_at', type: 'datetime' },
    {
      key: 'paid',
      label: 'Оплачено всего',
      sql: `(SELECT COALESCE(SUM(amount - refunded_amount), 0) FROM payments p WHERE p.user_id = u.id AND p.status = 'succeeded')`,
      type: 'money',
    },
    { key: 'names_used', label: 'Генераций названий в окне', sql: `CASE WHEN ${WINDOW_EXPIRED} THEN 0 ELSE g.names_used END`, type: 'number' },
    { key: 'logos_used', label: 'Генераций логотипов в окне', sql: `CASE WHEN ${WINDOW_EXPIRED} THEN 0 ELSE g.logos_used END`, type: 'number' },
    { key: 'renews_at', label: 'Квота обновится', sql: `CASE WHEN ${WINDOW_EXPIRED} THEN NULL ELSE g.reset_at + INTERVAL '${QUOTA_WINDOW_DAYS} days' END`, type: 'datetime' },
    { key: 'sessions', label: 'Активных сессий', sql: '(SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now())', type: 'number' },
    { key: 'last_seen', label: 'Последний раз на сайте', sql: '(SELECT MAX(last_used_at) FROM sessions s WHERE s.user_id = u.id)', type: 'datetime' },
    { key: 'last_ip', label: 'Последний IP', sql: '(SELECT host(ip) FROM sessions s WHERE s.user_id = u.id ORDER BY last_used_at DESC LIMIT 1)' },
    { key: 'source', label: 'Откуда пришёл', sql: 'u.signup_source', type: 'json' },
  ],
  hidden: {
    _verified: 'u.email_verified_at IS NOT NULL',
    _blocked: 'u.blocked_at IS NOT NULL',
    _deleted: 'u.deleted_at IS NOT NULL',
  },
  inlines: [
    {
      key: 'payments',
      label: 'Заказы',
      resource: 'payments',
      sql: `SELECT p.order_id AS id, ${PRODUCT_SQL} AS product, p.amount, ${PAYMENT_STATUS_SQL} AS status,
                   ${DELIVERY_SQL} AS delivery, p.created_at
              FROM payments p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50`,
      columns: [
        { key: 'id', label: 'Заказ', type: 'id' },
        { key: 'product', label: 'Товар', type: 'badge', tones: PRODUCT_TONES },
        { key: 'amount', label: 'Сумма', type: 'money' },
        { key: 'status', label: 'Оплата', type: 'badge', tones: PAYMENT_STATUS_TONES },
        { key: 'delivery', label: 'Выдача', type: 'badge', tones: DELIVERY_TONES },
        { key: 'created_at', label: 'Создан', type: 'datetime' },
      ],
    },
    {
      key: 'logos',
      label: 'Логотипы',
      resource: 'logos',
      sql: `SELECT l.id, l.logo_url AS image, l.name, l.style, l.is_paid, l.created_at
              FROM generated_logos l WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 60`,
      columns: [
        { key: 'image', label: '', type: 'image' },
        { key: 'name', label: 'Название' },
        { key: 'style', label: 'Стиль' },
        { key: 'is_paid', label: 'Оплачен', type: 'bool' },
        { key: 'created_at', label: 'Создан', type: 'datetime' },
      ],
    },
    {
      key: 'names',
      label: 'Генерации названий',
      resource: 'names',
      sql: `SELECT n.id, n.industry, n.style,
                   (SELECT string_agg(COALESCE(x->>'name', x#>>'{}'), ', ') FROM jsonb_array_elements(n.names) x) AS names,
                   n.created_at
              FROM generated_names n WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 30`,
      columns: [
        { key: 'industry', label: 'Ниша' },
        { key: 'style', label: 'Стиль' },
        { key: 'names', label: 'Названия', type: 'longtext' },
        { key: 'created_at', label: 'Когда', type: 'datetime' },
      ],
    },
    {
      key: 'events',
      label: 'События',
      sql: `SELECT e.name, e.props, e.at FROM app_events e WHERE e.user_id = $1 ORDER BY e.at DESC LIMIT 50`,
      columns: [
        { key: 'name', label: 'Событие', type: 'badge' },
        { key: 'props', label: 'Детали', type: 'json' },
        { key: 'at', label: 'Когда', type: 'datetime' },
      ],
    },
    {
      key: 'consents',
      label: 'Согласия',
      sql: `SELECT c.kind, c.doc_version, c.source, c.granted_at, c.revoked_at, host(c.ip) AS ip
              FROM user_consents c WHERE c.user_id = $1 ORDER BY c.granted_at DESC`,
      columns: [
        { key: 'kind', label: 'Вид', type: 'badge' },
        { key: 'doc_version', label: 'Версия' },
        { key: 'source', label: 'Где' },
        { key: 'granted_at', label: 'Дано', type: 'datetime' },
        { key: 'revoked_at', label: 'Отозвано', type: 'datetime' },
        { key: 'ip', label: 'IP' },
      ],
    },
  ],
  actions: [
    {
      key: 'verify_email',
      label: 'Подтвердить почту',
      scope: 'row',
      visible: (row) => !row._verified && !row._deleted,
      run: ({ id }) => verifyEmail(id!),
    },
    {
      key: 'reset_quota',
      label: 'Сбросить квоту',
      scope: 'row',
      confirm: `Счётчики обнулятся, окно в ${QUOTA_WINDOW_DAYS} дней начнётся заново.`,
      visible: (row) => !row._deleted,
      run: ({ id }) => resetQuota(id!),
    },
    {
      key: 'grant_quota',
      label: 'Подарить генерации',
      scope: 'row',
      visible: (row) => !row._deleted,
      fields: [
        { key: 'logos', label: 'Логотипов', type: 'number', default: 5 },
        { key: 'names', label: 'Генераций названий', type: 'number', default: 0 },
      ],
      run: ({ id, input }) => grantQuota(id!, Number(input.names || 0), Number(input.logos || 0)),
    },
    {
      key: 'revoke_sessions',
      label: 'Завершить сессии',
      scope: 'row',
      confirm: 'Пользователя выкинет со всех устройств.',
      run: ({ id }) => revokeSessions(id!),
    },
    {
      key: 'block',
      label: 'Заблокировать',
      scope: 'row',
      danger: true,
      confirm: 'Пользователь не сможет войти, все сессии завершатся. Оплаченные заказы останутся.',
      visible: (row) => !row._blocked && !row._deleted,
      fields: [{ key: 'reason', label: 'Причина (для журнала)', type: 'text' }],
      run: ({ id }) => blockUser(id!),
    },
    {
      key: 'unblock',
      label: 'Разблокировать',
      scope: 'row',
      visible: (row) => row._blocked,
      run: ({ id }) => unblockUser(id!),
    },
  ],
};

const payments: Resource = {
  key: 'payments',
  label: 'Заказы',
  group: 'Продажи',
  description: 'Платежи ЮKassa и выдача товара',
  from: `payments p LEFT JOIN users u ON u.id = p.user_id`,
  pk: 'p.order_id',
  idType: 'uuid',
  title: `${PRODUCT_SQL} || ' · ' || COALESCE(p.product_data->>'name', '')`,
  columns: [
    { key: 'order_id', label: 'Заказ', sql: 'p.order_id', type: 'id' },
    { key: 'name', label: 'Бренд', sql: `p.product_data->>'name'` },
    { key: 'product', label: 'Товар', sql: PRODUCT_SQL, type: 'badge', tones: PRODUCT_TONES },
    { key: 'amount', label: 'Сумма', sql: 'p.amount', type: 'money', sortable: true },
    { key: 'status', label: 'Оплата', sql: PAYMENT_STATUS_SQL, type: 'badge', tones: PAYMENT_STATUS_TONES },
    { key: 'delivery', label: 'Выдача', sql: DELIVERY_SQL, type: 'badge', tones: DELIVERY_TONES },
    { key: 'attempts', label: 'Попыток', sql: 'p.delivery_attempts', type: 'number', sortable: true },
    { key: 'email', label: 'Почта', sql: `COALESCE(u.email::text, p.product_data->>'email')` },
    { key: 'created_at', label: 'Создан', sql: 'p.created_at', type: 'datetime', sortable: true },
    { key: 'paid_at', label: 'Оплачен', sql: 'p.paid_at', type: 'datetime', sortable: true },
  ],
  search: ['p.order_id::text', 'p.yookassa_payment_id', `p.product_data->>'email'`, 'u.email::text', `p.product_data->>'name'`],
  filters: [
    {
      key: 'problem',
      label: 'Проблемы',
      options: [
        { value: 'undelivered', label: 'Оплачено, не выдано', where: `p.status = 'succeeded' AND p.delivery_status <> 'completed'` },
        { value: 'exhausted', label: 'Попытки исчерпаны', where: `p.status = 'succeeded' AND p.delivery_status <> 'completed' AND p.delivery_attempts >= 5` },
        { value: 'error', label: 'Была ошибка выдачи', where: 'p.delivery_error IS NOT NULL' },
        { value: 'retried', label: 'Выдано не с первой попытки', where: `p.delivery_status = 'completed' AND p.delivery_attempts > 1` },
      ],
    },
    {
      key: 'status',
      label: 'Оплата',
      options: [
        { value: 'succeeded', label: 'Оплачен', where: `p.status = 'succeeded' AND p.refunded_amount = 0` },
        { value: 'pending', label: 'Ожидает', where: `p.status IN ('pending', 'waiting_for_capture')` },
        { value: 'canceled', label: 'Отменён', where: `p.status = 'canceled'` },
        { value: 'refunded', label: 'Возврат', where: 'p.refunded_amount > 0' },
      ],
    },
    {
      key: 'product',
      label: 'Товар',
      options: [
        { value: 'logo', label: 'Логотип', where: `p.product_type = 'logo'` },
        { value: 'brandbook', label: 'Брендбук', where: `p.product_type = 'brandbook'` },
      ],
    },
  ],
  defaultOrder: 'p.created_at DESC',
  detail: [
    { key: 'order_id', label: 'Номер заказа', sql: 'p.order_id', type: 'id' },
    { key: 'yookassa', label: 'Платёж ЮKassa', sql: 'p.yookassa_payment_id', type: 'id' },
    { key: 'user', label: 'Пользователь', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'product', label: 'Товар', sql: PRODUCT_SQL, type: 'badge', tones: PRODUCT_TONES },
    { key: 'name', label: 'Бренд', sql: `p.product_data->>'name'` },
    { key: 'amount', label: 'Сумма', sql: 'p.amount', type: 'money' },
    { key: 'status', label: 'Оплата', sql: PAYMENT_STATUS_SQL, type: 'badge', tones: PAYMENT_STATUS_TONES },
    { key: 'refunded', label: 'Возвращено', sql: 'p.refunded_amount', type: 'money' },
    { key: 'delivery', label: 'Выдача', sql: DELIVERY_SQL, type: 'badge', tones: DELIVERY_TONES },
    { key: 'attempts', label: 'Попыток выдачи', sql: 'p.delivery_attempts', type: 'number' },
    { key: 'delivery_error', label: 'Ошибка выдачи', sql: 'p.delivery_error', type: 'longtext' },
    { key: 'genapi_cost', label: 'Себестоимость GenAPI (смета)', sql: '(SELECT COALESCE(SUM(est_cost), 0) FROM genapi_calls c WHERE c.order_id = p.order_id)', type: 'money' },
    { key: 'created_at', label: 'Создан', sql: 'p.created_at', type: 'datetime' },
    { key: 'paid_at', label: 'Оплачен', sql: 'p.paid_at', type: 'datetime' },
    { key: 'delivered_at', label: 'Выдан', sql: 'p.delivered_at', type: 'datetime' },
    { key: 'refunded_at', label: 'Возврат', sql: 'p.refunded_at', type: 'datetime' },
    { key: 'brandbook', label: 'Брендбук', sql: `(SELECT b.business_name FROM brandbooks b WHERE b.order_id = p.order_id::text)`, link: { resource: 'brandbooks', field: 'brandbook_id' } },
    { key: 'logo', label: 'Логотип', sql: `p.product_data->>'logoId'`, link: { resource: 'logos', field: 'logo' } },
    { key: 'product_data', label: 'Данные заказа', sql: 'p.product_data', type: 'json' },
  ],
  hidden: {
    user_id: 'p.user_id',
    brandbook_id: `(SELECT b.id FROM brandbooks b WHERE b.order_id = p.order_id::text)`,
    _status: 'p.status',
    _product: 'p.product_type',
    _delivery: 'p.delivery_status',
    _refunded: 'p.refunded_amount > 0',
    _has_yookassa: 'p.yookassa_payment_id IS NOT NULL',
    _bb_status: `(SELECT b.status FROM brandbooks b WHERE b.order_id = p.order_id::text)`,
  },
  inlines: [
    {
      key: 'steps',
      label: 'Шаги сборки брендбука',
      sql: `SELECT s->>'label' AS label, s->>'state' AS state, s->>'error' AS error, (s->>'at')::timestamptz AS at
              FROM brandbooks b, jsonb_array_elements(b.build_steps) s
             WHERE b.order_id = $1::text`,
      columns: [
        { key: 'label', label: 'Шаг' },
        { key: 'state', label: 'Состояние', type: 'badge', tones: { done: 'ok', running: 'info', failed: 'fail', skipped: 'muted', pending: 'muted' } },
        { key: 'error', label: 'Ошибка', type: 'longtext' },
        { key: 'at', label: 'Когда', type: 'datetime' },
      ],
    },
    {
      key: 'calls',
      label: 'Вызовы GenAPI по заказу',
      sql: `SELECT c.at, c.model, c.label, c.ok, c.duration_ms, c.est_cost, c.error
              FROM genapi_calls c WHERE c.order_id = $1::uuid ORDER BY c.at`,
      columns: [
        { key: 'at', label: 'Когда', type: 'datetime' },
        { key: 'label', label: 'Что' },
        { key: 'model', label: 'Модель' },
        { key: 'ok', label: 'Успех', type: 'bool' },
        { key: 'duration_ms', label: 'мс', type: 'number' },
        { key: 'est_cost', label: '₽', type: 'money' },
        { key: 'error', label: 'Ошибка', type: 'longtext' },
      ],
    },
    {
      key: 'audit',
      label: 'Действия админа',
      sql: `SELECT a.created_at, a.admin_email, a.action, a.details FROM admin_actions a
             WHERE a.target_type = 'payments' AND a.target_id = $1::text ORDER BY a.created_at DESC`,
      columns: [
        { key: 'created_at', label: 'Когда', type: 'datetime' },
        { key: 'admin_email', label: 'Кто' },
        { key: 'action', label: 'Действие', type: 'badge' },
        { key: 'details', label: 'Детали', type: 'json' },
      ],
    },
  ],
  actions: [
    {
      key: 'retry_delivery',
      label: 'Повторить выдачу',
      scope: 'row',
      confirm: 'Счётчик попыток обнулится, выдача запустится сразу.',
      visible: (row) => row._status === 'succeeded' && row._delivery !== 'completed' && !row._refunded,
      run: ({ id }) => retryDelivery(id!, false),
    },
    {
      key: 'rebuild',
      label: 'Пересобрать брендбук',
      scope: 'row',
      confirm: 'Брендбук соберётся заново, покупатель получит письмо о готовности. Вызовы моделей будут оплачены ещё раз.',
      visible: (row) => row._status === 'succeeded' && row._product === 'brandbook' && !row._refunded,
      run: ({ id }) => retryDelivery(id!, true),
    },
    {
      key: 'sync',
      label: 'Сверить с ЮKassa',
      scope: 'row',
      visible: (row) => row._status !== 'succeeded' && row._has_yookassa,
      run: ({ id }) => syncPayment(id!),
    },
    {
      key: 'resend_email',
      label: 'Отправить письмо о готовности',
      scope: 'row',
      visible: (row) => row._product === 'brandbook' && row._bb_status === 'completed',
      run: ({ id }) => resendBrandbookEmail(id!),
    },
    {
      key: 'refund',
      label: 'Вернуть деньги',
      scope: 'row',
      danger: true,
      confirm: 'Полная сумма вернётся покупателю через ЮKassa, чек возврата уйдёт на почту из заказа. Отменить нельзя.',
      visible: (row) => row._status === 'succeeded' && !row._refunded && row._has_yookassa,
      fields: [
        { key: 'revoke', label: 'Закрыть доступ к файлам', type: 'boolean', default: true },
        { key: 'reason', label: 'Причина (уйдёт в описание возврата)', type: 'text' },
      ],
      run: ({ id, input }) => refundOrder(id!, Boolean(input.revoke), String(input.reason || '').slice(0, 120)),
    },
  ],
};

const brandbooks: Resource = {
  key: 'brandbooks',
  label: 'Брендбуки',
  group: 'Продажи',
  from: `brandbooks b LEFT JOIN users u ON u.id = b.user_id`,
  pk: 'b.id',
  idType: 'int',
  title: 'b.business_name',
  columns: [
    { key: 'business_name', label: 'Бренд', sql: 'b.business_name', sortable: true },
    { key: 'status', label: 'Сборка', sql: BUILD_STATUS_SQL, type: 'badge', tones: BUILD_TONES },
    { key: 'progress', label: '%', sql: 'b.build_progress', type: 'number' },
    { key: 'step', label: 'Шаг', sql: 'b.build_step' },
    { key: 'style', label: 'Стиль', sql: 'b.style' },
    { key: 'email_sent', label: 'Письмо', sql: 'b.email_sent_at IS NOT NULL', type: 'bool' },
    { key: 'email', label: 'Покупатель', sql: 'u.email' },
    { key: 'created_at', label: 'Создан', sql: 'b.created_at', type: 'datetime', sortable: true },
    { key: 'completed_at', label: 'Готов', sql: 'b.completed_at', type: 'datetime', sortable: true },
  ],
  search: ['b.business_name', 'b.order_id', 'u.email::text'],
  filters: [
    {
      key: 'status',
      label: 'Сборка',
      options: [
        { value: 'completed', label: 'Готов', where: `b.status = 'completed'` },
        { value: 'processing', label: 'Собирается', where: `b.status = 'processing'` },
        { value: 'failed', label: 'Сбой', where: `b.status = 'failed'` },
      ],
    },
    {
      key: 'email',
      label: 'Письмо',
      options: [{ value: 'missing', label: 'Готов, письмо не ушло', where: `b.status = 'completed' AND b.email_sent_at IS NULL` }],
    },
    {
      key: 'degraded',
      label: 'Качество',
      options: [{ value: 'yes', label: 'Есть пропущенные шаги', where: `b.build_steps @> '[{"state":"failed"}]'::jsonb` }],
    },
  ],
  defaultOrder: 'b.created_at DESC',
  detail: [
    { key: 'business_name', label: 'Бренд', sql: 'b.business_name' },
    { key: 'order', label: 'Заказ', sql: 'b.order_id', type: 'id', link: { resource: 'payments', field: 'order' } },
    { key: 'user', label: 'Покупатель', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'status', label: 'Сборка', sql: BUILD_STATUS_SQL, type: 'badge', tones: BUILD_TONES },
    { key: 'progress', label: 'Прогресс, %', sql: 'b.build_progress', type: 'number' },
    { key: 'build_error', label: 'Ошибка сборки', sql: 'b.build_error', type: 'longtext' },
    { key: 'style', label: 'Стиль', sql: 'b.style' },
    { key: 'industry', label: 'Ниша', sql: 'b.industry' },
    { key: 'slogan', label: 'Слоган', sql: 'b.slogan' },
    { key: 'logo', label: 'Логотип', sql: 'b.original_logo_url', type: 'image' },
    { key: 'build_started_at', label: 'Сборка начата', sql: 'b.build_started_at', type: 'datetime' },
    { key: 'completed_at', label: 'Готов', sql: 'b.completed_at', type: 'datetime' },
    { key: 'build_minutes', label: 'Сборка заняла, мин', sql: `ROUND(EXTRACT(EPOCH FROM b.completed_at - b.build_started_at) / 60, 1)`, type: 'number' },
    { key: 'email_sent_at', label: 'Письмо отправлено', sql: 'b.email_sent_at', type: 'datetime' },
    { key: 'payment_status', label: 'Статус оплаты в брендбуке', sql: 'b.payment_status' },
    { key: 'assets', label: 'Файлы', sql: 'b.assets', type: 'json' },
  ],
  hidden: { user_id: 'b.user_id', _status: 'b.status', _order: 'b.order_id' },
  inlines: [
    {
      key: 'steps',
      label: 'Шаги сборки',
      sql: `SELECT s->>'label' AS label, s->>'state' AS state, s->>'error' AS error, (s->>'at')::timestamptz AS at
              FROM brandbooks b, jsonb_array_elements(b.build_steps) s WHERE b.id = $1`,
      columns: [
        { key: 'label', label: 'Шаг' },
        { key: 'state', label: 'Состояние', type: 'badge', tones: { done: 'ok', running: 'info', failed: 'fail', skipped: 'muted', pending: 'muted' } },
        { key: 'error', label: 'Ошибка', type: 'longtext' },
        { key: 'at', label: 'Когда', type: 'datetime' },
      ],
    },
  ],
  actions: [
    {
      key: 'rebuild',
      label: 'Пересобрать',
      scope: 'row',
      confirm: 'Брендбук соберётся заново, покупатель получит письмо о готовности. Вызовы моделей будут оплачены ещё раз.',
      run: ({ row }) => retryDelivery(row!._order, true),
    },
    {
      key: 'resend_email',
      label: 'Отправить письмо о готовности',
      scope: 'row',
      visible: (row) => row._status === 'completed',
      run: ({ row }) => resendBrandbookEmail(row!._order),
    },
  ],
};

const logos: Resource = {
  key: 'logos',
  label: 'Логотипы',
  group: 'Контент',
  description: 'Галерея для оценки качества генераций',
  from: `generated_logos l LEFT JOIN users u ON u.id = l.user_id`,
  pk: 'l.id',
  idType: 'int',
  title: `COALESCE(l.name, 'Логотип ' || l.id)`,
  view: 'gallery',
  columns: [
    { key: 'image', label: 'Превью', sql: 'l.logo_url', type: 'image' },
    { key: 'name', label: 'Название', sql: 'l.name', sortable: true },
    { key: 'style', label: 'Стиль', sql: 'l.style' },
    { key: 'pattern', label: 'Приём', sql: 'l.pattern' },
    { key: 'subject', label: 'Предмет', sql: 'l.subject' },
    { key: 'industry', label: 'Ниша', sql: 'l.industry' },
    { key: 'is_paid', label: 'Оплачен', sql: 'l.is_paid', type: 'bool' },
    { key: 'email', label: 'Пользователь', sql: 'u.email' },
    { key: 'created_at', label: 'Создан', sql: 'l.created_at', type: 'datetime', sortable: true },
  ],
  search: ['l.name', 'l.industry', 'l.subject', 'u.email::text', 'l.id::text'],
  filters: [
    {
      key: 'paid',
      label: 'Оплата',
      options: [
        { value: 'yes', label: 'Оплаченные', where: 'l.is_paid' },
        { value: 'no', label: 'Неоплаченные', where: 'NOT l.is_paid' },
      ],
    },
    {
      key: 'style',
      label: 'Стиль',
      options: BRAND_STYLES.map((style) => ({ value: style, label: style, where: `l.style = '${style}'` })),
    },
    {
      key: 'pattern',
      label: 'Приём',
      options: Object.values(LOGO_PATTERNS).map((pattern) => ({
        value: pattern.id,
        label: pattern.label,
        where: `l.pattern = '${pattern.id}'`,
      })),
    },
  ],
  defaultOrder: 'l.created_at DESC',
  detail: [
    { key: 'preview', label: 'Превью (видит клиент)', sql: 'l.logo_url', type: 'image' },
    { key: 'original', label: 'Чистый файл', sql: `'/api/admin/logos/' || l.id || '/file?kind=source'`, type: 'image' },
    { key: 'raw', label: 'Кадр модели', sql: `'/api/admin/logos/' || l.id || '/file?kind=raw'`, type: 'image' },
    { key: 'name', label: 'Название', sql: 'l.name' },
    { key: 'user', label: 'Пользователь', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'is_paid', label: 'Оплачен', sql: 'l.is_paid', type: 'bool' },
    { key: 'order', label: 'Заказ', sql: 'l.order_id', type: 'id', link: { resource: 'payments', field: 'order' } },
    { key: 'style', label: 'Стиль', sql: 'l.style' },
    { key: 'pattern', label: 'Приём', sql: 'l.pattern' },
    { key: 'subject', label: 'Предмет', sql: 'l.subject' },
    { key: 'industry', label: 'Ниша', sql: 'l.industry' },
    { key: 'keywords', label: 'Ключевые слова', sql: 'l.keywords' },
    { key: 'concept', label: 'Концепция', sql: 'l.concept', type: 'longtext' },
    { key: 'palette', label: 'Палитра', sql: 'l.palette', type: 'json' },
    { key: 'font', label: 'Шрифт надписи', sql: 'l.lockup_font' },
    { key: 'has_svg', label: 'Есть вектор', sql: 'l.original_svg_url IS NOT NULL', type: 'bool' },
    { key: 'created_at', label: 'Создан', sql: 'l.created_at', type: 'datetime' },
  ],
  hidden: { user_id: 'l.user_id' },
};

const names: Resource = {
  key: 'names',
  label: 'Генерации названий',
  group: 'Контент',
  from: `generated_names n LEFT JOIN users u ON u.id = n.user_id`,
  pk: 'n.id',
  idType: 'int',
  title: `COALESCE(n.industry, 'Генерация ' || n.id)`,
  columns: [
    { key: 'industry', label: 'Ниша', sql: 'n.industry' },
    { key: 'style', label: 'Стиль', sql: 'n.style' },
    { key: 'keywords', label: 'Ключевые слова', sql: 'n.keywords' },
    {
      key: 'names',
      label: 'Названия',
      sql: `(SELECT string_agg(COALESCE(x->>'name', x#>>'{}'), ', ') FROM jsonb_array_elements(n.names) x)`,
      type: 'longtext',
    },
    { key: 'email', label: 'Пользователь', sql: 'u.email' },
    { key: 'created_at', label: 'Когда', sql: 'n.created_at', type: 'datetime', sortable: true },
  ],
  search: ['n.industry', 'n.keywords', 'n.names::text', 'u.email::text'],
  filters: [
    {
      key: 'style',
      label: 'Стиль',
      options: BRAND_STYLES.map((style) => ({ value: style, label: style, where: `n.style = '${style}'` })),
    },
  ],
  defaultOrder: 'n.created_at DESC',
  detail: [
    { key: 'user', label: 'Пользователь', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'industry', label: 'Ниша', sql: 'n.industry' },
    { key: 'style', label: 'Стиль', sql: 'n.style' },
    { key: 'keywords', label: 'Ключевые слова', sql: 'n.keywords' },
    { key: 'preferences', label: 'Пожелания', sql: 'n.preferences' },
    { key: 'names', label: 'Названия', sql: 'n.names', type: 'json' },
    { key: 'created_at', label: 'Когда', sql: 'n.created_at', type: 'datetime' },
  ],
  hidden: { user_id: 'n.user_id' },
};

const messages: Resource = {
  key: 'messages',
  label: 'Обращения',
  group: 'Клиенты',
  description: 'Форма обратной связи',
  from: `contact_messages m LEFT JOIN users u ON u.id = m.user_id`,
  pk: 'm.id',
  idType: 'int',
  title: `m.name || ' · ' || m.email`,
  columns: [
    { key: 'state', label: 'Статус', sql: `CASE WHEN m.handled_at IS NULL THEN 'новое' ELSE 'обработано' END`, type: 'badge', tones: { новое: 'warn', обработано: 'muted' } },
    { key: 'name', label: 'Имя', sql: 'm.name' },
    { key: 'email', label: 'Почта', sql: 'm.email' },
    { key: 'message', label: 'Сообщение', sql: 'left(m.message, 200)', type: 'longtext' },
    { key: 'created_at', label: 'Когда', sql: 'm.created_at', type: 'datetime', sortable: true },
  ],
  search: ['m.name', 'm.email::text', 'm.message'],
  filters: [
    {
      key: 'state',
      label: 'Статус',
      options: [
        { value: 'new', label: 'Новые', where: 'm.handled_at IS NULL' },
        { value: 'handled', label: 'Обработанные', where: 'm.handled_at IS NOT NULL' },
      ],
    },
  ],
  defaultOrder: 'm.created_at DESC',
  detail: [
    { key: 'name', label: 'Имя', sql: 'm.name' },
    { key: 'email', label: 'Почта', sql: 'm.email' },
    { key: 'user', label: 'Аккаунт', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'message', label: 'Сообщение', sql: 'm.message', type: 'longtext' },
    { key: 'ip', label: 'IP', sql: 'host(m.ip)' },
    { key: 'created_at', label: 'Получено', sql: 'm.created_at', type: 'datetime' },
    { key: 'handled_at', label: 'Обработано', sql: 'm.handled_at', type: 'datetime' },
  ],
  hidden: { user_id: 'm.user_id', _handled: 'm.handled_at IS NOT NULL' },
  actions: [
    {
      key: 'handled',
      label: 'Отметить обработанным',
      scope: 'row',
      visible: (row) => !row._handled,
      run: async ({ id }) => {
        await query('UPDATE contact_messages SET handled_at = now() WHERE id = $1', [id]);
        return 'Отмечено обработанным';
      },
    },
    {
      key: 'reopen',
      label: 'Вернуть в новые',
      scope: 'row',
      visible: (row) => row._handled,
      run: async ({ id }) => {
        await query('UPDATE contact_messages SET handled_at = NULL WHERE id = $1', [id]);
        return 'Обращение снова в новых';
      },
    },
  ],
};

const consents: Resource = {
  key: 'consents',
  label: 'Согласия',
  group: 'Клиенты',
  description: 'Журнал согласий — только чтение',
  from: `user_consents c LEFT JOIN users u ON u.id = c.user_id`,
  pk: 'c.id',
  idType: 'int',
  title: `c.kind || ' · ' || COALESCE(c.subject::text, u.email::text, '')`,
  columns: [
    { key: 'kind', label: 'Вид', sql: 'c.kind', type: 'badge' },
    { key: 'doc_version', label: 'Версия', sql: 'c.doc_version' },
    { key: 'source', label: 'Где', sql: 'c.source' },
    { key: 'subject', label: 'Почта', sql: 'COALESCE(c.subject::text, u.email::text)' },
    { key: 'granted_at', label: 'Дано', sql: 'c.granted_at', type: 'datetime', sortable: true },
    { key: 'revoked_at', label: 'Отозвано', sql: 'c.revoked_at', type: 'datetime' },
    { key: 'ip', label: 'IP', sql: 'host(c.ip)' },
  ],
  search: ['c.subject::text', 'u.email::text'],
  filters: [
    {
      key: 'kind',
      label: 'Вид',
      options: ['pdn', 'offer', 'marketing', 'cookies'].map((kind) => ({ value: kind, label: kind, where: `c.kind = '${kind}'` })),
    },
    {
      key: 'source',
      label: 'Где',
      options: ['registration', 'contact_form', 'payment'].map((source) => ({ value: source, label: source, where: `c.source = '${source}'` })),
    },
  ],
  defaultOrder: 'c.granted_at DESC',
  detail: [
    { key: 'kind', label: 'Вид', sql: 'c.kind', type: 'badge' },
    { key: 'doc_version', label: 'Версия документа', sql: 'c.doc_version' },
    { key: 'source', label: 'Где', sql: 'c.source' },
    { key: 'subject', label: 'Почта', sql: 'c.subject' },
    { key: 'user', label: 'Аккаунт', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'granted_at', label: 'Дано', sql: 'c.granted_at', type: 'datetime' },
    { key: 'revoked_at', label: 'Отозвано', sql: 'c.revoked_at', type: 'datetime' },
    { key: 'ip', label: 'IP', sql: 'host(c.ip)' },
    { key: 'user_agent', label: 'Браузер', sql: 'c.user_agent', type: 'longtext' },
  ],
  hidden: { user_id: 'c.user_id' },
};

const ipUsage: Resource = {
  key: 'ip-usage',
  label: 'Генерации по адресам',
  group: 'Защита',
  description: 'Счётчики лимита на адрес за последние 7 дней — здесь виден фарм',
  from: 'ip_generation_usage iu',
  pk: `iu.ip_key || '|' || iu.kind || '|' || iu.day`,
  idType: 'text',
  title: 'iu.ip_key',
  columns: [
    { key: 'ip_key', label: 'Адрес / подсеть', sql: 'iu.ip_key' },
    { key: 'kind', label: 'Что', sql: `CASE iu.kind WHEN 'logos' THEN 'логотипы' ELSE 'названия' END` },
    { key: 'day', label: 'День', sql: `to_char(iu.day, 'DD.MM.YYYY')` },
    { key: 'used', label: 'Генераций', sql: 'iu.used', type: 'number', sortable: true },
    { key: 'blocked', label: 'В блок-листе', sql: 'EXISTS (SELECT 1 FROM blocked_ips b WHERE b.ip_key = iu.ip_key)', type: 'bool' },
  ],
  search: ['iu.ip_key'],
  filters: [
    {
      key: 'heavy',
      label: 'Нагрузка',
      options: [{ value: 'limit', label: 'Упёрлись в лимит', where: 'iu.used >= 10' }],
    },
  ],
  defaultOrder: 'iu.day DESC, iu.used DESC',
  hidden: { _ip: 'iu.ip_key' },
  actions: [
    {
      key: 'block',
      label: 'Заблокировать адрес',
      scope: 'row',
      danger: true,
      confirm: 'С этого адреса нельзя будет регистрироваться и делать бесплатные генерации. Платящих это тоже коснётся.',
      fields: [{ key: 'reason', label: 'Причина', type: 'text' }],
      run: (ctx) => blockIp(ctx.row!._ip, ctx.input.reason || null, adminEmail(ctx)),
    },
  ],
};

const blockedIps: Resource = {
  key: 'blocked-ips',
  label: 'Блок-лист адресов',
  group: 'Защита',
  from: 'blocked_ips bi',
  pk: 'bi.ip_key',
  idType: 'text',
  title: 'bi.ip_key',
  columns: [
    { key: 'ip_key', label: 'Адрес / подсеть', sql: 'bi.ip_key' },
    { key: 'reason', label: 'Причина', sql: 'bi.reason' },
    { key: 'created_by', label: 'Кто добавил', sql: 'bi.created_by' },
    { key: 'created_at', label: 'Когда', sql: 'bi.created_at', type: 'datetime', sortable: true },
  ],
  search: ['bi.ip_key', 'bi.reason'],
  defaultOrder: 'bi.created_at DESC',
  actions: [
    {
      key: 'add',
      label: 'Добавить адрес',
      scope: 'collection',
      fields: [
        { key: 'ip', label: 'IP-адрес (IPv6 заблокируется подсетью /64)', type: 'text', required: true },
        { key: 'reason', label: 'Причина', type: 'text' },
      ],
      run: (ctx) => blockIp(String(ctx.input.ip || ''), ctx.input.reason || null, adminEmail(ctx)),
    },
    {
      key: 'remove',
      label: 'Убрать из блок-листа',
      scope: 'row',
      danger: true,
      run: async ({ id }) => {
        await blockedIpsRepo.remove(id!);
        return 'Адрес убран из блок-листа';
      },
    },
  ],
};

const events: Resource = {
  key: 'events',
  label: 'События',
  group: 'Журналы',
  description: 'Продуктовые события для аналитики',
  from: 'app_events e LEFT JOIN users u ON u.id = e.user_id',
  pk: 'e.id',
  idType: 'int',
  title: 'e.name',
  columns: [
    { key: 'at', label: 'Когда', sql: 'e.at', type: 'datetime', sortable: true },
    { key: 'name', label: 'Событие', sql: 'e.name', type: 'badge' },
    { key: 'email', label: 'Пользователь', sql: 'u.email', link: { resource: 'users', field: 'user_id' } },
    { key: 'props', label: 'Детали', sql: 'e.props', type: 'json' },
    { key: 'user_id', label: 'user_id', sql: 'e.user_id', type: 'id' },
  ],
  search: ['u.email::text', 'e.props::text'],
  filters: [
    {
      key: 'name',
      label: 'Событие',
      options: [...SERVER_EVENTS, ...CLIENT_EVENTS].map((name) => ({ value: name, label: name, where: `e.name = '${name}'` })),
    },
  ],
  defaultOrder: 'e.at DESC',
};

const adminActions: Resource = {
  key: 'admin-actions',
  label: 'Действия админов',
  group: 'Журналы',
  from: 'admin_actions a',
  pk: 'a.id',
  idType: 'int',
  title: 'a.action',
  columns: [
    { key: 'created_at', label: 'Когда', sql: 'a.created_at', type: 'datetime', sortable: true },
    { key: 'admin_email', label: 'Кто', sql: 'a.admin_email' },
    { key: 'action', label: 'Действие', sql: 'a.action', type: 'badge' },
    { key: 'target_type', label: 'Модель', sql: 'a.target_type' },
    { key: 'target_id', label: 'Запись', sql: 'a.target_id', type: 'id', link: { resourceField: 'target_type', field: 'target_id' } },
    { key: 'details', label: 'Детали', sql: 'a.details', type: 'json' },
  ],
  search: ['a.admin_email', 'a.action', 'a.target_id'],
  defaultOrder: 'a.created_at DESC',
};

export const RESOURCES: Resource[] = [
  payments,
  brandbooks,
  users,
  messages,
  consents,
  logos,
  names,
  ipUsage,
  blockedIps,
  events,
  adminActions,
];

export const findResource = (key: string): Resource | undefined => RESOURCES.find((r) => r.key === key);
