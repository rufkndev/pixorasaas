-- Аутентификация и журнал согласий на обработку персональных данных

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT      NOT NULL,
  password_hash     TEXT        NOT NULL,
  full_name         TEXT,
  -- NULL значит «почта не подтверждена», вход запрещён
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Мягкое удаление: строка остаётся ради платёжных записей, но обезличивается
  deleted_at        TIMESTAMPTZ
);

-- Уникальность только среди живых аккаунтов: после удаления адрес освобождается
CREATE UNIQUE INDEX users_email_active_key
  ON users (email)
  WHERE deleted_at IS NULL;

-- Одноразовые токены подтверждения почты и сброса пароля
CREATE TABLE auth_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('email_verify', 'password_reset')),
  -- Храним SHA-256: по дампу базы токеном воспользоваться нельзя
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX auth_tokens_user_kind_idx ON auth_tokens (user_id, kind);
CREATE INDEX auth_tokens_expires_at_idx ON auth_tokens (expires_at);

-- Сессии, они же refresh-токены
CREATE TABLE sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  refresh_token_hash TEXT        NOT NULL UNIQUE,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip                 INET,
  user_agent         TEXT
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Журнал согласий. Без версии документа, времени и источника галочка
-- недоказуема при проверке. user_id пустой у формы обратной связи.
CREATE TABLE user_consents (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID        REFERENCES users (id) ON DELETE CASCADE,
  subject     CITEXT,     -- email, если согласие дано без аккаунта
  kind        TEXT        NOT NULL CHECK (kind IN ('pdn', 'offer', 'marketing', 'cookies')),
  doc_version TEXT        NOT NULL,
  source      TEXT        NOT NULL, -- registration | contact_form | payment
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  ip          INET,
  user_agent  TEXT
);

CREATE INDEX user_consents_user_id_idx ON user_consents (user_id);
CREATE INDEX user_consents_subject_idx ON user_consents (subject);
