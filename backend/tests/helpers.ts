import request from 'supertest';
import { createServer } from 'node:http';
import { sql } from 'drizzle-orm';
import { seedCatalogue } from '../src/database/seedCatalogue.js';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createDatabase, type Database } from '../src/database/client.js';
import { runMigrations } from '../src/database/migrate.js';
import { admins } from '../src/database/schema.js';
import { hashPassword } from '../src/lib/password.js';
import { createRealtimeHub } from '../src/realtime/hub.js';
import { createBillingProviders } from '../src/services/billing/index.js';
import { heartbeat } from '../src/routes/public/player.js';
import { gameSessions } from '../src/database/schema.js';
import { eq } from 'drizzle-orm';
import type { AppDeps } from '../src/types.js';
import type { PushMessage, PushSender, PushTicket } from '../src/lib/push.js';
import type { MailMessage, Mailer } from '../src/lib/mailer.js';
import type { SmsMessage, SmsSender } from '../src/lib/sms.js';

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

export class FakeSms implements SmsSender {
  name = 'fake';
  sent: SmsMessage[] = [];
  failNext = false;
  async send(message: SmsMessage) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('provider down');
    }
    this.sent.push(message);
  }
  lastCode(to: string): string | undefined {
    return [...this.sent].reverse().find((m) => m.to === to)?.code;
  }
}

export async function setupTestApp(opts: { disableRateLimits?: boolean; withMailer?: boolean; withSms?: boolean; envExtra?: Record<string, string> } = { disableRateLimits: true }) {
  const env = loadEnv({ NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL, CORS_ORIGINS: 'http://localhost:8081', BILLING_SANDBOX: 'true', OTP_RESEND_COOLDOWN_S: '0', ...(opts.envExtra ?? {}) });
  const database: Database = createDatabase(TEST_DATABASE_URL, 5);
  // Fresh schema per test file.
  await database.db.execute(sql`drop schema if exists public cascade`);
  await database.db.execute(sql`drop schema if exists drizzle cascade`);
  await database.db.execute(sql`create schema public`);
  await runMigrations(database.db);
  await seedCatalogue(database.db);
  const push = new FakePush();
  const mailer = new FakeMailer();
  const sms = new FakeSms();
  const realtime = createRealtimeHub(database.db);
  const billing = createBillingProviders(env);
  const deps: AppDeps = { db: database.db, env, push, mailer: opts.withMailer === false ? null : mailer, sms: opts.withSms === false ? null : sms, realtime, billing };
  realtime.handlers.heartbeat = async (sessionId, childId, guardianId) => {
    const [s] = await database.db.select().from(gameSessions).where(eq(gameSessions.id, sessionId));
    if (!s || s.childId !== childId) return { running: false, mustEnd: true, reason: 'not_found' };
    if (s.outcome !== 'running') return { running: false, mustEnd: true, reason: s.outcome };
    return heartbeat(deps, s, { childId, guardianId });
  };
  const app = createApp(deps, { disableRateLimits: opts.disableRateLimits ?? true, logRequests: false });
  // The WebSocket hub needs a real listening server (supertest's own is per request).
  const server = createServer(app);
  realtime.attach(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const close = async () => {
    await realtime.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await database.close();
  };
  return { app, database, push, mailer, sms, realtime, billing, deps, db: database.db, port, wsUrl: `ws://127.0.0.1:${port}/v1/ws`, close };
}

export async function createAdmin(
  db: Database['db'],
  roleKey: 'super_admin' | 'admin' | 'editor' | 'fact_checker' | 'support',
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
