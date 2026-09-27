import { and, count, desc, eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { testAttempts, userSessions, users } from '../database/schema.js';
import type { Env } from '../config/env.js';
import { notFound } from '../lib/httpError.js';
import type { SupabaseIdentity } from '../types.js';
import { createUserSession } from './sessionService.js';

function publicUser(u: typeof users.$inferSelect) {
  return { id: u.id, displayName: u.displayName, authProvider: u.authProvider, createdAt: u.createdAt };
}

export async function guestSignIn(db: Db, env: Env, displayName?: string) {
  const [user] = await db
    .insert(users)
    .values({ authProvider: 'guest', displayName: displayName || null, lastSeenAt: new Date() })
    .returning();
  const session = await createUserSession(db, user!.id, env.USER_SESSION_TTL_DAYS);
  return { token: session.token, expiresAt: session.expiresAt, user: publicUser(user!) };
}

/** Finds or creates the account for a verified Supabase identity. When the
 * caller is currently a guest, their attempts move to the account. */
export async function linkSupabase(db: Db, env: Env, identity: SupabaseIdentity, currentUserId: string | null) {
  let [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.authProvider, 'supabase'), eq(users.externalId, identity.id)))
    .limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        authProvider: 'supabase',
        externalId: identity.id,
        email: identity.email,
        phone: identity.phone,
        displayName: identity.name,
        lastSeenAt: new Date(),
      })
      .returning();
  }
  if (currentUserId && currentUserId !== user!.id) {
    const [current] = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
    if (current?.authProvider === 'guest') {
      await db.update(testAttempts).set({ userId: user!.id }).where(eq(testAttempts.userId, currentUserId));
      if (!user!.displayName && current.displayName) {
        await db.update(users).set({ displayName: current.displayName }).where(eq(users.id, user!.id));
      }
    }
  }
  const session = await createUserSession(db, user!.id, env.USER_SESSION_TTL_DAYS);
  return { token: session.token, expiresAt: session.expiresAt, user: publicUser(user!) };
}

export async function logoutUser(db: Db, sessionId: string) {
  await db.delete(userSessions).where(eq(userSessions.id, sessionId));
}

export async function profile(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound('User not found');
  const [attempts] = await db
    .select({ n: count() })
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'submitted')));
  const [last] = await db
    .select({ submittedAt: testAttempts.submittedAt })
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'submitted')))
    .orderBy(desc(testAttempts.submittedAt))
    .limit(1);
  return { ...publicUser(user), testsSubmitted: Number(attempts?.n ?? 0), lastSubmittedAt: last?.submittedAt ?? null };
}
