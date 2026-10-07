-- Предпросмотр брендбука считается один раз на логотип. Раньше каждый вызов
-- демо заново звал модель за слоганом и писал на диск два файла, а лимита у
-- роута не было — бесплатные вызовы LLM и забивание диска без ограничений.
ALTER TABLE generated_logos
  ADD COLUMN IF NOT EXISTS demo_slogan   TEXT,
  ADD COLUMN IF NOT EXISTS demo_variants JSONB;
