import { eq } from 'drizzle-orm';
import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { gameSessions } from './database/schema.js';
import { seedCatalogue } from './database/seedCatalogue.js';
import { createExpoPushSender } from './lib/push.js';
import { createConsoleMailer, createResendMailer, type Mailer } from './lib/mailer.js';
import { createConsoleSmsSender, createMsg91SmsSender, createTwilioSmsSender, type SmsSender } from './lib/sms.js';
import { pendingDeliveries } from './routes/admin/notifications.js';
import { heartbeat } from './routes/public/player.js';
import { createApp } from './app.js';
import { createRealtimeHub } from './realtime/hub.js';
import { createBillingProviders } from './services/billing/index.js';
import type { AppDeps } from './types.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX);
const push = createExpoPushSender({ url: env.EXPO_PUSH_URL, accessToken: env.EXPO_ACCESS_TOKEN });
let mailer: Mailer | null = null;
if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  mailer = createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
} else if (env.MAIL_DEV_LOG && env.NODE_ENV !== 'production') {
  mailer = createConsoleMailer();
  console.warn('MAIL_DEV_LOG is on: emails are printed to this log. Never use in production.');
}
let sms: SmsSender | null = null;
if (env.SMS_PROVIDER === 'msg91' && env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) {
  sms = createMsg91SmsSender(env.MSG91_AUTH_KEY, env.MSG91_TEMPLATE_ID);
} else if (env.SMS_PROVIDER === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
  sms = createTwilioSmsSender(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_FROM);
} else if (env.SMS_PROVIDER === 'console' && env.NODE_ENV !== 'production') {
  sms = createConsoleSmsSender();
  console.warn('SMS_PROVIDER=console: one-time codes are printed to this log. Never use in production.');
} else if (env.SMS_PROVIDER) {
  console.warn(`SMS_PROVIDER=${env.SMS_PROVIDER} is missing its credentials; sign-in by SMS is disabled.`);
}
if (env.OTP_TEST_NUMBERS.size > 0) console.warn(`${env.OTP_TEST_NUMBERS.size} test number(s) accept a fixed verification code.`);
const billing = createBillingProviders(env);
if (billing.sandbox) console.warn('BILLING_SANDBOX is on: subscriptions can be activated without payment. Never use in production.');
if (!billing.googlePlay) console.warn('Google Play billing is not configured (GOOGLE_PLAY_PACKAGE_NAME / GOOGLE_PLAY_SERVICE_ACCOUNT_JSON).');
if (!billing.razorpay) console.warn('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_PLAN_ID); website payments are disabled.');

const realtime = createRealtimeHub(database.db);
const deps: AppDeps = { db: database.db, env, push, mailer, sms, realtime, billing };
realtime.handlers.heartbeat = async (sessionId, childId, guardianId) => {
  const [s] = await database.db.select().from(gameSessions).where(eq(gameSessions.id, sessionId));
  if (!s || s.childId !== childId) return { running: false, mustEnd: true, reason: 'not_found' };
  if (s.outcome !== 'running') return { running: false, mustEnd: true, reason: s.outcome };
  return heartbeat(deps, s, { childId, guardianId });
};
const app = createApp(deps);

const server = app.listen(env.PORT, () => {
  console.log(`LoJi API listening on :${env.PORT} (${env.NODE_ENV})`);
});
realtime.attach(server);
seedCatalogue(database.db)
  .then((r) => (r.gamesInserted || r.craftsInserted) && console.log(`Catalogue: ${r.gamesInserted} new game(s), ${r.craftsInserted} new craft(s) added.`))
  .catch((err) => console.error('Catalogue seed failed:', err instanceof Error ? err.message : err));

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await realtime.close();
  await Promise.allSettled([...pendingDeliveries]);
  await database.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
