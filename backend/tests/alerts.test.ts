import express from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { configureAlerts, flushAlerts, formatAlert, type AlertConfig } from '../src/lib/alerts.js';
import { log } from '../src/lib/logger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { auth, adminToken, setupTestApp } from './helpers.js';

interface Sent {
  url: string;
  body: Record<string, unknown>;
}

function fakeFetch(status = 200) {
  const sent: Sent[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response('{}', { status });
  }) as typeof fetch;
  return { sent, fn };
}

const base = (over: Partial<AlertConfig>): AlertConfig => ({
  webhookUrl: 'https://hooks.slack.com/services/T/B/X',
  source: 'PoliceExams API (test)',
  minIntervalSeconds: 600,
  maxPerHour: 30,
  ...over,
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('alerts', () => {
  afterEach(() => configureAlerts(null));

  it('sends error events with only safe fields', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn }));
    log.error('request.failed', {
      method: 'GET',
      path: '/api/admin/mock-tests',
      message: 'boom',
      requestId: 'r-1',
      userId: 'user-123',
      email: 'aspirant@example.com',
      token: 'secret-token',
    });
    await flushAlerts();
    expect(f.sent).toHaveLength(1);
    expect(f.sent[0]!.url).toBe('https://hooks.slack.com/services/T/B/X');
    const text = String(f.sent[0]!.body.text);
    expect(text).toContain('Server error (500)');
    expect(text).toContain('path: /api/admin/mock-tests');
    expect(text).toContain('requestId: r-1');
    expect(text).not.toContain('user-123');
    expect(text).not.toContain('aspirant@example.com');
    expect(text).not.toContain('secret-token');
  });

  it('alerts on chosen warnings only', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn }));
    log.warn('generation.batch_retry', { jobId: 'j' });
    log.info('enroll.activated', {});
    log.warn('generation.failed', { jobId: 'j-9', failedBatches: 2, totalBatches: 5 });
    log.warn('enroll.signature_invalid', { orderId: 'o-1', userId: 'u-1' });
    await flushAlerts();
    expect(f.sent.map((s) => String(s.body.text).split('\n')[1])).toEqual(['event: generation.failed', 'event: enroll.signature_invalid']);
    expect(String(f.sent[1]!.body.text)).not.toContain('u-1');
  });

  it('folds repeats into one summary per interval', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn, minIntervalSeconds: 0.2 }));
    for (let i = 0; i < 5; i++) log.error('worker.poll_failed', { message: `try ${i}` });
    await flushAlerts();
    expect(f.sent).toHaveLength(1);
    await wait(350);
    await flushAlerts();
    expect(f.sent).toHaveLength(2);
    expect(String(f.sent[1]!.body.text)).toContain('+4 more');
    // A different event is not held back by the first one.
    log.error('health.db_down', { latencyMs: 3000 });
    await flushAlerts();
    expect(f.sent).toHaveLength(3);
  });

  it('caps alerts per hour', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn, maxPerHour: 3 }));
    for (let i = 0; i < 6; i++) log.error(`custom.event_${i}`, {});
    await flushAlerts();
    expect(f.sent).toHaveLength(3);
  });

  it('formats for Discord and Telegram', async () => {
    const f = fakeFetch();
    configureAlerts(
      base({ webhookUrl: 'https://discord.com/api/webhooks/1/abc', telegramBotToken: '123:ABC', telegramChatId: '-100200', fetch: f.fn })
    );
    log.error('api.start_failed', { message: 'Invalid environment configuration' });
    await flushAlerts();
    const discord = f.sent.find((s) => s.url.startsWith('https://discord.com'))!;
    expect(discord.body).toHaveProperty('content');
    expect(discord.body).not.toHaveProperty('text');
    const tg = f.sent.find((s) => s.url.startsWith('https://api.telegram.org/bot123:ABC/sendMessage'))!;
    expect(tg.body).toMatchObject({ chat_id: '-100200', disable_web_page_preview: true });
    expect(String(tg.body.text)).toContain('The API could not start');
  });

  it('never throws or loops when delivery fails', async () => {
    const f = fakeFetch(500);
    configureAlerts(base({ fetch: f.fn }));
    expect(() => log.error('request.failed', { path: '/x' })).not.toThrow();
    await flushAlerts();
    expect(f.sent).toHaveLength(1); // the failure itself is logged, not alerted
    const broken = (async () => {
      throw new Error('network down');
    }) as typeof fetch;
    configureAlerts(base({ fetch: broken }));
    expect(() => log.error('request.failed', { path: '/y' })).not.toThrow();
    await flushAlerts();
  });

  it('does nothing when no channel is configured', async () => {
    const f = fakeFetch();
    configureAlerts(base({ webhookUrl: undefined, fetch: f.fn }));
    log.error('request.failed', {});
    await flushAlerts();
    expect(f.sent).toHaveLength(0);
  });

  it('alerts on a 500 from a route but not on client errors', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn }));
    const app = express();
    app.get('/boom', () => {
      throw new Error('kaput');
    });
    app.post('/json', express.json(), (_req, res) => {
      res.json({});
    });
    app.use(errorHandler);
    expect((await request(app).get('/boom')).status).toBe(500);
    expect((await request(app).post('/json').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
    await flushAlerts();
    expect(f.sent).toHaveLength(1);
    expect(String(f.sent[0]!.body.text)).toContain('path: /boom');
    expect(String(f.sent[0]!.body.text)).toContain('message: kaput');
  });

  it('formats a readable message', () => {
    const text = formatAlert(
      { event: 'generation.failed', level: 'warn', title: 'A question-generation job failed', fields: { jobId: 'j1' }, suppressed: 2 },
      'PoliceExams API (production)',
      new Date('2026-01-01T00:00:00Z')
    );
    expect(text).toBe(
      [
        '⚠️ PoliceExams API (production): A question-generation job failed',
        'event: generation.failed',
        'jobId: j1',
        '(+2 more like this in the last few minutes)',
        'time: 2026-01-01T00:00:00.000Z',
      ].join('\n')
    );
  });
});

describe('health and alert routes', () => {
  let ctx: Awaited<ReturnType<typeof setupTestApp>>;
  let admin: string;
  let reviewer: string;
  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
  });
  afterAll(async () => {
    configureAlerts(null);
  });

  it('reports the database in the deep health check', async () => {
    const res = await request(ctx.app).get('/api/health/deep');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.ok).toBe(true);
    expect(typeof res.body.checks.database.latencyMs).toBe('number');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('lets settings admins see channels and send a test alert', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn }));
    const ch = await request(ctx.app).get('/api/admin/alerts').set(auth(admin));
    expect(ch.status).toBe(200);
    expect(ch.body.channels).toEqual({ webhook: true, telegram: false });
    const res = await request(ctx.app).post('/api/admin/alerts/test').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.delivered).toEqual({ webhook: true });
    expect(String(f.sent[0]!.body.text)).toContain('Test alert');
    expect((await request(ctx.app).post('/api/admin/alerts/test').set(auth(reviewer))).status).toBe(403);
  });

  it('returns 503 and alerts when the database is down', async () => {
    const f = fakeFetch();
    configureAlerts(base({ fetch: f.fn }));
    await ctx.close();
    const res = await request(ctx.app).get('/api/health/deep');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'down', checks: { database: { ok: false } } });
    expect(JSON.stringify(res.body)).not.toMatch(/pglite|postgres|password/i);
    await flushAlerts();
    expect(String(f.sent[0]!.body.text)).toContain('Database is not answering');
  });
});
