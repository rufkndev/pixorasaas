-- Админка, мониторинг и аналитика. Всё, что раньше разбиралось SQL-запросами
-- из docs/run.md, получает свои таблицы: без них нечего показывать и не с чем сравнивать.

-- Заблокированный не входит и не генерирует. Источник — первое касание
-- (utm или сайт-источник), без него не понять, какой канал приносит деньги
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS blocked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signup_source JSONB;

-- Возврат хранится в самом платеже: выручка в аналитике считается за вычетом него
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at     TIMESTAMPTZ;

-- Кто из админов что сделал. Ручные действия с чужими заказами без журнала
-- потом не восстановить
CREATE TABLE IF NOT EXISTS admin_actions (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    UUID,
  admin_email TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  target_type TEXT        NOT NULL,
  target_id   TEXT,
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON admin_actions (created_at DESC);

-- Переключатели без деплоя: пауза бесплатного, бюджет, ставки для экономики
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Раньше обращение существовало только письмом в ящике
CREATE TABLE IF NOT EXISTS contact_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
  name       TEXT        NOT NULL,
  email      CITEXT      NOT NULL,
  message    TEXT        NOT NULL,
  ip         INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);

-- Ключ тот же, что у лимита на адрес: IPv4 или подсеть /64
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_key     TEXT PRIMARY KEY,
  reason     TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Продуктовые события, которых нет в остальных таблицах: просмотр предпросмотра,
-- упор в лимит, скачивание. Генерации и оплаты берутся из своих таблиц
CREATE TABLE IF NOT EXISTS app_events (
  id      BIGSERIAL PRIMARY KEY,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  name    TEXT        NOT NULL,
  props   JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS app_events_name_at_idx ON app_events (name, at);
CREATE INDEX IF NOT EXISTS app_events_user_idx ON app_events (user_id, at);

-- Посещения без идентификаторов: только счётчики за сутки. metric —
-- session (dim = источник) или pageview (dim = путь)
CREATE TABLE IF NOT EXISTS traffic_daily (
  day    DATE    NOT NULL,
  metric TEXT    NOT NULL,
  dim    TEXT    NOT NULL,
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, dim)
);

-- Каждый вызов GenAPI. order_id заполнен у вызовов внутри выдачи заказа —
-- так видна себестоимость оплаченного отдельно от бесплатного
CREATE TABLE IF NOT EXISTS genapi_calls (
  id          BIGSERIAL PRIMARY KEY,
  at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  model       TEXT          NOT NULL,
  label       TEXT          NOT NULL,
  ok          BOOLEAN       NOT NULL,
  duration_ms INTEGER       NOT NULL,
  est_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_id    UUID,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS genapi_calls_at_idx ON genapi_calls (at);
CREATE INDEX IF NOT EXISTS genapi_calls_order_idx ON genapi_calls (order_id) WHERE order_id IS NOT NULL;

-- Снимки баланса. Разница между соседними — реальное списание, в отличие от сметы
CREATE TABLE IF NOT EXISTS genapi_balance (
  at      TIMESTAMPTZ   PRIMARY KEY DEFAULT now(),
  balance NUMERIC(12,2) NOT NULL
);

-- Метрики HTTP, сведённые по минутам. hist — число запросов по корзинам
-- длительности, из него считаются перцентили
CREATE TABLE IF NOT EXISTS http_metrics (
  minute TIMESTAMPTZ NOT NULL,
  method TEXT        NOT NULL,
  route  TEXT        NOT NULL,
  count  INTEGER     NOT NULL DEFAULT 0,
  s4xx   INTEGER     NOT NULL DEFAULT 0,
  s5xx   INTEGER     NOT NULL DEFAULT 0,
  sum_ms BIGINT      NOT NULL DEFAULT 0,
  max_ms INTEGER     NOT NULL DEFAULT 0,
  hist   INTEGER[]   NOT NULL,
  PRIMARY KEY (minute, method, route)
);

-- Копия логов для просмотра из админки. В stdout они идут как раньше
CREATE TABLE IF NOT EXISTS app_logs (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  level      TEXT        NOT NULL,
  source     TEXT        NOT NULL DEFAULT 'server',
  message    TEXT        NOT NULL,
  request_id TEXT,
  context    JSONB
);

CREATE INDEX IF NOT EXISTS app_logs_at_idx ON app_logs (at DESC);
CREATE INDEX IF NOT EXISTS app_logs_level_at_idx ON app_logs (level, at DESC);
CREATE INDEX IF NOT EXISTS app_logs_request_idx ON app_logs (request_id) WHERE request_id IS NOT NULL;

-- Аналитика выборок по оплатам за период
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON payments (paid_at) WHERE status = 'succeeded';
CREATE INDEX IF NOT EXISTS users_created_idx ON users (created_at);
CREATE INDEX IF NOT EXISTS generated_logos_created_idx ON generated_logos (created_at);
CREATE INDEX IF NOT EXISTS generated_names_created_idx ON generated_names (created_at);
