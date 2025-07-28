# Быстрая настройка ЮKassa 

## Шаг 1: Настройка переменных окружения

В вашем файле `.env.local` добавьте:

```env
# ЮKassa настройки (замените на ваши реальные значения)
YOOKASSA_SHOP_ID=ваш_shop_id
YOOKASSA_SECRET_KEY=ваш_secret_key
YOOKASSA_BASE_URL=https://api.yookassa.ru/v3

# Остальные настройки (уже должны быть у вас)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
PORT=3001
NODE_ENV=production
```

**Обратите внимание**: `YOOKASSA_WEBHOOK_SECRET` не нужен, если его нет в интерфейсе ЮKassa.

## Шаг 2: Создание таблицы payments в Supabase

Выполните этот SQL в Supabase:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yookassa_payment_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('logo', 'brandbook')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status TEXT NOT NULL,
  product_data JSONB NOT NULL,
  description TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_payments_yookassa_id ON payments(yookassa_payment_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- Обновляем существующие таблицы
ALTER TABLE generated_logos ADD COLUMN payment_id TEXT;
ALTER TABLE brandbooks ADD COLUMN payment_id TEXT;
```

## Шаг 3: Настройка webhook в ЮKassa

1. Войдите в личный кабинет ЮKassa
2. Перейдите в "Настройки" → "HTTP-уведомления"  
3. Добавьте URL: `https://pixora-labs.ru/api/yookassa/webhook`
4. Выберите события:
   - ✅ `payment.succeeded`
   - ✅ `payment.canceled`
5. Сохраните настройки

## Шаг 4: Проверка работы

1. Запустите backend:
```bash
npm run server
```

2. Запустите frontend:
```bash
npm run dev
```

3. Создайте логотип или брендбук
4. Перейдите к оплате
5. Используйте тестовую карту: `5555555555554444`
6. Проверьте, что после успешной оплаты продукт создался

## Готово! 🎉

Ваша система оплаты через ЮKassa готова к работе. Логотипы и брендбуки будут создаваться только после успешной оплаты. 