import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createDatabase, type Db } from '../src/database/client.js';
import { seedTaxonomy } from '../src/database/seedTaxonomy.js';
import { upsertAdmin } from '../src/database/seedAdmin.js';
import { MockProvider } from '../src/pipeline/ai/mockProvider.js';
import type { AiProvider } from '../src/pipeline/ai/types.js';
import { GenerationWorker } from '../src/pipeline/worker.js';
import { setLogLevel } from '../src/lib/logger.js';
import type { AppDeps } from '../src/types.js';

export const PASSWORD = 'Correct-Horse-9-Battery';

/** A small taxonomy is enough and keeps each test file fast. */
export const MINI_TAXONOMY = {
  exams: [
    {
      slug: 'up-police-constable',
      name: 'UP Police Constable',
      stateCode: 'up',
      examType: 'constable',
      subjects: [
        {
          slug: 'numerical-ability',
          name: 'Numerical Ability',
          sortOrder: 0,
          chapters: [
            { slug: 'percentage', name: 'Percentage', sortOrder: 0 },
            { slug: 'profit-loss', name: 'Profit-Loss', sortOrder: 1 },
          ],
        },
        { slug: 'mental-ability', name: 'Mental Ability', sortOrder: 1, chapters: [{ slug: 'series', name: 'Series', sortOrder: 0 }] },
        { slug: 'state-gk', name: 'UP GK', sortOrder: 2, chapters: [{ slug: 'geography', name: 'Geography', sortOrder: 0 }] },
      ],
    },
  ],
};

const TEST_ENV = { NODE_ENV: 'test', MOCK_AI: 'true', MOCK_AI_LATENCY_MS: '0', MOCK_AI_FAULT_RATE: '0' };
const APP_OPTIONS = { disableRateLimits: true, logRequests: false };
/** Test contexts currently open on TEST_DATABASE_URL (a single shared database). */
let openOnServer = 0;

export async function setupTestApp(opts: { ai?: AiProvider; env?: Record<string, string> } = {}) {
  setLogLevel('silent');
  const env = loadEnv({ ...TEST_ENV, ...opts.env });
  // Embedded in-memory Postgres by default; set TEST_DATABASE_URL to run the
  // same suite against a real PostgreSQL server (it wipes that database).
  const url = process.env.TEST_DATABASE_URL;
  if (url && openOnServer > 0) {
    throw new Error(
      'setupTestApp() would wipe the PostgreSQL database another test context is still using. ' +
        'Close that context first, or use appWithEnv(ctx, {...}) for an app with different settings.'
    );
  }
  const database = createDatabase(url ?? 'pglite:memory', 3);
  if (url) openOnServer++;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (url) openOnServer--;
    await database.close();
  };
  if (url) {
    await database.db.execute(sql`drop schema if exists public cascade`);
    await database.db.execute(sql`drop schema if exists drizzle cascade`);
    await database.db.execute(sql`create schema public`);
  }
  await database.migrate();
  await seedTaxonomy(database.db, MINI_TAXONOMY);
  let call = 0;
  // Seeded per call: batches differ from each other but every run is identical.
  const ai = opts.ai ?? new MockProvider({ faultRate: 0, latencyMs: 0, seed: () => `test-${call++}` });
  const deps: AppDeps = { db: database.db, env, ai, verifySupabaseToken: null };
  const app = createApp(deps, APP_OPTIONS);
  const worker = new GenerationWorker(deps, { concurrency: 1, pollMs: 50 });
  return { app, db: database.db, deps, worker, close };
}

/** A second app on the same database, with settings loaded through the real
 * env loader (so unset values get their production defaults). */
export function appWithEnv(ctx: { deps: AppDeps }, env: Record<string, string> = {}) {
  return createApp({ ...ctx.deps, env: loadEnv({ ...TEST_ENV, ...env }) }, APP_OPTIONS);
}

export async function adminToken(app: Parameters<typeof request>[0], db: Db, role = 'super_admin', email = `${role}@example.com`) {
  await upsertAdmin(db, email, PASSWORD, role, role);
  const res = await request(app).post('/api/admin/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export async function userToken(app: Parameters<typeof request>[0], name = 'Aspirant') {
  const res = await request(app).post('/api/auth/guest').send({ displayName: name });
  return res.body.token as string;
}

export async function scopeIds(app: Parameters<typeof request>[0], token: string) {
  const res = await request(app).get('/api/admin/taxonomy').set('authorization', `Bearer ${token}`);
  const exam = res.body.items[0];
  const maths = exam.subjects.find((s: { slug: string }) => s.slug === 'numerical-ability');
  const reasoning = exam.subjects.find((s: { slug: string }) => s.slug === 'mental-ability');
  const gk = exam.subjects.find((s: { slug: string }) => s.slug === 'state-gk');
  return {
    examId: exam.id as string,
    mathsId: maths.id as string,
    percentageId: maths.chapters.find((c: { slug: string }) => c.slug === 'percentage').id as string,
    profitLossId: maths.chapters.find((c: { slug: string }) => c.slug === 'profit-loss').id as string,
    reasoningId: reasoning.id as string,
    seriesId: reasoning.chapters[0].id as string,
    gkId: gk.id as string,
    geographyId: gk.chapters[0].id as string,
  };
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });
