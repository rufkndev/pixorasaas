import { config } from 'dotenv';
import path from 'path';

// Грузим .env.local из корня проекта, а не из текущего каталога
config({ path: path.resolve(process.cwd(), '.env.local') });
