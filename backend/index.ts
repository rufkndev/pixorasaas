// Express-сервер Pixora. Все маршруты начинаются с /api.

// Должен быть первым импортом: подтягивает переменные окружения
import './loadEnv';
import { validateEnv } from './env';

validateEnv();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { GENERATED_LOGOS_DIR, isSourceLogoFile } from './paths';

import authRoutes from './routes/auth';
import generateNameRoutes from './routes/generateName';
import generateLogoRoutes from './routes/generateLogo';
import generateBrandbookRoutes from './routes/generateBrandbook';
import generationLimitRoutes from './routes/generationLimits';
import sendContactRoutes from './routes/sendContact';
import downloadBrandbookRoutes from './routes/downloadBrandbook';
import downloadLogoRoutes from './routes/downloadLogo';
import yookassaPaymentRoutes from './routes/yookassaPayments';
import { closePool, getPool } from './db/pool';
import { startScheduler, stopScheduler } from './jobs/scheduler';
import { stopAcceptingDeliveries, waitForActiveDeliveries } from './services/orderService';
import { log, requestLogger } from './logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Заголовок с названием фреймворка только подсказывает, какие уязвимости пробовать
app.disable('x-powered-by');

// Без этого за Caddy req.ip вернёт адрес прокси, и rate-limit
// посчитает всех посетителей одним клиентом
app.set('trust proxy', 1);

app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// origin: '*' вместе с credentials: true невалиден — браузер отвергает такой ответ
app.use(
  cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Чистый логотип лежит в общем каталоге, но статикой не отдаётся:
// без этой заглушки его можно было бы скачать, зная имя файла
app.use(
  '/generated-logos',
  (req, res, next) => {
    if (isSourceLogoFile(req.path)) {
      return res.status(404).end();
    }
    next();
  },
  express.static(GENERATED_LOGOS_DIR)
);

// Проверяет и базу: живой процесс без базы не обслужит ни один запрос, и
// healthcheck в compose должен это видеть
app.get('/api/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', generateNameRoutes);
app.use('/api', generateLogoRoutes);
app.use('/api/generate-brandbook', generateBrandbookRoutes);
app.use('/api', generationLimitRoutes);
app.use('/api', sendContactRoutes);
app.use('/api', downloadBrandbookRoutes);
app.use('/api', downloadLogoRoutes);
app.use('/api', yookassaPaymentRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

const server = app.listen(PORT, () => {
  log.info(`Server running on port ${PORT}`);
  startScheduler();
});

// docker stop шлёт SIGTERM и через stop_grace_period добивает процесс. Брошенная
// посреди сборка не потеряется — её подберёт досборщик, — но лучше её доделать
const SHUTDOWN_WAIT_MS = 50_000;
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`${signal}: останавливаемся, ждём идущие выдачи`);

  stopScheduler();
  stopAcceptingDeliveries();
  server.close();

  const finished = await waitForActiveDeliveries(SHUTDOWN_WAIT_MS);
  if (!finished) log.warn('Не все выдачи закончились — их подберёт досборщик после старта');

  await closePool().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
