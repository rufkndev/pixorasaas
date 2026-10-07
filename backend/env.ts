import { z } from 'zod';
import { log } from './logger';

// Проверка окружения при старте. Раньше без ключа GenAPI процесс поднимался и
// падал уже на пользователе, а без ключей ЮKassa — только при первой оплате.
// Модули по-прежнему читают process.env сами: здесь только приёмка.

const required = (message: string) => z.string({ required_error: message }).trim().min(1, message);

const nonNegativeInt = z
  .string()
  .regex(/^\d+$/, 'должно быть целым неотрицательным числом')
  .optional()
  .or(z.literal(''));

const schema = z.object({
  DATABASE_URL: required('строка подключения к Postgres'),
  JWT_SECRET: required('секрет подписи сессий').refine((value) => value.length >= 32, {
    message: 'не короче 32 символов: openssl rand -hex 32',
  }),
  APP_URL: required('публичный адрес сайта').url('должен быть полным URL, например https://pixora-ai.ru'),
  GENAPI_KEY: required('ключ GenAPI — без него не работает ни одна генерация'),
  YOOKASSA_SHOP_ID: required('id магазина ЮKassa'),
  YOOKASSA_SECRET_KEY: required('секретный ключ ЮKassa'),
  POSTBOX_SMTP_USER: required('логин SMTP Postbox — без него не уходят письма подтверждения'),
  POSTBOX_SMTP_PASSWORD: required('пароль SMTP Postbox'),
  MAIL_FROM: required('адрес отправителя писем'),
  CONTACT_EMAIL: required('куда падают обращения и алерты').email('должен быть email'),
  ALERT_EMAIL: z.string().email('должен быть email').optional().or(z.literal('')),
  IP_DAILY_LOGO_LIMIT: nonNegativeInt,
  IP_DAILY_NAME_LIMIT: nonNegativeInt,
  GENAPI_DAILY_BUDGET_RUB: nonNegativeInt,
  LOGO_CONCURRENCY: nonNegativeInt,
  LOGO_QUEUE: nonNegativeInt,
  UNPAID_LOGO_RETENTION_DAYS: nonNegativeInt,
});

// В проде неполное окружение — отказ стартовать, в деве — предупреждение:
// локально часто работают без почты или без ЮKassa
export const validateEnv = (): void => {
  const result = schema.safeParse(process.env);
  if (result.success) return;

  const problems = result.error.errors.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
  const report = `Переменные окружения не в порядке:\n${problems.join('\n')}`;

  if (process.env.NODE_ENV === 'production') {
    log.error(report);
    log.error('Шаблон всех переменных — .env.local.example. Сервер не запущен.');
    process.exit(1);
  }

  log.warn(`${report}\nВ деве продолжаем, но соответствующие функции работать не будут.`);
};
