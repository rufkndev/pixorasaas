import fs from 'fs';
import os from 'os';
import path from 'path';
import tls from 'tls';
import axios from 'axios';

import { query, queryOne } from '../db/pool';
import { GENERATED_LOGOS_DIR } from '../paths';
import { apiUtils } from '../utils/apiUtils';
import { yookassaService } from '../services/yookassaService';
import { mailService } from '../services/mailService';
import { alertService } from '../services/alertService';
import { settingsService } from '../services/settingsService';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'off';

export interface CheckResult {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  ms: number;
  at: string;
}

const results = new Map<string, CheckResult>();

const timed = async (
  key: string,
  label: string,
  fn: () => Promise<{ status: CheckStatus; detail: string }>
): Promise<CheckResult> => {
  const started = Date.now();
  let outcome: { status: CheckStatus; detail: string };
  try {
    outcome = await fn();
  } catch (error: any) {
    outcome = { status: 'fail', detail: error.message || 'ошибка' };
  }
  const result = { key, label, ...outcome, ms: Date.now() - started, at: new Date().toISOString() };
  results.set(key, result);
  return result;
};

export const fetchGenapiBalance = async (): Promise<number> => {
  const response = await axios.get(`${apiUtils.getBaseUrl()}/user`, {
    headers: { Authorization: `Bearer ${apiUtils.getApiKey()}`, Accept: 'application/json' },
    timeout: 10_000,
  });
  const balance = Number(response.data?.balance);
  if (!Number.isFinite(balance)) throw new Error('GenAPI не вернул баланс');
  return balance;
};

// Сертификат выпускает Caddy сам, но если продление сломается, узнаем об этом
// только по пустому сайту. Проверяем снаружи, как браузер
const certificateDaysLeft = (host: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return reject(new Error('сертификат не получен'));
      resolve(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000));
    });
    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('таймаут'));
    });
  });

const CHECKS: Array<() => Promise<CheckResult>> = [
  () =>
    timed('db', 'База данных', async () => {
      await query('SELECT 1');
      return { status: 'ok', detail: 'отвечает' };
    }),

  () =>
    timed('genapi', 'GenAPI и баланс', async () => {
      if (!process.env.GENAPI_KEY) return { status: 'off', detail: 'GENAPI_KEY не задан' };
      const balance = await fetchGenapiBalance();
      await query('INSERT INTO genapi_balance (balance) VALUES ($1) ON CONFLICT DO NOTHING', [balance]);

      const { genapiBalanceAlertRub } = await settingsService.get();
      if (balance < genapiBalanceAlertRub) {
        await alertService.notify(
          'genapi-balance',
          'Баланс GenAPI заканчивается',
          `Осталось ${balance.toFixed(2)} ₽ (порог ${genapiBalanceAlertRub} ₽). Когда он кончится, ` +
            'встанут и бесплатные генерации, и сборка оплаченных заказов.'
        );
        return { status: 'warn', detail: `${balance.toFixed(2)} ₽ — ниже порога` };
      }
      return { status: 'ok', detail: `${balance.toFixed(2)} ₽` };
    }),

  () =>
    timed('yookassa', 'ЮKassa', async () => {
      if (!process.env.YOOKASSA_SHOP_ID) return { status: 'off', detail: 'ключи не заданы' };
      const shop = await yookassaService.getShop();
      return { status: 'ok', detail: shop.test ? 'тестовый магазин' : 'боевой магазин' };
    }),

  () =>
    timed('smtp', 'Почта (Postbox)', async () => {
      if (!process.env.POSTBOX_SMTP_USER) return { status: 'off', detail: 'SMTP не настроен' };
      return (await mailService.verify())
        ? { status: 'ok', detail: 'SMTP отвечает' }
        : { status: 'fail', detail: 'SMTP не отвечает — письма не уходят' };
    }),

  () =>
    timed('tls', 'Сертификат HTTPS', async () => {
      const url = new URL(process.env.APP_URL || 'http://localhost');
      if (url.protocol !== 'https:') return { status: 'off', detail: 'не HTTPS (дев)' };
      const days = await certificateDaysLeft(url.hostname);
      if (days < 7) return { status: 'fail', detail: `истекает через ${days} дн.` };
      if (days < 20) return { status: 'warn', detail: `истекает через ${days} дн. — Caddy должен был продлить` };
      return { status: 'ok', detail: `действует ещё ${days} дн.` };
    }),

  () =>
    timed('disk', 'Диск', async () => {
      const stat = await fs.promises.statfs(GENERATED_LOGOS_DIR);
      const freePct = (stat.bavail / stat.blocks) * 100;
      const freeGb = (stat.bavail * stat.bsize) / 1024 ** 3;
      const detail = `свободно ${freeGb.toFixed(1)} ГБ (${freePct.toFixed(0)} %)`;
      if (freePct < 5) return { status: 'fail', detail };
      if (freePct < 15) return { status: 'warn', detail };
      return { status: 'ok', detail };
    }),
];

// Сбой проверки — алерт. О сбое самой почты письмо не уйдёт, но строка [ALERT]
// останется в логах и видна в мониторинге
export const runChecks = async (): Promise<CheckResult[]> => {
  const all = await Promise.all(CHECKS.map((check) => check()));

  for (const result of all) {
    if (result.status === 'fail') {
      await alertService.notify(`check:${result.key}`, `Мониторинг: ${result.label} — сбой`, result.detail);
    }
  }
  return all;
};

export const lastCheckResults = (): CheckResult[] => [...results.values()];

// Размер каталога с картинками считается обходом, поэтому кэшируем на 10 минут
let dirSizeCache: { at: number; bytes: number; files: number } | null = null;

const generatedDirSize = async (): Promise<{ bytes: number; files: number }> => {
  if (dirSizeCache && Date.now() - dirSizeCache.at < 10 * 60_000) return dirSizeCache;

  let bytes = 0;
  let files = 0;
  try {
    for (const name of await fs.promises.readdir(GENERATED_LOGOS_DIR)) {
      const stat = await fs.promises.stat(path.join(GENERATED_LOGOS_DIR, name)).catch(() => null);
      if (stat?.isFile()) {
        bytes += stat.size;
        files++;
      }
    }
  } catch {
    // Каталога нет — значит, пусто
  }
  dirSizeCache = { at: Date.now(), bytes, files };
  return dirSizeCache;
};

export const serverResources = async () => {
  const memory = process.memoryUsage();
  const disk = await fs.promises.statfs(GENERATED_LOGOS_DIR).catch(() => null);
  const dir = await generatedDirSize();
  const db = await queryOne<{ size: string }>('SELECT pg_database_size(current_database()) AS size').catch(() => null);
  const tables = await query<{ name: string; bytes: string; rows: string }>(
    `SELECT relname AS name, pg_total_relation_size(relid) AS bytes, n_live_tup AS rows
       FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 12`
  ).catch(() => []);

  return {
    uptimeSec: Math.round(process.uptime()),
    hostUptimeSec: Math.round(os.uptime()),
    nodeVersion: process.version,
    loadAvg: os.loadavg(),
    cpus: os.cpus().length,
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      hostTotal: os.totalmem(),
      hostFree: os.freemem(),
    },
    disk: disk
      ? { total: disk.blocks * disk.bsize, free: disk.bavail * disk.bsize }
      : null,
    generatedDir: dir,
    dbBytes: db ? Number(db.size) : null,
    tables: tables.map((t) => ({ name: t.name, bytes: Number(t.bytes), rows: Number(t.rows) })),
  };
};
