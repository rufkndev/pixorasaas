import { query } from '../db/pool';
import { log } from '../logger';

// Названия событий — закрытый список: по ним строится воронка, и опечатка
// в одном месте тихо обнулила бы шаг
export const SERVER_EVENTS = [
  'logo_generated',
  'names_generated',
  'generation_refused',
  'download_logo',
  'download_brandbook',
] as const;

// Что может прислать браузер. Остальное отбрасывается
export const CLIENT_EVENTS = [
  'brandbook_preview_view',
  'checkout_open',
  'logo_more_variants',
  'names_more_variants',
] as const;

export type EventName = (typeof SERVER_EVENTS)[number] | (typeof CLIENT_EVENTS)[number];

// Не ждём записи: аналитика не должна замедлять и тем более ронять запрос
export const track = (name: EventName, userId: string | null | undefined, props: Record<string, unknown> = {}): void => {
  query('INSERT INTO app_events (user_id, name, props) VALUES ($1, $2, $3::jsonb)', [
    userId ?? null,
    name,
    JSON.stringify(props),
  ]).catch((error: any) => log.warn(`Событие ${name} не записано:`, error.message));
};

const TODAY = `(now() AT TIME ZONE 'Europe/Moscow')::date`;

// Посещения хранятся только суммами за сутки: кто именно заходил, мы не знаем
// и знать не хотим — для этого понадобился бы идентификатор посетителя
export const countTraffic = async (metric: 'session' | 'pageview', dim: string): Promise<void> => {
  await query(
    `INSERT INTO traffic_daily AS t (day, metric, dim, count) VALUES (${TODAY}, $1, $2, 1)
     ON CONFLICT (day, metric, dim) DO UPDATE SET count = t.count + 1`,
    [metric, dim.slice(0, 120)]
  );
};
