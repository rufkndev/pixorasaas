import { z } from 'zod';
import { cleanBrandName, cleanText, isBrandName, isPromptSafe } from '../utils/text';

// Длина проверяется после чистки: иначе невидимые символы съедали бы лимит,
// а строка из одних пробелов проходила бы проверку на обязательность
const textLine = (max: number, required?: string) => {
  const inner = z.string().max(max, `Не длиннее ${max} символов`);
  return z
    .string({ required_error: required, invalid_type_error: 'Некорректное значение' })
    .transform((value) => cleanText(value))
    .pipe(required ? inner.min(1, required) : inner);
};

const PROMPT_UNSAFE_MESSAGE = 'Уберите ссылки и символы < > { } ` \\';

// Поля, которые уходят в промпт: длина жёсткая, разметка и ссылки запрещены
const promptText = (max: number, required?: string) =>
  textLine(max, required).refine(isPromptSafe, PROMPT_UNSAFE_MESSAGE);

const brandName = z
  .string({ required_error: 'Укажите название' })
  .transform(cleanBrandName)
  .pipe(
    z
      .string()
      .min(1, 'Укажите название')
      .max(60, 'Название не длиннее 60 символов')
      .refine(
        isBrandName,
        "В названии допустимы буквы (кириллица и латиница), цифры, пробел и знаки - & . ' + !"
      )
  );

// Списки исключений присылает клиент, но собраны они из нашей же выдачи. Негодный
// элемент отбрасывается, а не валит запрос: за него пользователь не отвечает
const excludeList = (maxItems: number) =>
  z
    .array(z.string().max(200))
    .max(maxItems)
    .transform((items) =>
      items
        .map((item) => cleanText(item))
        .filter((item) => item.length > 0 && item.length <= 60 && isPromptSafe(item))
    );

const phone = z
  .string()
  .transform((value) => cleanText(value))
  .pipe(z.string().max(30).regex(/^[0-9+()\- ]*$/, 'В телефоне допустимы цифры, +, скобки и дефис'));

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

const fullName = promptText(120).optional();

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
  name: promptText(120, 'Укажите имя'),
  email,
  // Ссылки в обращении допустимы: письмо уходит только нам
  message: z
    .string({ required_error: 'Напишите сообщение' })
    .transform((value) => cleanText(value, { multiline: true }))
    .pipe(z.string().min(1, 'Напишите сообщение').max(5000, 'Не длиннее 5000 символов')),
  consentPdn: z.literal(true, {
    errorMap: () => ({ message: 'Требуется согласие на обработку персональных данных' }),
  }),
});

// Ключи STYLE_PROFILES из backend/utils/styleLabels.ts. От стиля зависят название,
// логотип, палитра, шрифты и вёрстка брендбука — список должен быть один на всё.
export const BRAND_STYLES = ['modern', 'classic', 'creative', 'professional', 'playful'] as const;

export const generateNamesSchema = z.object({
  industry: promptText(100, 'Укажите нишу бизнеса'),
  keywords: promptText(100, 'Укажите ключевые слова'),
  style: z.enum(BRAND_STYLES, {
    errorMap: () => ({ message: 'Выберите стиль из списка' }),
  }),
  preferences: promptText(100).optional().default(''),
  language: z.enum(['cyrillic', 'latin', 'any']).optional().default('any'),
  // Кнопка «Ещё варианты» присылает уже показанные названия
  exclude: excludeList(60).optional().default([]),
});

export const generateLogoSchema = z.object({
  name: brandName,
  keywords: promptText(100, 'Укажите ключевые слова'),
  industry: promptText(100).optional().default(''),
  style: z.enum(BRAND_STYLES).optional().default('modern'),
  // Приёмы и предметы, уже показанные пользователю на этой странице
  exclude: excludeList(40).optional().default([]),
});

export const logoIdSchema = z.coerce
  .number({ invalid_type_error: 'Некорректный логотип' })
  .int('Некорректный логотип')
  .positive('Некорректный логотип');

// Заказ. Ни цену, ни адрес возврата, ни номер заказа клиент не присылает —
// всё это сервер считает сам. Название, ключевые слова и слоган тоже берутся
// из записи логотипа: в оплаченный PDF не должен попасть текст из запроса.
export const createPaymentSchema = z.object({
  productType: z.enum(['logo', 'brandbook'], {
    errorMap: () => ({ message: 'Неизвестный товар' }),
  }),
  productData: z.object({
    // id, а не URL: логотип и его файлы сервер находит сам по своей записи
    logoId: logoIdSchema,
    // Без email нельзя выставить чек, этого требует 54-ФЗ
    email,
    phone: phone.optional().default(''),
    // Запасные значения для логотипов, у которых в записи нет ниши или стиля
    industry: promptText(100).optional().default(''),
    brandStyle: z.enum(BRAND_STYLES).optional(),
  }),
  acceptOffer: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо принять условия публичной оферты' }),
  }),
});

export const orderIdSchema = z.string().uuid('Некорректный номер заказа');

export const demoBrandbookSchema = z.object({ logoId: logoIdSchema });

// Для формы достаточно первой ошибки
export const firstError = (error: z.ZodError): string =>
  error.errors[0]?.message || 'Некорректные данные';
