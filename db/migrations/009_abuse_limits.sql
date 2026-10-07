-- Квота на аккаунт не спасает от фарма: аккаунты заводятся на одноразовую почту
-- десятками. Лимит на адрес и общий потолок трат закрывают это сверху.

-- ip_key — адрес IPv4 или подсеть /64 для IPv6: у провайдера на одного абонента
-- приходится целый блок адресов, и по одиночному IPv6 лимит обходился бы сменой адреса
CREATE TABLE ip_generation_usage (
  ip_key     TEXT        NOT NULL,
  kind       TEXT        NOT NULL,
  day        DATE        NOT NULL,
  used       INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_key, kind, day)
);

-- Траты на бесплатные генерации по смете, а не по реальному списанию:
-- реальную цену вызова GenAPI не сообщает
CREATE TABLE genapi_spend (
  day        DATE          NOT NULL,
  kind       TEXT          NOT NULL,
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  calls      INTEGER       NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (day, kind)
);

-- Лимит на адрес не действует на тех, кто уже платил: проверка идёт на каждой генерации
CREATE INDEX IF NOT EXISTS payments_user_succeeded_idx
  ON payments (user_id) WHERE status = 'succeeded';
