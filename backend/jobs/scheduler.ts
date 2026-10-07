import { authTokensRepo, ipUsageRepo, sessionsRepo } from '../db/repositories';
import { redeliverStuckOrders, syncPendingPayments } from '../services/orderService';
import { cleanupExpiredUnpaidLogos, cleanupOrphanDemoFiles } from '../services/cleanupService';
import { log } from '../logger';

const MINUTE = 60 * 1000;

interface Job {
  name: string;
  everyMs: number;
  // Первый запуск — не сразу на старте: процесс сначала должен поднять сервер
  firstDelayMs: number;
  run: () => Promise<unknown>;
}

// Фоновые задачи живут в том же процессе, что и API: процесс один, а отдельный
// воркер ради нескольких задач раз в минуты — лишний контейнер
const JOBS: Job[] = [
  {
    name: 'довыдача заказов',
    everyMs: 2 * MINUTE,
    firstDelayMs: 15_000,
    run: redeliverStuckOrders,
  },
  {
    name: 'сверка свежих платежей',
    everyMs: 5 * MINUTE,
    firstDelayMs: 30_000,
    run: () => syncPendingPayments(3, 120),
  },
  {
    name: 'сверка старых платежей',
    everyMs: 60 * MINUTE,
    firstDelayMs: 60_000,
    run: () => syncPendingPayments(120, 48 * 60),
  },
  {
    name: 'чистка',
    everyMs: 24 * 60 * MINUTE,
    firstDelayMs: 5 * MINUTE,
    run: async () => {
      await sessionsRepo.deleteExpired();
      await authTokensRepo.deleteExpired();
      await ipUsageRepo.deleteOld();
      const demo = await cleanupOrphanDemoFiles();
      const logos = await cleanupExpiredUnpaidLogos();
      if (demo || logos) log.info(`Чистка: демо-файлов ${demo}, неоплаченных логотипов ${logos}`);
    },
  },
];

const timers: NodeJS.Timeout[] = [];
const running = new Set<string>();
let stopped = false;

// Задача не запускается поверх самой себя: медленная сверка с ЮKassa не должна
// наслаиваться на следующий тик
const tick = async (job: Job): Promise<void> => {
  if (stopped || running.has(job.name)) return;
  running.add(job.name);

  try {
    await job.run();
  } catch (error: any) {
    log.error(`Фоновая задача «${job.name}» упала:`, error.message);
  } finally {
    running.delete(job.name);
  }
};

export const startScheduler = (): void => {
  for (const job of JOBS) {
    timers.push(
      setTimeout(() => {
        void tick(job);
        timers.push(setInterval(() => void tick(job), job.everyMs));
      }, job.firstDelayMs)
    );
  }
};

export const stopScheduler = (): void => {
  stopped = true;
  timers.forEach((timer) => clearTimeout(timer));
};
