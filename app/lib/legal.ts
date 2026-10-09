// Единый источник ссылок и реквизитов для фронтенда.
// Версии здесь только для показа: в журнал согласий пишется версия с сервера.
// При правке текста документа поднимите дату здесь и в backend/legal.ts.

export const LEGAL_VERSIONS = {
  pdn: '2026-10-08',
  offer: '2026-08-27',
  marketing: '2026-08-27',
  cookies: '2026-10-08',
} as const;

export const LEGAL_LINKS = {
  privacy: '/pages/privacy',
  personalData: '/pages/personal-data',
  consent: '/pages/consent',
  cookies: '/pages/cookies',
  terms: '/pages/terms',
  offer: '/pages/offer',
  contact: '/pages/contact',
} as const;

// Используются в футере, на странице контактов и во всех документах
export const REQUISITES = {
  name: 'Индивидуальный предприниматель Таранов Артём Игоревич',
  shortName: 'ИП Таранов А. И.',
  inn: '650302923331',
  ogrnip: '325650000017843',
  phone: '+7 (962) 120-63-60',
  phoneHref: '+79621206360',
  email: 'arttaranovbusiness@gmail.com',
} as const;

// Витрина. Считает цену всё равно сервер — те же цифры в
// backend/services/orderService.ts, менять нужно в обоих местах.
export const PRICES = {
  logo: 299,
  brandbook: 499,
} as const;

// Тоже витрина: считает и списывает генерации сервер, те же числа лежат
// в backend/db/repositories/generationUsageRepo.ts. Менять в обоих местах.
export const FREE_GENERATIONS = 5;
export const QUOTA_WINDOW_DAYS = 14;
