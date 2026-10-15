// Stores what a billing provider verified and derives the entitlement.
import { and, eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { billingEvents, subscriptions } from '../database/schema.js';
import { recomputeEntitlement } from './entitlementService.js';
import type { VerifiedSubscription } from './billing/index.js';
import { conflict } from '../lib/httpError.js';

/**
 * Upserts a verified subscription for a guardian. A purchase token already
 * linked to a different guardian is refused: one purchase, one household.
 */
export async function applyVerifiedSubscription(db: Db, guardianId: string, v: VerifiedSubscription, eventType: string, dedupeKey: string) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.provider, v.provider), eq(subscriptions.providerRef, v.providerRef)));
  if (existing && existing.guardianId !== guardianId) throw conflict('This purchase is already linked to another account. Contact support.');

  const values = {
    productId: v.productId || existing?.productId || 'unknown',
    status: v.status,
    autoRenewing: v.autoRenewing,
    currentPeriodStart: v.currentPeriodStart,
    currentPeriodEnd: v.currentPeriodEnd,
    cancelledAt: v.cancelledAt ?? existing?.cancelledAt ?? null,
    // The provider is authoritative: if it says the subscription is live again, it is.
    revokedAt: v.revokedAt,
    priceAmount: v.priceAmount ?? existing?.priceAmount ?? null,
    priceCurrency: v.priceCurrency ?? existing?.priceCurrency ?? null,
    providerState: v.raw,
    lastVerifiedAt: now,
    updatedAt: now,
  };
  let subscriptionId: string;
  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
    subscriptionId = existing.id;
  } else {
    const [row] = await db
      .insert(subscriptions)
      .values({ guardianId, provider: v.provider, providerRef: v.providerRef, ...values })
      .returning({ id: subscriptions.id });
    subscriptionId = row!.id;
  }
  // Replays are harmless: the same dedupe key is simply not recorded twice.
  await db
    .insert(billingEvents)
    .values({ subscriptionId, guardianId, provider: v.provider, type: eventType, dedupeKey, payload: { status: v.status, periodEnd: v.currentPeriodEnd?.toISOString() ?? null } })
    .onConflictDoNothing();
  const entitlement = await recomputeEntitlement(db, guardianId, now);
  return { subscriptionId, entitlement };
}

export async function findSubscriptionByRef(db: Db, provider: VerifiedSubscription['provider'], providerRef: string) {
  const [row] = await db.select().from(subscriptions).where(and(eq(subscriptions.provider, provider), eq(subscriptions.providerRef, providerRef)));
  return row ?? null;
}

export function publicSubscription(s: typeof subscriptions.$inferSelect) {
  return {
    id: s.id,
    provider: s.provider,
    productId: s.productId,
    status: s.status,
    autoRenewing: s.autoRenewing,
    currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    cancelledAt: s.cancelledAt?.toISOString() ?? null,
    revokedAt: s.revokedAt?.toISOString() ?? null,
    lastVerifiedAt: s.lastVerifiedAt?.toISOString() ?? null,
  };
}
