import path from 'node:path';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM = the process exists but belongs to someone else.
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * The embedded database can be opened by only ONE program at a time. A
 * second program would silently work on its own copy and the two would
 * overwrite each other's changes (e.g. a password reset that vanishes). So
 * the first one takes a lock file and any other refuses to start, saying why.
 * A lock left behind by a program that is no longer running is taken over.
 */
function lockEmbeddedDatabase(dir: string): () => void {
  const lockFile = `${path.resolve(dir)}.lock`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        try {
          if (readFileSync(lockFile, 'utf8') === String(process.pid)) unlinkSync(lockFile);
        } catch {
          // Already gone.
        }
      };
      process.once('exit', release);
      return release;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      const owner = Number.parseInt(readFileSync(lockFile, 'utf8'), 10);
      if (Number.isInteger(owner) && owner !== process.pid && processAlive(owner)) {
        throw new Error(
          'The local database is in use by another running program (the API started by "npm run dev:all" or "npm run dev"). ' +
            'Stop it first (press Ctrl+C in that window), run this command again, then start the app again.'
        );
      }
      try {
        unlinkSync(lockFile); // stale: its owner is gone
      } catch {
        // Someone else removed it; try again.
      }
    }
  }
  throw new Error(`Could not lock the local database (${lockFile}). Delete that file if no program is running and try again.`);
}

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
    let unlock = () => {};
    if (location === 'memory') {
      client = new PGlite();
    } else {
      mkdirSync(location, { recursive: true });
      unlock = lockEmbeddedDatabase(location);
      client = new PGlite(location);
    }
    const db = drizzlePglite(client, { schema });
    return {
      db: db as unknown as Db,
      driver: 'pglite',
      migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: async () => {
        await client.close();
        unlock();
      },
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
