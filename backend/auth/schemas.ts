import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Укажите email')
  .max(254)
  .email('Некорректный email')
  .toLowerCase();

// Верхняя граница нужна argon2: длинные строки хешируются заметно дольше
const password = z
  .string()
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(128, 'Пароль слишком длинный');

const fullName = z.string().trim().min(1).max(120).optional();

export const registerSchema = z.object({
  email,
  password,
  fullName,
  consents: z.object({
    // Обязательно именно true, а не просто boolean
    pdn: z.literal(true, {
      errorMap: () => ({ message: 'Требуется согласие на обработку персональных данных' }),
    }),
    // Рассылка — отдельное необязательное согласие: отказ не должен
    // мешать регистрации
    marketing: z.boolean().optional().default(false),
  }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Укажите пароль').max(128),
});

export const emailOnlySchema = z.object({ email });

export const tokenSchema = z.object({
  token: z.string().min(10).max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Подтвердите паролем').max(128),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(120),
  email,
  message: z.string().trim().min(1, 'Напишите сообщение').max(5000),
  consentPdn: z.literal(true, {
    errorMap: () => ({ message: 'Требуется согласие на обработку персональных данных' }),
  }),
});

// Поля уходят в промпт как есть, поэтому длину ограничиваем жёстко
const promptField = z.string().trim().max(100, 'Не длиннее 100 символов');

// Ключи STYLE_PROFILES из backend/utils/styleLabels.ts. От стиля зависят название,
// логотип, палитра, шрифты и вёрстка брендбука — список должен быть один на всё.
export const BRAND_STYLES = ['modern', 'classic', 'creative', 'professional', 'playful'] as const;

export const generateNamesSchema = z.object({
  industry: promptField.min(1, 'Укажите нишу бизнеса'),
  keywords: promptField.min(1, 'Укажите ключевые слова'),
  style: z.enum(BRAND_STYLES, {
    errorMap: () => ({ message: 'Выберите стиль из списка' }),
  }),
  preferences: promptField.optional().default(''),
  language: z.enum(['cyrillic', 'latin', 'any']).optional().default('any'),
  // Кнопка «Ещё варианты» присылает уже показанные названия
  exclude: z.array(z.string().trim().min(1).max(60)).max(60).optional().default([]),
});

// Название сюда приходит с шага выбора, поэтому оно длиннее promptField
export const generateLogoSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(120),
  keywords: promptField.min(1, 'Укажите ключевые слова'),
  industry: promptField.optional().default(''),
  style: z.enum(BRAND_STYLES).optional().default('modern'),
  // Приёмы и предметы, уже показанные пользователю на этой странице
  exclude: z.array(z.string().trim().min(1).max(60)).max(40).optional().default([]),
});

// Заказ. Ни цену, ни адрес возврата, ни номер заказа клиент не присылает —
// всё это сервер считает сам.
const orderField = z.string().trim().max(200);

export const createPaymentSchema = z.object({
  productType: z.enum(['logo', 'brandbook'], {
    errorMap: () => ({ message: 'Неизвестный товар' }),
  }),
  productData: z.object({
    name: orderField.min(1, 'Не указано название бренда'),
    keywords: orderField.min(1, 'Не указаны ключевые слова'),
    logoUrl: orderField.min(1, 'Не выбран логотип'),
    // Без email нельзя выставить чек, этого требует 54-ФЗ
    email,
    phone: z.string().trim().max(30).optional().default(''),
    slogan: z.string().trim().max(300).optional().default(''),
    industry: orderField.optional().default(''),
    // Именно enum, а не строка: от стиля зависят палитра, шрифты и вёрстка
    // брендбука, а опечатка тихо свалила бы всё в умолчания
    brandStyle: z.enum(BRAND_STYLES).optional(),
  }),
  acceptOffer: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо принять условия публичной оферты' }),
  }),
}).superRefine((value, ctx) => {
  // Брендбук без ниши и стиля собрать нельзя — упадёт уже после списания денег
  if (value.productType !== 'brandbook') return;

  for (const field of ['industry', 'brandStyle'] as const) {
    if (!value.productData[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productData', field],
        message: 'Для брендбука нужны ниша и стиль бренда',
      });
    }
  }
});

export const orderIdSchema = z.string().uuid('Некорректный номер заказа');

// Для формы достаточно первой ошибки
export const firstError = (error: z.ZodError): string =>
  error.errors[0]?.message || 'Некорректные данные';
