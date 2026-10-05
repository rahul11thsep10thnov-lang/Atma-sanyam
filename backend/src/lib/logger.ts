// Structured JSON logs (one line per event) so a log platform can filter on
// `event`, `jobId`, etc. Values under secret-looking keys are redacted and
// user-identifying fields are never passed in by callers.

export type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SECRET_KEY = /(key|token|secret|password|authorization|cookie)/i;

let threshold: number = ORDER.info;
type Sink = (level: Level, event: string, fields?: Record<string, unknown>) => void;
let sink: Sink | null = null;

/** Receives every event regardless of LOG_LEVEL (used by lib/alerts). */
export function setLogSink(s: Sink | null) {
  sink = s;
}

export function setLogLevel(level: Level | 'silent') {
  threshold = ORDER[level];
}

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

function write(level: Level, event: string, fields?: Record<string, unknown>) {
  if (sink) {
    try {
      sink(level, event, fields);
    } catch {
      // Alerting must never break the caller.
    }
  }
  if (ORDER[level] < threshold) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(redact(fields ?? {}) as object) });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => write('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write('error', event, fields),
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
