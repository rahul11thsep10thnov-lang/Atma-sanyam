import { and, count, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../database/client.js';
import { progressEvents, userBookmarks, userMistakes, userProgress } from '../database/schema.js';

// ---------------------------------------------------------------------------
// Student progress sync. The website keeps working offline and queues small
// events (bookmark on/off, an answer right/wrong, a mistake cleared, the
// daily quiz done, practice points). Each event has a client-made id; the
// server applies an event once, so a retried upload is harmless. The server
// copy is then the student's progress on every device.
//
// Points and streak are motivation only — they never unlock paid content —
// but they are still bounded here so a modified client cannot post huge
// numbers to the leaderboard.
// ---------------------------------------------------------------------------

const questionKey = z.string().min(1).max(100);

export const progressEventSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string().min(8).max(64), at: z.string().datetime(), kind: z.literal('bookmark'), questionKey, on: z.boolean() }),
  z.object({ id: z.string().min(8).max(64), at: z.string().datetime(), kind: z.literal('answer'), questionKey, correct: z.boolean() }),
  z.object({ id: z.string().min(8).max(64), at: z.string().datetime(), kind: z.literal('mistake_clear'), questionKey }),
  z.object({ id: z.string().min(8).max(64), at: z.string().datetime(), kind: z.literal('daily_quiz'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Streak this browser had before sync existed; used only for a first record. */
    importedStreak: z.number().int().min(1).max(366).optional() }),
  z.object({ id: z.string().min(8).max(64), at: z.string().datetime(), kind: z.literal('points'), amount: z.number().int().min(1).max(20) }),
]);
export type ProgressEvent = z.infer<typeof progressEventSchema>;

/** Practice points accepted per user per UTC day (≈ 100 correct answers). */
export const MAX_POINT_EVENTS_PER_DAY = 100;
const DAILY_QUIZ_POINTS = 20;

export async function getProgress(db: Db, userId: string) {
  const [bookmarks, mistakes, [p]] = await Promise.all([
    db.select({ questionKey: userBookmarks.questionKey, createdAt: userBookmarks.createdAt }).from(userBookmarks).where(eq(userBookmarks.userId, userId)),
    db
      .select({ questionKey: userMistakes.questionKey, wrongCount: userMistakes.wrongCount, lastWrongAt: userMistakes.lastWrongAt })
      .from(userMistakes)
      .where(eq(userMistakes.userId, userId)),
    db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
  ]);
  return {
    bookmarks: bookmarks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((b) => b.questionKey),
    mistakes: mistakes.map((m) => ({ questionKey: m.questionKey, wrongCount: m.wrongCount, lastWrongAt: m.lastWrongAt.toISOString() })),
    points: p?.points ?? 0,
    streak: p?.streak ?? 0,
    lastQuizDate: p?.lastQuizDate ?? null,
  };
}

const dayBefore = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/**
 * Applies a batch of events in time order. Returns which ids were applied now
 * and which had been applied before (both mean "done" to the client).
 */
export async function applyProgressEvents(db: Db, userId: string, events: ProgressEvent[]) {
  const ordered = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const applied: string[] = [];
  const duplicate: string[] = [];
  const rejected: string[] = [];
  await db.transaction(async (tx) => {
    await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
    // One writer per user at a time keeps streak / point updates consistent.
    await tx.select({ id: userProgress.userId }).from(userProgress).where(eq(userProgress.userId, userId)).for('update');
    const dayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const [pc] = await tx
      .select({ n: count() })
      .from(progressEvents)
      .where(and(eq(progressEvents.userId, userId), eq(progressEvents.kind, 'points'), gte(progressEvents.receivedAt, dayStart)));
    let pointEventsToday = Number(pc?.n ?? 0);

    for (const e of ordered) {
      const at = new Date(e.at);
      // Events dated in the future are clamped to now (wrong device clock).
      const occurredAt = at.getTime() > Date.now() ? new Date() : at;
      if (e.kind === 'points' && pointEventsToday >= MAX_POINT_EVENTS_PER_DAY) {
        rejected.push(e.id);
        continue;
      }
      const inserted = await tx
        .insert(progressEvents)
        .values({ userId, eventId: e.id, kind: e.kind, occurredAt })
        .onConflictDoNothing()
        .returning({ id: progressEvents.eventId });
      if (!inserted.length) {
        duplicate.push(e.id);
        continue;
      }
      applied.push(e.id);
      switch (e.kind) {
        case 'bookmark':
          if (e.on) await tx.insert(userBookmarks).values({ userId, questionKey: e.questionKey, createdAt: occurredAt }).onConflictDoNothing();
          else await tx.delete(userBookmarks).where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.questionKey, e.questionKey)));
          break;
        case 'answer':
          if (e.correct) {
            await tx.delete(userMistakes).where(and(eq(userMistakes.userId, userId), eq(userMistakes.questionKey, e.questionKey)));
          } else {
            await tx
              .insert(userMistakes)
              .values({ userId, questionKey: e.questionKey, wrongCount: 1, lastWrongAt: occurredAt })
              .onConflictDoUpdate({
                target: [userMistakes.userId, userMistakes.questionKey],
                set: { wrongCount: sql`${userMistakes.wrongCount} + 1`, lastWrongAt: sql`greatest(${userMistakes.lastWrongAt}, excluded.last_wrong_at)` },
              });
          }
          break;
        case 'mistake_clear':
          await tx.delete(userMistakes).where(and(eq(userMistakes.userId, userId), eq(userMistakes.questionKey, e.questionKey)));
          break;
        case 'daily_quiz': {
          const [cur] = await tx.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
          const last = cur?.lastQuizDate ?? null;
          // Only a newer day counts; the same day twice gives nothing.
          if (last !== null && e.date <= last) break;
          const streak = last === null ? (e.importedStreak ?? 1) : last === dayBefore(e.date) ? (cur?.streak ?? 0) + 1 : 1;
          await tx
            .update(userProgress)
            .set({ streak, lastQuizDate: e.date, points: sql`${userProgress.points} + ${DAILY_QUIZ_POINTS}`, updatedAt: new Date() })
            .where(eq(userProgress.userId, userId));
          break;
        }
        case 'points':
          pointEventsToday++;
          await tx
            .update(userProgress)
            .set({ points: sql`${userProgress.points} + ${e.amount}`, updatedAt: new Date() })
            .where(eq(userProgress.userId, userId));
          break;
      }
    }
  });
  return { applied, duplicate, rejected, progress: await getProgress(db, userId) };
}

/** On sign-in, a guest's bookmarks, mistakes and points join the account's.
 * Runs inside the caller's transaction. */
export async function mergeGuestProgress(tx: Db, fromUserId: string, toUserId: string) {
  await tx.execute(sql`
    insert into user_bookmarks (user_id, question_key, created_at)
    select ${toUserId}, question_key, created_at from user_bookmarks where user_id = ${fromUserId}
    on conflict do nothing`);
  await tx.execute(sql`
    insert into user_mistakes (user_id, question_key, wrong_count, last_wrong_at)
    select ${toUserId}, question_key, wrong_count, last_wrong_at from user_mistakes where user_id = ${fromUserId}
    on conflict (user_id, question_key) do update set
      wrong_count = user_mistakes.wrong_count + excluded.wrong_count,
      last_wrong_at = greatest(user_mistakes.last_wrong_at, excluded.last_wrong_at)`);
  const [g] = await tx.select().from(userProgress).where(eq(userProgress.userId, fromUserId)).limit(1);
  if (g) {
    await tx.insert(userProgress).values({ userId: toUserId }).onConflictDoNothing();
    const [t] = await tx.select().from(userProgress).where(eq(userProgress.userId, toUserId)).for('update').limit(1);
    const takeGuest = (g.lastQuizDate ?? '') > (t?.lastQuizDate ?? '');
    await tx
      .update(userProgress)
      .set({
        points: (t?.points ?? 0) + g.points,
        streak: takeGuest ? g.streak : (t?.streak ?? 0),
        lastQuizDate: takeGuest ? g.lastQuizDate : (t?.lastQuizDate ?? null),
        updatedAt: new Date(),
      })
      .where(eq(userProgress.userId, toUserId));
  }
  // Event ids move too, so the website re-sending them is still a no-op.
  await tx.execute(sql`
    insert into progress_events (user_id, event_id, kind, occurred_at, received_at)
    select ${toUserId}, event_id, kind, occurred_at, received_at from progress_events where user_id = ${fromUserId}
    on conflict do nothing`);
}
