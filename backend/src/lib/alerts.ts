// Operator alerts: tells the team about trouble before users do. Every
// `log.error` event, plus a few warnings that need a human (a generation job
// that failed, a payment whose signature did not verify), is sent to a
// Slack / Discord webhook and/or a Telegram chat.
//
// - Rate limited per event: the first one goes out at once; repeats within
//   ALERT_MIN_INTERVAL_SECONDS are counted and summarised in one follow-up.
// - Hard cap per hour so an outage cannot flood the channel.
// - Only allow-listed, non-personal fields are sent (no user ids, emails,
//   tokens or request bodies). Delivery failures never affect requests.
import { log, setLogSink, type Level } from './logger.js';

export interface AlertConfig {
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  /** Shown in every message, e.g. "PoliceExams API (production)". */
  source: string;
  minIntervalSeconds: number;
  maxPerHour: number;
  /** Replaceable for tests. */
  fetch?: typeof fetch;
}

export interface Alert {
  event: string;
  level: Level;
  title: string;
  fields: Record<string, string | number>;
  /** Repeats folded into this message. */
  suppressed?: number;
}

/** Warnings that still need a person. Every error-level event alerts. */
const ALERT_WARNINGS = new Set(['generation.failed', 'enroll.signature_invalid']);

const TITLES: Record<string, string> = {
  'request.failed': 'Server error (500) on an API request',
  'api.start_failed': 'The API could not start',
  'worker.start_failed': 'The generation worker could not start',
  'worker.batch_crashed': 'A generation batch crashed',
  'worker.poll_failed': 'The generation worker cannot read its queue',
  'worker.recover_failed': 'The generation worker could not recover stuck batches',
  'process.uncaught_exception': 'The API process crashed (uncaught exception)',
  'process.unhandled_rejection': 'The API process crashed (unhandled promise rejection)',
  'health.db_down': 'Database is not answering the health check',
  'generation.failed': 'A question-generation job failed',
  'enroll.signature_invalid': 'A payment signature did not verify',
  'enroll.order_failed': 'Razorpay refused to create an order',
  'alert.test': 'Test alert from the admin console',
};

const SAFE_FIELDS = [
  'method',
  'path',
  'status',
  'message',
  'requestId',
  'jobId',
  'batchId',
  'failedBatches',
  'totalBatches',
  'count',
  'orderId',
  'latencyMs',
  'by',
] as const;

let config: AlertConfig | null = null;
const lastSent = new Map<string, number>();
const pending = new Map<string, { alert: Alert; count: number; timer: NodeJS.Timeout }>();
const inFlight = new Set<Promise<void>>();
let hourStart = 0;
let sentThisHour = 0;

export function alertsEnabled(): { webhook: boolean; telegram: boolean } {
  return { webhook: !!config?.webhookUrl, telegram: !!(config?.telegramBotToken && config.telegramChatId) };
}

function pickFields(fields: Record<string, unknown> | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k of SAFE_FIELDS) {
    const v = fields?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v) out[k] = v.length > 300 ? `${v.slice(0, 300)}…` : v;
  }
  return out;
}

export function formatAlert(a: Alert, source: string, at = new Date()): string {
  const lines = [`${a.level === 'error' ? '🚨' : '⚠️'} ${source}: ${a.title}`, `event: ${a.event}`];
  for (const [k, v] of Object.entries(a.fields)) lines.push(`${k}: ${v}`);
  if (a.suppressed) lines.push(`(+${a.suppressed} more like this in the last few minutes)`);
  lines.push(`time: ${at.toISOString()}`);
  return lines.join('\n');
}

function webhookBody(url: string, text: string): Record<string, unknown> {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (/(^|\.)discord(app)?\.com$/.test(host)) return { content: text.slice(0, 1900) };
  if (host === 'hooks.slack.com') return { text };
  return { text, content: text.slice(0, 1900) };
}

async function deliver(a: Alert): Promise<{ webhook?: boolean; telegram?: boolean }> {
  const c = config;
  if (!c) return {};
  const doFetch = c.fetch ?? fetch;
  const text = formatAlert(a, c.source);
  const result: { webhook?: boolean; telegram?: boolean } = {};
  const jobs: Promise<void>[] = [];
  if (c.webhookUrl) {
    const url = c.webhookUrl;
    jobs.push(
      doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody(url, text)),
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => {
          result.webhook = r.ok;
          if (!r.ok) log.warn('alert.delivery_failed', { channel: 'webhook', status: r.status });
        })
        .catch((e: unknown) => {
          result.webhook = false;
          log.warn('alert.delivery_failed', { channel: 'webhook', message: e instanceof Error ? e.name : 'error' });
        })
    );
  }
  if (c.telegramBotToken && c.telegramChatId) {
    jobs.push(
      doFetch(`https://api.telegram.org/bot${c.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: c.telegramChatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => {
          result.telegram = r.ok;
          if (!r.ok) log.warn('alert.delivery_failed', { channel: 'telegram', status: r.status });
        })
        .catch((e: unknown) => {
          result.telegram = false;
          log.warn('alert.delivery_failed', { channel: 'telegram', message: e instanceof Error ? e.name : 'error' });
        })
    );
  }
  await Promise.all(jobs);
  return result;
}

function track(p: Promise<unknown>) {
  const done = p.then(
    () => undefined,
    () => undefined
  );
  inFlight.add(done);
  void done.finally(() => inFlight.delete(done));
}

function underHourlyCap(now: number): boolean {
  if (now - hourStart >= 3_600_000) {
    hourStart = now;
    sentThisHour = 0;
  }
  if (sentThisHour >= (config?.maxPerHour ?? 30)) return false;
  sentThisHour++;
  return true;
}

/** Queue an alert, applying the per-event interval and the hourly cap. */
export function raiseAlert(a: Alert): void {
  const c = config;
  if (!c || (!c.webhookUrl && !(c.telegramBotToken && c.telegramChatId))) return;
  const now = Date.now();
  const windowMs = c.minIntervalSeconds * 1000;
  const last = lastSent.get(a.event);
  if (last !== undefined && now - last < windowMs) {
    // Fold into one summary sent when the window closes.
    const p = pending.get(a.event);
    if (p) {
      p.count++;
      return;
    }
    const timer = setTimeout(() => {
      const entry = pending.get(a.event);
      pending.delete(a.event);
      if (!entry) return;
      lastSent.set(a.event, Date.now());
      if (underHourlyCap(Date.now())) track(deliver({ ...entry.alert, suppressed: entry.count }));
    }, windowMs - (now - last));
    timer.unref?.();
    pending.set(a.event, { alert: a, count: 1, timer });
    return;
  }
  lastSent.set(a.event, now);
  if (underHourlyCap(now)) track(deliver(a));
}

/** Logger hook: turns error events (and a few warnings) into alerts. */
function onLog(level: Level, event: string, fields?: Record<string, unknown>) {
  if (event.startsWith('alert.')) return; // never alert about alerting
  if (level !== 'error' && !(level === 'warn' && ALERT_WARNINGS.has(event))) return;
  raiseAlert({ event, level, title: TITLES[event] ?? event, fields: pickFields(fields) });
}

export function configureAlerts(c: AlertConfig | null): void {
  for (const p of pending.values()) clearTimeout(p.timer);
  pending.clear();
  lastSent.clear();
  hourStart = 0;
  sentThisHour = 0;
  config = c;
  setLogSink(c ? onLog : null);
}

/** Start-up failed before the environment was validated: alert anyway if
 * the alert variables are present, so a broken deploy is not silent. */
export function configureAlertsFromProcessEnv(source = 'PoliceExams API'): void {
  if (config) return;
  const e = process.env;
  const webhookUrl = e.ALERT_WEBHOOK_URL?.trim() || undefined;
  const telegramBotToken = e.TELEGRAM_BOT_TOKEN?.trim() || undefined;
  const telegramChatId = e.TELEGRAM_CHAT_ID?.trim() || undefined;
  if (!webhookUrl && !(telegramBotToken && telegramChatId)) return;
  configureAlerts({
    webhookUrl,
    telegramBotToken,
    telegramChatId,
    source: `${e.ALERT_SOURCE_NAME?.trim() || source} (${e.NODE_ENV ?? 'development'})`,
    minIntervalSeconds: 600,
    maxPerHour: 30,
  });
}

/** Logs and alerts a fatal process error, waits for delivery, then exits. */
export function installCrashHandlers(): void {
  const fatal = (event: string, err: unknown) => {
    log.error(event, { message: err instanceof Error ? err.message : String(err) });
    if (err instanceof Error && err.stack) console.error(err.stack);
    void flushAlerts().finally(() => process.exit(1));
  };
  process.on('uncaughtException', (e) => fatal('process.uncaught_exception', e));
  process.on('unhandledRejection', (e) => fatal('process.unhandled_rejection', e));
}

/** Sends one alert now (no rate limit); for the console's "send test" button. */
export async function sendTestAlert(by: string) {
  const enabled = alertsEnabled();
  if (!enabled.webhook && !enabled.telegram) return { enabled, delivered: {} };
  const delivered = await deliver({ event: 'alert.test', level: 'warn', title: TITLES['alert.test']!, fields: { by } });
  return { enabled, delivered };
}

/** Waits (briefly) for alerts still being sent — call before exiting. */
export async function flushAlerts(timeoutMs = 6000): Promise<void> {
  await Promise.race([Promise.all([...inFlight]), new Promise((r) => setTimeout(r, timeoutMs).unref?.())]);
}
