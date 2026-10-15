// The subscription state machine, and the one question every protected route
// asks: is this household entitled right now?
//
//   never_subscribed → pending → active ⇄ grace / billing_retry → expired
//                                active → cancelled (entitled until period end) → expired
//                                active → revoked (refund/chargeback: entitlement ends now)
//                                active → paused (Google Play pause: not entitled)
//
// `subscriptions` holds what the provider said; `entitlements` is derived
// from it here and read everywhere else. Nothing the app sends changes it.
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { entitlements, subscriptions, type SubscriptionStatus } from '../database/schema.js';
import type { Entitlement } from '../types.js';

// Days of access after a period ends while the store retries payment, when
// the provider has not told us about a grace period itself.
export const DEFAULT_GRACE_DAYS = 3;

export const ENTITLING_STATUSES: SubscriptionStatus[] = ['active', 'grace', 'billing_retry', 'cancelled'];

export function isEntitling(sub: { status: SubscriptionStatus; currentPeriodEnd: Date | null; revokedAt: Date | null }, now = new Date()): boolean {
  if (sub.revokedAt) return false;
  switch (sub.status) {
    case 'active':
    case 'cancelled':
      return !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime();
    case 'grace':
    case 'billing_retry':
      // Google reports the grace expiry as the new expiry time; otherwise allow a short default.
      return !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() + DEFAULT_GRACE_DAYS * 86_400_000 > now.getTime();
    default:
      return false;
  }
}

export function entitlementValidUntil(sub: { status: SubscriptionStatus; currentPeriodEnd: Date | null }): Date | null {
  if (!sub.currentPeriodEnd) return null;
  if (sub.status === 'grace' || sub.status === 'billing_retry') return new Date(sub.currentPeriodEnd.getTime() + DEFAULT_GRACE_DAYS * 86_400_000);
  return sub.currentPeriodEnd;
}

/** Recomputes the household's entitlement from its subscriptions and stores it. */
export async function recomputeEntitlement(db: Db, guardianId: string, now = new Date()): Promise<Entitlement> {
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.guardianId, guardianId)).orderBy(desc(subscriptions.updatedAt));
  // Prefer the entitling subscription that lasts longest; otherwise the most recent one explains why not.
  let best: (typeof subs)[number] | null = null;
  for (const s of subs) {
    if (!isEntitling(s, now)) continue;
    if (!best || (entitlementValidUntil(s)?.getTime() ?? 0) > (entitlementValidUntil(best)?.getTime() ?? 0)) best = s;
  }
  const latest = subs[0] ?? null;
  const ent: Entitlement = best
    ? { active: true, status: best.status, validUntil: entitlementValidUntil(best), subscriptionId: best.id }
    : { active: false, status: latest ? (latest.revokedAt ? 'revoked' : latest.status === 'pending' ? 'pending' : 'expired') : 'never_subscribed', validUntil: null, subscriptionId: latest?.id ?? null };
  await db
    .insert(entitlements)
    .values({ guardianId, active: ent.active, status: ent.status, validUntil: ent.validUntil, subscriptionId: ent.subscriptionId })
    .onConflictDoUpdate({
      target: entitlements.guardianId,
      set: { active: ent.active, status: ent.status, validUntil: ent.validUntil, subscriptionId: ent.subscriptionId, updatedAt: now },
    });
  return ent;
}

/** Reads the stored entitlement; re-derives it if its validity has lapsed. */
export async function getEntitlement(db: Db, guardianId: string, now = new Date()): Promise<Entitlement> {
  const [row] = await db.select().from(entitlements).where(eq(entitlements.guardianId, guardianId));
  if (!row) return recomputeEntitlement(db, guardianId, now);
  if (row.active && row.validUntil && row.validUntil.getTime() <= now.getTime()) return recomputeEntitlement(db, guardianId, now);
  return { active: row.active, status: row.status, validUntil: row.validUntil, subscriptionId: row.subscriptionId };
}

export function publicEntitlement(ent: Entitlement) {
  return { active: ent.active, status: ent.status, validUntil: ent.validUntil?.toISOString() ?? null };
}

/** Admin support action: end a household's access now (refund, abuse). */
export async function revokeSubscription(db: Db, subscriptionId: string, now = new Date()) {
  await db.update(subscriptions).set({ status: 'revoked', revokedAt: now, updatedAt: now }).where(and(eq(subscriptions.id, subscriptionId)));
  const [sub] = await db.select({ guardianId: subscriptions.guardianId }).from(subscriptions).where(eq(subscriptions.id, subscriptionId));
  if (sub) await recomputeEntitlement(db, sub.guardianId, now);
}
