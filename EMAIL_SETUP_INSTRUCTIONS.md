# Настройка отправки email через Gmail

## Шаг 1: Настройка Gmail

1. **Включите двухфакторную аутентификацию** в своей учетной записи Gmail
2. **Создайте App Password** для вашего приложения:
   - Перейдите в настройки Google Account
   - Выберите Security > 2-Step Verification > App passwords
   - Создайте новый App password для "Mail"
   - Сохраните сгенерированный пароль

## Шаг 2: Настройка переменных окружения

Создайте файл `.env.local` в корне проекта со следующими переменными:

```env
# Email configuration
EMAIL_USER=arttaranovbusiness@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Supabase configuration (если используется)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Важно:** Замените `your_app_password_here` на сгенерированный App Password из Gmail.

## Шаг 3: Запуск приложения

1. Запустите backend сервер:
```bash
npm run server
```

2. Запустите frontend в новом терминале:
```bash
npm run dev
```

## Функциональность

После настройки, контактная форма будет:
- Отправлять сообщения на email `arttaranovbusiness@gmail.com`
- Отправлять подтверждение отправителю
- Показывать статус загрузки
- Обрабатывать ошибки

## Тестирование

Для тестирования:
1. Откройте страницу `/contact`
2. Заполните форму
3. Проверьте получение email на указанный адрес 