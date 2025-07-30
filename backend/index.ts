//Express.js Backend Server for Pixora

// Загружаем переменные окружения
import './loadEnv';

// Импорт необходимых библиотек и модулей
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Импорт маршрутов
import generateNameRoutes from './routes/generateName';
import generateLogoRoutes from './routes/generateLogo';
import generateBrandbookRoutes from './routes/generateBrandbook';
import sendContactRoutes from './routes/sendContact';
import downloadBrandbookRoutes from './routes/downloadBrandbook';
import downloadLogoRoutes from './routes/downloadLogo';
import purchaseLogoRoutes from './routes/purchaseLogo';
import yookassaPaymentRoutes from './routes/yookassaPayments';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Статическая раздача сгенерированных логотипов
const publicDir = path.join(__dirname, '..', 'public');
app.use('/generated-logos', express.static(path.join(publicDir, 'generated-logos')));

// Supabase client
let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseInstance;
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', generateNameRoutes);
app.use('/api', generateLogoRoutes);
app.use('/api/generate-brandbook', generateBrandbookRoutes);
app.use('/api', sendContactRoutes);
app.use('/api', downloadBrandbookRoutes);
app.use('/api', downloadLogoRoutes);
app.use('/api', purchaseLogoRoutes);
app.use('/api', yookassaPaymentRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
