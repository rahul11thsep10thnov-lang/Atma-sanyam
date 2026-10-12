// Housekeeping — run daily (e.g. a Render/Railway cron job: `npm run cleanup:prod`).
// Deletes expired sessions and reset codes, and analytics events older than
// EVENTS_RETENTION_DAYS (default 395), keeping storage bounded and honoring
// data-minimisation. Safe to run any time.
import { lt, sql } from 'drizzle-orm';
import { loadEnv } from '../config/env.js';
import { createDatabase } from './client.js';
import { adminSessions, events, otpCodes, passwordResetCodes, userSessions } from './schema.js';

async function main() {
  const env = loadEnv();
  const database = createDatabase(env.DATABASE_URL, 1);
  const { db } = database;
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - env.EVENTS_RETENTION_DAYS * 86_400_000);
    const u = await db.delete(userSessions).where(lt(userSessions.expiresAt, now)).returning({ id: userSessions.id });
    const a = await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now)).returning({ id: adminSessions.id });
    const r = await db
      .delete(passwordResetCodes)
      .where(sql`${passwordResetCodes.expiresAt} < ${now} or ${passwordResetCodes.usedAt} is not null`)
      .returning({ id: passwordResetCodes.id });
    // Sign-in codes are kept a day so sends per number can be counted.
    const o = await db.delete(otpCodes).where(lt(otpCodes.createdAt, new Date(now.getTime() - 86_400_000))).returning({ id: otpCodes.id });
    const e = await db.delete(events).where(lt(events.occurredAt, cutoff)).returning({ id: events.id });
    console.log(
      `Removed ${u.length} user sessions, ${a.length} admin sessions, ${r.length} reset codes, ${o.length} sign-in codes, ${e.length} events older than ${env.EVENTS_RETENTION_DAYS} days.`
    );
  } finally {
    await database.close();
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
