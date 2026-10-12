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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // Number of reverse-proxy hops in front of the API (Render/Railway/Fly = 1).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // Browser origins allowed to call the API directly. The admin console talks
  // to the API server-to-server and mobile apps aren't subject to CORS, so in
  // production this is usually empty. Add http://localhost:8081 for Expo web.
  CORS_ORIGINS: csv,
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  USER_SESSION_TTL_DAYS: z.coerce.number().positive().default(30),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  EXPO_PUSH_URL: z.string().url().default('https://exp.host/--/api/v2/push/send'),
  // Transactional email (password-reset codes) via Resend (https://resend.com).
  // Leave empty to disable "forgot password" in the app.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Development only: print emails to the log instead of sending them.
  MAIL_DEV_LOG: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  // One-time sign-in codes by SMS. SMS_PROVIDER picks the sender; leave it
  // empty to disable phone sign-in (the app then hides it).
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
  // Analytics events older than this are deleted by `npm run cleanup`.
  EVENTS_RETENTION_DAYS: z.coerce.number().int().min(30).default(395),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
