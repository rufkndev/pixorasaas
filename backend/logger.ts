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

// Тот же вызов, что у console: log.error('Не удалось:', error.message). Так замена
// console.* прошла механически, без переписывания каждого сообщения
const write =
  (level: 'info' | 'warn' | 'error') =>
  (...args: unknown[]): void =>
    base[level](maskPersonalData(format(...args)));

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
