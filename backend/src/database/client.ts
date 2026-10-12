import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;

export interface Database {
  db: Db;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDatabase(url: string, poolMax = 10): Database {
  const pool = new pg.Pool({ connectionString: url, max: poolMax });
  // Surface idle-client errors (e.g. DB restart) instead of crashing the process.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}
