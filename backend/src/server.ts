import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { createExpoPushSender } from './lib/push.js';
import { pendingDeliveries } from './routes/admin/notifications.js';
import { createApp } from './app.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX);
const push = createExpoPushSender({ url: env.EXPO_PUSH_URL, accessToken: env.EXPO_ACCESS_TOKEN });
const app = createApp({ db: database.db, env, push });

const server = app.listen(env.PORT, () => {
  console.log(`FOCUS API listening on :${env.PORT} (${env.NODE_ENV})`);
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
