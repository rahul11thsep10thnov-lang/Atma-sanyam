import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { createExpoPushSender } from './lib/push.js';
import { createConsoleMailer, createResendMailer, type Mailer } from './lib/mailer.js';
import { createConsoleSmsSender, createMsg91SmsSender, createTwilioSmsSender, type SmsSender } from './lib/sms.js';
import { pendingDeliveries } from './routes/admin/notifications.js';
import { createApp } from './app.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX);
const push = createExpoPushSender({ url: env.EXPO_PUSH_URL, accessToken: env.EXPO_ACCESS_TOKEN });
let mailer: Mailer | null = null;
if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  mailer = createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
} else if (env.MAIL_DEV_LOG && env.NODE_ENV !== 'production') {
  mailer = createConsoleMailer();
  console.warn('MAIL_DEV_LOG is on: emails (including reset codes) are printed to this log. Never use in production.');
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
  console.warn(`SMS_PROVIDER=${env.SMS_PROVIDER} is missing its credentials; phone sign-in is disabled.`);
}
if (env.OTP_TEST_NUMBERS.size > 0) console.warn(`${env.OTP_TEST_NUMBERS.size} test number(s) accept a fixed sign-in code.`);
const app = createApp({ db: database.db, env, push, mailer, sms });

const server = app.listen(env.PORT, () => {
  console.log(`Tame API listening on :${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await Promise.allSettled([...pendingDeliveries]);
  await database.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
