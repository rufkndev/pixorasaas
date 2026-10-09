import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { format } from 'util';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';

// Номер запроса пробрасывается во все строки лога, сделанные по ходу его
// обработки, — без него не собрать, что происходило с конкретным заказом
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const base = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: () => {
    const requestId = requestContext.getStore()?.requestId;
    return requestId ? { requestId } : {};
  },
});

// Почта и телефоны попадают в текст ошибок (адрес в теме письма, ответ SMTP).
// Маскируем в самой строке: redact у pino работает только по полям объекта
const EMAIL = /([^\s@<>"'«(]{1,2})[^\s@<>"'«(]*@([^\s@<>"'»),;]+)/g;
const PHONE = /(?:\+7|\b[78])[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*(\d{2})\b/g;

export const maskPersonalData = (text: string): string =>
  text.replace(EMAIL, '$1***@$2').replace(PHONE, '+7 *** ***-**-$1');

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  at: Date;
  level: LogLevel;
  message: string;
  requestId: string | null;
}

// Подписчики получают каждую строку. Через них копия логов уходит в базу:
// прямой импорт пула отсюда дал бы цикл — пул сам пишет в лог
const listeners: Array<(entry: LogEntry) => void> = [];

export const onLog = (listener: (entry: LogEntry) => void): void => {
  listeners.push(listener);
};

export const currentRequestId = (): string | null => requestContext.getStore()?.requestId ?? null;

// Тот же вызов, что у console: log.error('Не удалось:', error.message). Так замена
// console.* прошла механически, без переписывания каждого сообщения
const write =
  (level: LogLevel) =>
  (...args: unknown[]): void => {
    const message = maskPersonalData(format(...args));
    base[level](message);

    if (listeners.length === 0) return;
    const entry = { at: new Date(), level, message, requestId: currentRequestId() };
    for (const listener of listeners) {
      try {
        listener(entry);
      } catch {
        // Сбой подписчика не должен ронять запись лога
      }
    }
  };

export const log = {
  info: write('info'),
  warn: write('warn'),
  error: write('error'),
};

const SKIP_PATHS = new Set(['/api/health']);

// Одна строка на запрос: метод, путь без query, код и время. Query не пишем —
// там бывают токены из писем, а тела и заголовки тем более
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  const started = process.hrtime.bigint();

  res.setHeader('X-Request-Id', requestId);

  // originalUrl, а не path: внутри вложенного роутера path уже обрезан
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    if (SKIP_PATHS.has(path)) return;
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    requestContext.run({ requestId }, () =>
      log.info(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`)
    );
  });

  requestContext.run({ requestId }, () => next());
};
