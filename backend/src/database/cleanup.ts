// Housekeeping — run daily (a Render/Railway cron job: `npm run cleanup:prod`).
//  • expired/revoked sessions and old one-time codes are deleted
//  • play sessions whose device vanished are closed as timed_out
//  • deletion requests past their cooling-off period are completed: the
//    child or the whole account is removed (cascades), analytics unlinked
//  • analytics events and screen-time history beyond retention are deleted
// Safe to run any time.
import { and, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { loadEnv } from '../config/env.js';
import { createDatabase, type Db } from './client.js';
import { accountDeletionRequests, adminSessions, children, events, gameSessions, guardianSessions, guardians, otpChallenges, playerSessions, screenTimeRecords } from './schema.js';
import { eq } from 'drizzle-orm';

export async function runCleanup(db: Db, env: ReturnType<typeof loadEnv>, now = new Date()) {
  const out: Record<string, number> = {};
  out.guardianSessions = (await db.delete(guardianSessions).where(or(lt(guardianSessions.expiresAt, now), lt(guardianSessions.revokedAt, new Date(now.getTime() - 86_400_000)))!).returning({ id: guardianSessions.id })).length;
  out.playerSessions = (await db.delete(playerSessions).where(or(lt(playerSessions.expiresAt, now), lt(playerSessions.revokedAt, new Date(now.getTime() - 86_400_000)))!).returning({ id: playerSessions.id })).length;
  out.adminSessions = (await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now)).returning({ id: adminSessions.id })).length;
  // Codes are kept a day so sends per number can be counted.
  out.otpChallenges = (await db.delete(otpChallenges).where(lt(otpChallenges.createdAt, new Date(now.getTime() - 86_400_000))).returning({ id: otpChallenges.id })).length;

  // A running game with no heartbeat for 10 minutes is over.
  const stale = await db
    .update(gameSessions)
    .set({ outcome: 'timed_out', endedAt: now, snapshot: null })
    .where(and(eq(gameSessions.outcome, 'running'), lt(gameSessions.lastHeartbeatAt, new Date(now.getTime() - 10 * 60_000))))
    .returning({ id: gameSessions.id });
  out.staleGameSessions = stale.length;

  // Deletion requests whose cooling-off has passed.
  const due = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(lte(accountDeletionRequests.scheduledFor, now), isNull(accountDeletionRequests.completedAt), isNull(accountDeletionRequests.cancelledAt)));
  let deletedChildren = 0;
  let deletedAccounts = 0;
  for (const req of due) {
    if (req.scope === 'child' && req.childId) {
      await db.delete(children).where(eq(children.id, req.childId));
      deletedChildren++;
    } else if (req.scope === 'account') {
      // Analytics stay as anonymous product events (guardian_id is set null by the FK).
      await db.delete(guardians).where(and(eq(guardians.id, req.guardianId), eq(guardians.status, 'deleted_pending')));
      deletedAccounts++;
    }
    await db.update(accountDeletionRequests).set({ completedAt: now }).where(eq(accountDeletionRequests.id, req.id));
  }
  out.deletedChildren = deletedChildren;
  out.deletedAccounts = deletedAccounts;

  const eventCutoff = new Date(now.getTime() - env.EVENTS_RETENTION_DAYS * 86_400_000);
  out.events = (await db.delete(events).where(lt(events.occurredAt, eventCutoff)).returning({ id: events.id })).length;
  const screenCutoff = new Date(now.getTime() - env.SCREEN_TIME_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  out.screenTimeDays = (await db.delete(screenTimeRecords).where(lt(screenTimeRecords.day, screenCutoff)).returning({ day: screenTimeRecords.day })).length;
  // Old mirrored snapshots on finished sessions should never linger.
  await db.execute(sql`update game_sessions set snapshot = null where outcome <> 'running' and snapshot is not null`);
  return out;
}

async function main() {
  const env = loadEnv();
  const database = createDatabase(env.DATABASE_URL, 1);
  try {
    const r = await runCleanup(database.db, env);
    console.log(`Cleanup: ${Object.entries(r).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  } finally {
    await database.close();
  }
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('Cleanup failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
