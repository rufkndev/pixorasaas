-- Заказ получает собственный идентификатор, независимый от ЮKassa.
-- Раньше номер заказа придумывал клиент (order_<время>) и присылал его обратно
-- после оплаты, а вебхук писал брендбук под id платежа. Номера не совпадали,
-- поэтому UNIQUE по brandbooks.order_id ничего не защищал: тот же заказ мог
-- собраться дважды, а подобрать чужой order_<время> мог кто угодно.
ALTER TABLE payments
  ADD COLUMN order_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE payments
  ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);

-- Строка платежа создаётся до обращения к ЮKassa, поэтому id платежа
-- проставляется вторым шагом. Пустых значений UNIQUE допускает сколько угодно.
ALTER TABLE payments
  ALTER COLUMN yookassa_payment_id DROP NOT NULL;

-- Выдача отделена от оплаты. Деньги списываются мгновенно, а брендбук
-- собирается минутами и может упасть: одного status = 'succeeded' мало,
-- чтобы понять, получил ли клиент товар.
ALTER TABLE payments
  ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN delivery_started_at TIMESTAMPTZ,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN delivery_error TEXT;

-- Оплаченные, но не выданные заказы нужно уметь быстро найти для разбора
CREATE INDEX payments_delivery_idx
  ON payments (delivery_status, paid_at DESC)
  WHERE status = 'succeeded';

-- Всё, что оплачено до этой миграции, выдал прежний код. Без этой строки
-- старые заказы считались бы невыданными и собрались бы заново.
UPDATE payments
   SET delivery_status = 'completed', delivered_at = paid_at
 WHERE status = 'succeeded';

COMMENT ON COLUMN brandbooks.order_id IS
  'payments.order_id. Раньше сюда попадал либо order_<время> с клиента, либо id платежа';
