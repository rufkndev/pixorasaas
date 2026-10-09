import { query } from '../db/pool';
import { LogEntry, LogLevel, onLog } from '../logger';

// Копия логов в базу для просмотра из админки. Пишем пачками: строка лога
// на каждый запрос, и отдельный INSERT на каждую удвоил бы нагрузку на базу
const FLUSH_MS = 5_000;
const MAX_BUFFER = 2_000;
const MAX_MESSAGE = 4_000;

interface PendingLog {
  at: Date;
  level: LogLevel;
  source: 'server' | 'client';
  message: string;
  requestId: string | null;
  context: Record<string, unknown> | null;
}

let buffer: PendingLog[] = [];
let timer: NodeJS.Timeout | null = null;
let flushing = false;

const push = (entry: PendingLog): void => {
  // База легла — не копим память бесконечно, теряем самые старые
  if (buffer.length >= MAX_BUFFER) buffer.shift();
  buffer.push({ ...entry, message: entry.message.slice(0, MAX_MESSAGE) });
};

// Сбой записи здесь не логируется через log: строка о сбое снова попала бы
// в буфер, и при лежащей базе это был бы бесконечный круг
export const flushLogs = async (): Promise<void> => {
  if (flushing || buffer.length === 0) return;
  flushing = true;

  const batch = buffer;
  buffer = [];

  try {
    const values: unknown[] = [];
    const rows = batch.map((entry, i) => {
      const o = i * 6;
      values.push(entry.at, entry.level, entry.source, entry.message, entry.requestId, entry.context);
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}::jsonb)`;
    });

    await query(
      `INSERT INTO app_logs (at, level, source, message, request_id, context) VALUES ${rows.join(', ')}`,
      values
    );
  } catch {
    // Пачка теряется: логи в stdout остались, а повтор при лежащей базе бесполезен
  } finally {
    flushing = false;
  }
};

export const startLogSink = (): void => {
  onLog((entry: LogEntry) =>
    push({ ...entry, source: 'server', context: null })
  );
  timer = setInterval(() => void flushLogs(), FLUSH_MS);
};

export const stopLogSink = async (): Promise<void> => {
  if (timer) clearInterval(timer);
  await flushLogs();
};

// Ошибки из браузера: без них сбой на фронте видно только по жалобе покупателя
export const recordClientError = (message: string, context: Record<string, unknown>): void => {
  push({ at: new Date(), level: 'error', source: 'client', message, requestId: null, context });
};
