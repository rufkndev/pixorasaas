-- Упавшую выдачу раньше повторял каждый опрос страницы успеха, то есть раз в
-- три секунды, и стабильно падающий брендбук жёг GenAPI, пока открыта вкладка.
-- Теперь у повторов есть пауза и потолок, а после потолка — алерт и ручной разбор.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;

-- Досборщик раз в пару минут ищет платежи, по которым не пришло уведомление
CREATE INDEX IF NOT EXISTS payments_pending_sync_idx
  ON payments (created_at)
  WHERE status IN ('pending', 'waiting_for_capture') AND yookassa_payment_id IS NOT NULL;
