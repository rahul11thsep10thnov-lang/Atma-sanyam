import { z } from 'zod';

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // postgres://… for a real server (Supabase / Neon / RDS / local).
  // Empty → embedded PGlite in ./.data (development only).
  DATABASE_URL: optionalString,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // Number of reverse-proxy hops in front of the API (Render/Railway/Fly = 1).
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // Browser origins allowed to call the API directly: the website
  // (e.g. http://localhost:3000). The admin console calls server-to-server.
  CORS_ORIGINS: csv,
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  USER_SESSION_TTL_DAYS: z.coerce.number().positive().default(30),

  // Supabase Auth: lets website users who signed in with Google / OTP link
  // their account. The anon key is public by design; it is only used to ask
  // Supabase "whose token is this?". The service-role key is NOT needed.
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,

  // --- AI ------------------------------------------------------------------
  // MOCK_AI=true generates realistic questions locally with zero AI spend.
  MOCK_AI: bool(true),
  // Mock mode only: share of generated questions given a deliberate flaw
  // (wrong key, duplicate options, missing explanation) so the validator and
  // review screens have something to catch; and simulated AI latency.
  MOCK_AI_FAULT_RATE: z.coerce.number().min(0).max(1).default(0.06),
  MOCK_AI_LATENCY_MS: z.coerce.number().int().min(0).default(400),
  AI_PROVIDER: z.enum(['anthropic']).default('anthropic'),
  AI_API_KEY: optionalString,
  AI_GENERATION_MODEL: z.string().default('claude-opus-5'),
  AI_REVIEW_MODEL: z.string().default('claude-opus-5'),
  // low | medium | high | xhigh | max — thinking depth and token spend.
  AI_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('high'),
  // Optional price overrides (USD per million tokens) for cost estimates.
  AI_PRICE_INPUT_PER_MTOK: z.coerce.number().positive().optional(),
  AI_PRICE_OUTPUT_PER_MTOK: z.coerce.number().positive().optional(),
  // Defaults for the admin-editable pipeline settings.
  AI_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(20),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_GENERATION_TIMEOUT_MS: z.coerce.number().int().min(10_000).default(600_000),
  AI_REVIEW_TIMEOUT_MS: z.coerce.number().int().min(10_000).default(300_000),
  AI_MAX_QUESTIONS_PER_JOB: z.coerce.number().int().min(1).default(2000),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().optional(),

  // --- Worker ----------------------------------------------------------------
  // Runs generation batches inside the API process. Set false and run
  // `npm run worker` separately to scale generation independently.
  WORKER_ENABLED: bool(true),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  WORKER_POLL_MS: z.coerce.number().int().min(200).default(2000),

  // --- Enrolment / payments ---------------------------------------------------
  // Razorpay checkout for the yearly plan. Both keys stay on the server; the
  // website only ever receives the public key id inside an order response.
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  // Razorpay → Settings → Webhooks: URL https://<api>/api/enroll/razorpay/webhook,
  // events order.paid + payment.captured, and this secret. Activates plans
  // whose buyer closed the browser before the confirmation reached us.
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  // Without Razorpay keys, enrolment can be completed with a "dev" order so
  // the flow can be tested locally. Never on in production unless set.
  ENROLL_DEV_ACTIVATE: bool(false),

  // Answers submitted this long after the deadline are still scored but the
  // attempt is flagged `late` (network hiccups, slow phones).
  ATTEMPT_GRACE_SECONDS: z.coerce.number().int().min(0).default(120),
  // --- Alerts (see docs/OPERATIONS.md) -----------------------------------------
  // Slack or Discord incoming-webhook URL, and/or a Telegram bot + chat. Errors,
  // crashes, failed generation jobs and failed payment checks are sent there.
  ALERT_WEBHOOK_URL: optionalString,
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  ALERT_SOURCE_NAME: z.string().default('PoliceExams API'),
  ALERT_MIN_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(600),
  ALERT_MAX_PER_HOUR: z.coerce.number().int().min(1).default(30),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production (the embedded PGlite database is for development only).');
  }
  if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_SECRET is required when RAZORPAY_KEY_ID is set.');
  }
  if (env.ALERT_WEBHOOK_URL && !/^https:\/\//.test(env.ALERT_WEBHOOK_URL) && env.NODE_ENV === 'production') {
    throw new Error('ALERT_WEBHOOK_URL must be an https:// URL.');
  }
  if (!!env.TELEGRAM_BOT_TOKEN !== !!env.TELEGRAM_CHAT_ID) {
    throw new Error('Set both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for Telegram alerts (or neither).');
  }
  if (!env.MOCK_AI && !env.AI_API_KEY) {
    throw new Error('AI_API_KEY is required when MOCK_AI=false. Set MOCK_AI=true to test the pipeline without an AI provider.');
  }
  return env;
}
