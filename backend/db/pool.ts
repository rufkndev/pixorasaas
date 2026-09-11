// Пул соединений с PostgreSQL. Единственный файл, знающий про драйвер:
// репозитории работают только через query / queryOne / withTransaction.

import { Pool, PoolClient, QueryResultRow } from 'pg';

let pool: Pool | null = null;

// Создаём лениво, чтобы импорт модуля не требовал переменных окружения
export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL не задан. Проверьте .env.local');
    }

    pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // Без обработчика разрыв соединения роняет процесс целиком
    pool.on('error', (err) => {
      console.error('Ошибка простаивающего соединения с БД:', err.message);
    });
  }

  return pool;
};

// Возвращает строки, а не весь QueryResult — так читается лучше
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<T[]> => {
  const result = await getPool().query<T>(text, params);
  return result.rows;
};

export const queryOne = async <T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<T | null> => {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
};

// Откатывает всё при любой ошибке внутри колбэка
export const withTransaction = async <T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Нарушение уникального ограничения — на нём держится защита от дублей заказов
export const UNIQUE_VIOLATION = '23505';

export const isUniqueViolation = (error: any): boolean =>
  error?.code === UNIQUE_VIOLATION;

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
