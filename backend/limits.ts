// Лимиты против фарма бесплатных генераций. Числа берутся из окружения, чтобы
// их можно было подкрутить без правки кода, если реклама приведёт поток людей.

const intFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

// Сколько бесплатных генераций в сутки допускается с одного адреса. Квота на
// аккаунт — 5, так что это примерно два аккаунта из одной сети (офис, семья)
export const IP_DAILY_LIMITS = {
  logos: intFromEnv('IP_DAILY_LOGO_LIMIT', 10),
  names: intFromEnv('IP_DAILY_NAME_LIMIT', 10),
};

// Потолок трат на бесплатные генерации за сутки, в рублях
export const GENAPI_DAILY_BUDGET_RUB = intFromEnv('GENAPI_DAILY_BUDGET_RUB', 500);

// Смета одного вызова. Реальную цену GenAPI не сообщает, а каталог врёт —
// числа взяты из замеров списаний, см. раздел про логотип в CLAUDE.md
export const ESTIMATED_COST_RUB = {
  logos: 7.5,
  names: 3,
  slogan: 1,
} as const;

export type SpendKind = keyof typeof ESTIMATED_COST_RUB;

// Какие траты считаются бесплатными и упираются в бюджет
export const FREE_SPEND_KINDS: readonly SpendKind[] = ['logos', 'names', 'slogan'];

// Сколько генераций логотипа идёт одновременно и сколько ждёт в очереди. Каждая —
// это GenAPI плюс sharp и rsvg на нашем процессоре, а рядом собираются
// оплаченные брендбуки
export const LOGO_CONCURRENCY = intFromEnv('LOGO_CONCURRENCY', 4);
export const LOGO_QUEUE = intFromEnv('LOGO_QUEUE', 20);
