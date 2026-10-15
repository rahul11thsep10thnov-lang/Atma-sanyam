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

const flag = (defaultValue = false) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? defaultValue : v === 'true' || v === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // Number of reverse-proxy hops in front of the API (Render/Railway/Fly = 1).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // Browser origins allowed to call the API directly: the LoJi website
  // (Expo web) needs its origin here; the native apps and the admin console
  // (server-side proxy) do not.
  CORS_ORIGINS: csv,
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  GUARDIAN_SESSION_TTL_DAYS: z.coerce.number().positive().default(30),
  PLAYER_SESSION_TTL_DAYS: z.coerce.number().positive().default(14),
  // Days between a deletion request and the data being removed (the guardian
  // can cancel in between).
  DELETION_COOLING_OFF_DAYS: z.coerce.number().int().min(0).max(30).default(7),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  EXPO_PUSH_URL: z.string().url().default('https://exp.host/--/api/v2/push/send'),
  // Transactional email (receipts, support) via Resend. Optional.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  MAIL_DEV_LOG: flag(false),
  // One-time codes by SMS. SMS_PROVIDER picks the sender; without one only
  // OTP_TEST_NUMBERS can sign in.
  SMS_PROVIDER: z.enum(['msg91', 'twilio', 'console', '']).default(''),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  // Country code assumed when someone types a number without one (91 = India).
  DEFAULT_COUNTRY_CODE: z.string().regex(/^[1-9]\d{0,2}$/).default('91'),
  // Numbers with a fixed code for app-store review and automated tests, as
  // "+919999900001:123456,+919999900002:654321". No SMS is sent to them.
  // Refused in production unless OTP_TEST_NUMBERS_ALLOW_PRODUCTION=true (for
  // the store-review account only).
  OTP_TEST_NUMBERS: z
    .string()
    .optional()
    .transform((v) => {
      const out = new Map<string, string>();
      for (const pair of (v ?? '').split(',')) {
        const [phone, code] = pair.split(':').map((s) => s.trim());
        if (phone && code && /^\+\d{8,15}$/.test(phone) && /^\d{6}$/.test(code)) out.set(phone, code);
      }
      return out;
    }),
  OTP_TEST_NUMBERS_ALLOW_PRODUCTION: flag(false),
  // Seconds between two codes to the same number (tests set 0).
  OTP_RESEND_COOLDOWN_S: z.coerce.number().int().min(0).max(300).default(45),
  // ---- Subscriptions -------------------------------------------------
  // The monthly product. Google Play: the subscription product id and base
  // plan; the price shown in the app comes from the store, these are for
  // the website/receipts.
  SUBSCRIPTION_PRODUCT_ID: z.string().default('loji_monthly'),
  SUBSCRIPTION_PRICE_INR: z.coerce.number().int().positive().default(199),
  // Google Play Developer API: a service account JSON (base64 or raw) with
  // "View financial data" + "Manage orders and subscriptions" on the app.
  GOOGLE_PLAY_PACKAGE_NAME: z.string().optional(),
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // Pub/Sub push endpoint secret for Real-time developer notifications:
  // the subscription's push URL is https://<api>/v1/webhooks/google-play?token=<this>.
  GOOGLE_PLAY_RTDN_TOKEN: z.string().optional(),
  // Razorpay Subscriptions for the website.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Development/test only: a provider that activates a subscription without
  // any payment. Ignored (and a warning logged) in production.
  BILLING_SANDBOX: flag(false),
  // Analytics events older than this are deleted by `npm run cleanup`.
  EVENTS_RETENTION_DAYS: z.coerce.number().int().min(30).default(395),
  // Days of screen-time history kept per child.
  SCREEN_TIME_RETENTION_DAYS: z.coerce.number().int().min(30).default(120),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (env.OTP_TEST_NUMBERS.size > 0 && !env.OTP_TEST_NUMBERS_ALLOW_PRODUCTION) {
      console.warn('OTP_TEST_NUMBERS is set in production without OTP_TEST_NUMBERS_ALLOW_PRODUCTION; ignoring it.');
      env.OTP_TEST_NUMBERS.clear();
    }
    if (env.BILLING_SANDBOX) {
      console.warn('BILLING_SANDBOX is ignored in production.');
      env.BILLING_SANDBOX = false;
    }
    if (env.SMS_PROVIDER === 'console') throw new Error('SMS_PROVIDER=console is not allowed in production');
  }
  return env;
}
