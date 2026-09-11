-- Бесплатные генерации: по 7 названий и 7 логотипов на пользователя,
-- счётчики обнуляются после каждой успешной оплаты.

CREATE TABLE user_generation_usage (
  user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  names_used INTEGER     NOT NULL DEFAULT 0,
  logos_used INTEGER     NOT NULL DEFAULT 0,
  reset_at   TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- В user_logo_stats никто не писал, квота всегда отдавала хардкод
DROP TABLE IF EXISTS user_logo_stats;
