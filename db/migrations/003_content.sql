-- Контент и платежи. Схема восстановлена из кода роутов — SQL-файлов раньше не было.
-- Ключи BIGSERIAL, а не UUID: фронтенд типизирует id как number.

CREATE TABLE generated_names (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  industry    TEXT,
  keywords    TEXT,
  style       TEXT,
  preferences TEXT        NOT NULL DEFAULT '',
  names       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX generated_names_user_created_idx
  ON generated_names (user_id, created_at DESC);

CREATE TABLE generated_logos (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name              TEXT,
  keywords          TEXT,
  logo_url          TEXT        NOT NULL,
  industry          TEXT,
  is_paid           BOOLEAN     NOT NULL DEFAULT false,
  order_id          TEXT,
  payment_id        TEXT,
  payment_method    TEXT,
  email             TEXT,
  phone             TEXT,
  original_logo_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ
);

CREATE INDEX generated_logos_user_created_idx
  ON generated_logos (user_id, created_at DESC);

-- Пара (user_id, logo_url) — ключ поиска при оплате. Не UNIQUE: один и тот же
-- URL можно сгенерировать повторно, поэтому репозиторий берёт последнюю строку.
CREATE INDEX generated_logos_user_logo_url_idx
  ON generated_logos (user_id, logo_url);

CREATE INDEX generated_logos_user_original_logo_url_idx
  ON generated_logos (user_id, original_logo_url);

CREATE TABLE brandbooks (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- TEXT, а не UUID: приходит в двух видах — order_<время> с клиента и id платежа
  -- из вебхука. UNIQUE обязателен, на нём держится защита от двойной генерации.
  order_id          TEXT        NOT NULL UNIQUE,
  business_name     TEXT        NOT NULL,
  keywords          TEXT,
  slogan            TEXT        NOT NULL DEFAULT '',
  original_logo_url TEXT,
  logo_variants     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  fonts             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  color_palette     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  icons             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  guidelines        JSONB,
  applications      JSONB,
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('processing', 'completed', 'failed')),
  payment_status    TEXT        NOT NULL DEFAULT 'pending',
  is_demo           BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE INDEX brandbooks_user_status_created_idx
  ON brandbooks (user_id, status, created_at DESC);

-- user_id обнуляется, а не каскадит: чеки хранятся по 54-ФЗ независимо от аккаунта
CREATE TABLE payments (
  id                  BIGSERIAL PRIMARY KEY,
  yookassa_payment_id TEXT           NOT NULL UNIQUE,
  user_id             UUID           REFERENCES users (id) ON DELETE SET NULL,
  product_type        TEXT           NOT NULL CHECK (product_type IN ('logo', 'brandbook')),
  amount              NUMERIC(10, 2) NOT NULL,
  currency            TEXT           NOT NULL DEFAULT 'RUB',
  status              TEXT           NOT NULL,
  product_data        JSONB          NOT NULL DEFAULT '{}'::jsonb,
  description         TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ
);

CREATE INDEX payments_user_created_idx ON payments (user_id, created_at DESC);

CREATE TABLE user_logo_stats (
  user_id               UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  remaining_generations INTEGER     NOT NULL DEFAULT 10,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
