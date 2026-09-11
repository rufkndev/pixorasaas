// Применяет SQL-миграции из db/migrations. Запускается сервисом migrate до старта
// приложения. Не через docker-entrypoint-initdb.d: тот работает только на пустом volume.

import '../loadEnv';

import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './pool';

const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), 'db', 'migrations');

const runMigrations = async (): Promise<void> => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      throw new Error(`Каталог миграций не найден: ${MIGRATIONS_DIR}`);
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations'
    );
    const applied = new Set(rows.map((row) => row.name));

    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log(`Миграции: применять нечего (всего ${files.length}).`);
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      // Каждая миграция целиком в транзакции: либо применяется, либо никак
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Миграция применена: ${file}`);
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw new Error(`Миграция ${file} упала: ${error.message}`);
      }
    }

    console.log(`Готово. Применено миграций: ${pending.length}.`);
  } finally {
    client.release();
  }
};

runMigrations()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error.message);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
