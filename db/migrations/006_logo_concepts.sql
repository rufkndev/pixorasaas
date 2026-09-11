-- Логотип перестал быть просто картинкой: у него есть приём, предмет и палитра.
-- Без этих полей повторная генерация не знает, что уже показывали, и выдаёт то же самое.
-- Все колонки nullable — записи, сделанные до перехода на вектор, продолжают работать.
ALTER TABLE generated_logos
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS pattern TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS concept TEXT,
  ADD COLUMN IF NOT EXISTS palette JSONB,
  ADD COLUMN IF NOT EXISTS svg_url TEXT,
  ADD COLUMN IF NOT EXISTS original_svg_url TEXT;

-- Выборка прошлых концепций пользователя по тому же названию — для списка исключений
CREATE INDEX IF NOT EXISTS generated_logos_user_name_idx
  ON generated_logos (user_id, name, created_at DESC);
