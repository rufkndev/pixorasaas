// backend/loadEnv.ts
import { config } from 'dotenv';
import path from 'path';

// Гарантированная загрузка .env.local из корня проекта
config({ path: path.resolve(process.cwd(), '.env.local') });
