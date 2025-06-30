//Express.js Backend Server for Pixora


// Импорт необходимых библиотек и модулей
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Импорт маршрутов
import generateNameRoutes from './routes/generateName';
import generateLogoRoutes from './routes/generateLogo';
//import generateBrandbookRoutes from './routes/generateBrandbook';

// Загрузка переменных окружения
config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

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
//app.use('/api', generateBrandbookRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 