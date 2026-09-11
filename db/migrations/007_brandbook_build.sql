-- Брендбук перестал появляться готовым: строка заводится до сборки, поэтому у неё
-- есть ход сборки, собственный захват и список артефактов. Раньше строки не было
-- всё время генерации, и оплативший видел «Брендбук не найден» и редирект на главную.
ALTER TABLE brandbooks
  ADD COLUMN IF NOT EXISTS style            TEXT,
  ADD COLUMN IF NOT EXISTS industry         TEXT,
  ADD COLUMN IF NOT EXISTS build_step       TEXT,
  ADD COLUMN IF NOT EXISTS build_progress   SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS build_steps      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS build_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS build_error      TEXT,
  ADD COLUMN IF NOT EXISTS assets           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pdf_url          TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at    TIMESTAMPTZ;

COMMENT ON COLUMN brandbooks.build_steps IS
  'Шаги сборки: [{key,label,state,error,at}]. Детальное состояние живёт здесь, '
  'а не в status — CHECK по status трогать не потребовалось.';

COMMENT ON COLUMN brandbooks.assets IS
  'URL готовых файлов брендбука. Нужен, чтобы пути не восстанавливались из '
  'соседних строковыми трюками вроде replace(.png, .svg).';

-- Кабинет и страница заказа показывают и незавершённые брендбуки, поэтому прежний
-- индекс с фильтром по status перестал покрывать выборку
CREATE INDEX IF NOT EXISTS brandbooks_user_created_idx
  ON brandbooks (user_id, created_at DESC);

-- Уже выданные заказы считаются собранными: у них все шаги позади
UPDATE brandbooks
   SET build_progress = 100
 WHERE status = 'completed' AND build_progress = 0;

-- Шрифт надписи в логотипе — это и шрифт брендбука. Раньше он нигде не хранился
-- и выводился из style, а у стиля со временем может смениться семейство.
ALTER TABLE generated_logos
  ADD COLUMN IF NOT EXISTS lockup_font  TEXT,
  ADD COLUMN IF NOT EXISTS mark_svg_url TEXT;

COMMENT ON COLUMN generated_logos.mark_svg_url IS
  'Вектор голого знака без надписи. Кэш: повтор упавшей сборки не платит '
  'за обводку второй раз.';
