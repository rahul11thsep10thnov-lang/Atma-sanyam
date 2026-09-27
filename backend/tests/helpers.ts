import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createDatabase, type Database } from '../src/database/client.js';
import { runMigrations } from '../src/database/migrate.js';
import { admins } from '../src/database/schema.js';
import { hashPassword } from '../src/lib/password.js';
import type { PushMessage, PushSender, PushTicket } from '../src/lib/push.js';
import type { MailMessage, Mailer } from '../src/lib/mailer.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://focus:focus-local-dev@localhost:5432/focus_test';

export const STRONG_PASSWORD = 'Correct-Horse-9-Battery';

export class FakePush implements PushSender {
  sent: PushMessage[] = [];
  deadTokens = new Set<string>();
  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    this.sent.push(...messages);
    return messages.map((m) =>
      this.deadTokens.has(m.to)
        ? { token: m.to, ok: false, deviceNotRegistered: true, error: 'DeviceNotRegistered' }
        : { token: m.to, ok: true }
    );
  }
}

export class FakeMailer implements Mailer {
  sent: MailMessage[] = [];
  async send(message: MailMessage) {
    this.sent.push(message);
  }
  lastCode(to: string): string | undefined {
    const msg = [...this.sent].reverse().find((m) => m.to === to);
    return msg?.text.match(/\b(\d{6})\b/)?.[1];
  }
}

export async function setupTestApp(opts: { disableRateLimits?: boolean; withMailer?: boolean } = { disableRateLimits: true }) {
  const env = loadEnv({ NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL, CORS_ORIGINS: 'http://localhost:8081' });
  const database: Database = createDatabase(TEST_DATABASE_URL, 5);
  // Fresh schema per test file.
  await database.db.execute(sql`drop schema if exists public cascade`);
  await database.db.execute(sql`drop schema if exists drizzle cascade`);
  await database.db.execute(sql`create schema public`);
  await runMigrations(database.db);
  const push = new FakePush();
  const mailer = new FakeMailer();
  const app = createApp(
    { db: database.db, env, push, mailer: opts.withMailer === false ? null : mailer },
    { disableRateLimits: opts.disableRateLimits ?? true, logRequests: false }
  );
  return { app, database, push, mailer, db: database.db };
}

export async function createAdmin(
  db: Database['db'],
  roleKey: 'super_admin' | 'admin' | 'editor',
  email = `${roleKey}@example.com`,
  password = STRONG_PASSWORD
) {
  const [row] = await db
    .insert(admins)
    .values({ email, name: roleKey, roleKey, passwordHash: await hashPassword(password) })
    .returning();
  return row!;
}

export async function adminToken(app: Parameters<typeof request>[0], email: string, password = STRONG_PASSWORD) {
  const res = await request(app).post('/admin/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export async function waitFor<T>(fn: () => Promise<T>, until: (v: T) => boolean, timeoutMs = 5000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (until(v)) return v;
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}
