// Express-сервер Pixora. Все маршруты начинаются с /api.

// Должен быть первым импортом: подтягивает переменные окружения
import './loadEnv';

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

const app = express();
const PORT = process.env.PORT || 3001;

// Без этого за Caddy req.ip вернёт адрес прокси, и rate-limit
// посчитает всех посетителей одним клиентом
app.set('trust proxy', 1);

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
