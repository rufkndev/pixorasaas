// Своя аналитика без сторонних счётчиков. Посещения уходят на сервер только
// счётчиками, без идентификатора посетителя; источник первого касания
// хранится в браузере и уходит на сервер один раз — при регистрации.

const SESSION_KEY = 'pixora-session-source';
const FIRST_TOUCH_KEY = 'pixora-first-touch';

export type ClientEvent =
  | 'brandbook_preview_view'
  | 'checkout_open'
  | 'logo_more_variants'
  | 'names_more_variants';

export interface Attribution {
  source: string;
  medium?: string;
  campaign?: string;
  landing?: string;
}

const SEARCH_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)yandex\.|(^|\.)ya\.ru$/, 'yandex'],
  [/(^|\.)google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)mail\.ru$/, 'mail.ru'],
  [/(^|\.)vk\.(com|ru)$/, 'vk'],
  [/(^|\.)t\.me$|telegram/, 'telegram'],
  [/(^|\.)dzen\.ru$/, 'dzen'],
];

// Только безопасные символы: сервер всё равно отбросит остальное
const clean = (value: string | null | undefined, max: number): string | undefined => {
  const result = (value || '').toLowerCase().replace(/[^\w.\- ]/g, '').slice(0, max);
  return result || undefined;
};

const detectSource = (): Attribution => {
  const params = new URLSearchParams(window.location.search);
  const landing = window.location.pathname.replace(/[^\w\-/]/g, '').slice(0, 100) || '/';
  const utmSource = clean(params.get('utm_source'), 60);

  if (utmSource) {
    return {
      source: utmSource,
      medium: clean(params.get('utm_medium'), 60),
      campaign: clean(params.get('utm_campaign'), 100),
      landing,
    };
  }

  let host = '';
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }

  if (!host || host === window.location.hostname.replace(/^www\./, '')) {
    return { source: 'direct', landing };
  }

  const engine = SEARCH_ENGINES.find(([pattern]) => pattern.test(host));
  return engine
    ? { source: engine[1], medium: 'organic', landing }
    : { source: clean(host, 60) || 'referral', medium: 'referral', landing };
};

const send = (url: string, body: unknown): void => {
  try {
    const payload = JSON.stringify(body);
    // sendBeacon переживает уход со страницы, fetch — запасной путь
    if (navigator.sendBeacon?.(url, new Blob([payload], { type: 'application/json' }))) return;
    void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'include' });
  } catch {
    // Аналитика не должна ломать страницу
  }
};

// Первое посещение в сессии вкладки считается визитом с источником
export const trackVisit = (path: string): void => {
  let newSession = false;
  let source = 'direct';

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      source = stored;
    } else {
      const attribution = detectSource();
      source = attribution.source;
      sessionStorage.setItem(SESSION_KEY, source);
      newSession = true;
      if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attribution));
      }
    }
  } catch {
    newSession = false;
  }

  send('/api/t/visit', { path, source, newSession });
};

export const firstTouch = (): Attribution | undefined => {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    return stored ? (JSON.parse(stored) as Attribution) : undefined;
  } catch {
    return undefined;
  }
};

export const trackEvent = (name: ClientEvent, props: Record<string, string | number | boolean> = {}): void => {
  send('/api/t/event', { name, props });
};

// Не больше десятка ошибок со вкладки: зациклившийся компонент иначе завалил бы лог
let reportedErrors = 0;

export const reportClientError = (message: string, stack?: string): void => {
  if (reportedErrors >= 10 || !message) return;
  reportedErrors++;
  send('/api/t/error', {
    message: message.slice(0, 1000),
    stack: stack?.slice(0, 4000),
    path: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 300),
  });
};
