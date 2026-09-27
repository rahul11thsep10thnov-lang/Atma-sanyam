import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

// Both drivers produce a PgDatabase over the same schema, so services are
// written once against this type. A transaction (`tx`) is assignable to it.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Database {
  db: Db;
  driver: 'postgres' | 'pglite';
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/database (tsx) and dist/database (compiled).
export const MIGRATIONS_FOLDER = path.resolve(here, '../../drizzle');

/**
 * `postgres://…` → a real PostgreSQL server (Supabase, Neon, RDS, local).
 * Empty or `pglite:<dir>` → embedded PGlite stored on disk (development only,
 * no database server to install). `pglite:memory` → in-memory (tests).
 */
export function createDatabase(url: string | undefined, poolMax = 10): Database {
  const target = url?.trim() || 'pglite:./.data/pglite';
  if (target.startsWith('pglite:')) {
    const location = target.slice('pglite:'.length);
    let client: PGlite;
    if (location === 'memory') {
      client = new PGlite();
    } else {
      mkdirSync(location, { recursive: true });
      client = new PGlite(location);
    }
    const db = drizzlePglite(client, { schema });
    return {
      db: db as unknown as Db,
      driver: 'pglite',
      migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => client.close(),
    };
  }

  const pool = new pg.Pool({ connectionString: target, max: poolMax });
  // Surface idle-client errors (e.g. DB restart) instead of crashing the process.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  const db = drizzlePg(pool, { schema });
  return {
    db: db as unknown as Db,
    driver: 'postgres',
    migrate: () => migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => pool.end(),
  };
}

/** Rows from `db.execute(sql…)`; both drivers return `{ rows }`. */
export function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
