import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, countDistinct, desc, eq, gt, inArray } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import type { Env } from '../config/env.js';
import { mockTests, subscriptions, testAttempts, users } from '../database/schema.js';
import { audit } from '../lib/audit.js';
import { HttpError, badRequest, conflict, notFound, unprocessable } from '../lib/httpError.js';
import { log } from '../lib/logger.js';
import { getSiteSettings, type SiteSettings } from './siteSettingsService.js';

export type MockKind = 'full' | 'subject';

export interface Entitlement {
  subscribed: boolean;
  expiresAt: Date | null;
  plan: SiteSettings['plan'];
  freeQuota: Record<MockKind, { used: number; limit: number; remaining: number }>;
}

async function activeSubscription(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active'), gt(subscriptions.expiresAt, new Date())))
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);
  return row ?? null;
}

/** Distinct tests of each kind the user has started (a retake of the same
 * test never costs a second free slot). */
async function usedQuota(db: Db, userId: string): Promise<Record<MockKind, number>> {
  const rows = await db
    .select({ kind: mockTests.kind, n: countDistinct(testAttempts.mockTestId) })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .where(eq(testAttempts.userId, userId))
    .groupBy(mockTests.kind);
  const used: Record<MockKind, number> = { full: 0, subject: 0 };
  for (const r of rows) used[r.kind] = Number(r.n);
  return used;
}

export async function getEntitlement(db: Db, userId: string): Promise<Entitlement> {
  const [settings, sub, used] = await Promise.all([getSiteSettings(db), activeSubscription(db, userId), usedQuota(db, userId)]);
  const quota = (kind: MockKind) => {
    const limit = settings.freeQuota[kind];
    return { used: used[kind], limit, remaining: Math.max(0, limit - used[kind]) };
  };
  return {
    subscribed: !!sub,
    expiresAt: sub?.expiresAt ?? null,
    plan: settings.plan,
    freeQuota: { full: quota('full'), subject: quota('subject') },
  };
}

/**
 * Throws 402 `subscription_required` when the user has used up the free
 * tests of this kind and has no active plan. Tests the user already
 * started are always allowed (resume / retake).
 */
export async function assertCanStart(db: Db, userId: string, mockTestId: string, kind: MockKind) {
  const sub = await activeSubscription(db, userId);
  if (sub) return;
  const [seen] = await db
    .select({ id: testAttempts.id })
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, userId), eq(testAttempts.mockTestId, mockTestId)))
    .limit(1);
  if (seen) return;
  const settings = await getSiteSettings(db);
  const used = await usedQuota(db, userId);
  if (used[kind] < settings.freeQuota[kind]) return;
  throw new HttpError(
    402,
    `Aapke ${settings.freeQuota[kind]} free ${kind === 'full' ? 'full' : 'subject-wise'} mock tests ho chuke hain. ₹${settings.plan.priceInr} mein poore saal ke liye enrol karein.`,
    'subscription_required',
    { kind, used: used[kind], limit: settings.freeQuota[kind], plan: settings.plan }
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderResponse {
  provider: 'razorpay' | 'dev';
  orderId: string;
  amountInr: number;
  listPriceInr: number;
  currency: 'INR';
  planName: string;
  durationDays: number;
  /** Razorpay public key id — safe for the browser; the secret never leaves the server. */
  keyId?: string;
  /** Razorpay's own order id, passed to its checkout. */
  providerOrderId?: string;
}

async function razorpayCreateOrder(env: Env, amountPaise: number, receipt: string): Promise<{ id: string }> {
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    log.error('enroll.order_failed', { status: res.status });
    throw new HttpError(502, 'Payment service is not available right now. Please try again in a few minutes.', 'payment_unavailable');
  }
  return (await res.json()) as { id: string };
}

export async function createOrder(db: Db, env: Env, userId: string): Promise<OrderResponse> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound('User not found');
  if (await activeSubscription(db, userId)) throw conflict('Aapka plan pehle se active hai.');
  const settings = await getSiteSettings(db);
  const base = {
    amountInr: settings.plan.priceInr,
    listPriceInr: settings.plan.listPriceInr,
    currency: 'INR' as const,
    planName: settings.plan.name,
    durationDays: settings.plan.durationDays,
  };
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const [pending] = await db
      .insert(subscriptions)
      .values({ userId, status: 'pending', amountInr: settings.plan.priceInr, listPriceInr: settings.plan.listPriceInr, provider: 'razorpay' })
      .returning();
    const order = await razorpayCreateOrder(env, settings.plan.priceInr * 100, pending!.id);
    await db.update(subscriptions).set({ providerOrderId: order.id, updatedAt: new Date() }).where(eq(subscriptions.id, pending!.id));
    log.info('enroll.order_created', { userId, provider: 'razorpay' });
    return { provider: 'razorpay', orderId: pending!.id, providerOrderId: order.id, keyId: env.RAZORPAY_KEY_ID, ...base };
  }
  if (!env.ENROLL_DEV_ACTIVATE) {
    throw new HttpError(503, 'Online payment abhi configure nahi hai. Kripya baad mein try karein.', 'payment_not_configured');
  }
  const [pending] = await db
    .insert(subscriptions)
    .values({ userId, status: 'pending', amountInr: settings.plan.priceInr, listPriceInr: settings.plan.listPriceInr, provider: 'dev' })
    .returning();
  log.info('enroll.order_created', { userId, provider: 'dev' });
  return { provider: 'dev', orderId: pending!.id, ...base };
}

function verifyRazorpaySignature(env: Env, providerOrderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET!).update(`${providerOrderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Activates the plan once the payment is proven (Razorpay signature), or
 * immediately for a dev order. Idempotent: confirming twice returns the
 * same active subscription. */
export async function confirmOrder(
  db: Db,
  env: Env,
  userId: string,
  input: { orderId: string; paymentId?: string; signature?: string }
) {
  const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.id, input.orderId), eq(subscriptions.userId, userId))).limit(1);
  if (!sub) throw notFound('Order not found');
  if (sub.status === 'active') return publicSubscription(sub);
  if (sub.status !== 'pending') throw conflict('This order can no longer be completed.');

  if (sub.provider === 'razorpay') {
    if (!input.paymentId || !input.signature) throw badRequest('Payment id and signature are required.');
    if (!sub.providerOrderId || !verifyRazorpaySignature(env, sub.providerOrderId, input.paymentId, input.signature)) {
      log.warn('enroll.signature_invalid', { userId, orderId: sub.id });
      throw unprocessable(
        `Payment verify nahi ho paya. Agar paise kat gaye hain to plan thodi der mein apne-aap active ho jayega; na ho to support ko order no. ${sub.id.slice(0, 8)} batayein.`
      );
    }
  } else if (sub.provider === 'dev') {
    if (!env.ENROLL_DEV_ACTIVATE) throw conflict('Dev activation is disabled on this server.');
  } else {
    throw conflict('This order can no longer be completed.');
  }

  return publicSubscription(await activatePending(db, sub, input.paymentId ?? null, 'confirm'));
}

/** pending → active, exactly once: the browser's confirmation and Razorpay's
 * webhook can arrive together, and only the first one starts the plan. */
async function activatePending(db: Db, sub: typeof subscriptions.$inferSelect, paymentId: string | null, via: 'confirm' | 'webhook') {
  const settings = await getSiteSettings(db);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.plan.durationDays * 86_400_000);
  const [active] = await db
    .update(subscriptions)
    .set({ status: 'active', providerPaymentId: paymentId, startsAt: now, expiresAt, updatedAt: now })
    .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'pending')))
    .returning();
  if (active) {
    log.info('enroll.activated', { userId: sub.userId, provider: sub.provider, via, expiresAt: expiresAt.toISOString() });
    return active;
  }
  const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, sub.id)).limit(1);
  if (current?.status === 'active') return current;
  throw conflict('This order can no longer be completed.');
}

/** True when `signature` is Razorpay's HMAC-SHA256 of the raw webhook body. */
export function verifyRazorpayWebhook(secret: string, rawBody: Buffer, signature: string): boolean {
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

interface RazorpayWebhook {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } };
    order?: { entity?: { id?: string; amount_paid?: number; currency?: string; status?: string } };
  };
}

/** Razorpay webhook (`order.paid`, `payment.captured`): activates the plan
 * even when the buyer's browser closed before it could confirm. The caller
 * has already verified the signature. Unknown orders are acknowledged and
 * ignored so Razorpay stops retrying. */
export async function handleRazorpayWebhook(db: Db, body: RazorpayWebhook): Promise<{ handled: boolean; reason?: string }> {
  if (body.event !== 'order.paid' && body.event !== 'payment.captured') return { handled: false, reason: 'event ignored' };
  const payment = body.payload?.payment?.entity;
  const orderId = body.payload?.order?.entity?.id ?? payment?.order_id;
  if (!orderId || !payment?.id) return { handled: false, reason: 'no order' };
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerOrderId, orderId)).limit(1);
  if (!sub || sub.provider !== 'razorpay') {
    log.warn('enroll.webhook_unknown_order', { orderId });
    return { handled: false, reason: 'unknown order' };
  }
  if (sub.status === 'active') return { handled: true };
  if (sub.status !== 'pending') return { handled: false, reason: `order is ${sub.status}` };
  // The paid amount must be what this order asked for.
  const paise = body.event === 'order.paid' ? body.payload?.order?.entity?.amount_paid : payment.amount;
  const currency = body.event === 'order.paid' ? body.payload?.order?.entity?.currency : payment.currency;
  if (paise !== sub.amountInr * 100 || currency !== 'INR') {
    log.error('enroll.webhook_amount_mismatch', { orderId: sub.id, message: `paid ${paise ?? '?'} ${currency ?? '?'}, expected ${sub.amountInr * 100} INR (paise)` });
    return { handled: false, reason: 'amount mismatch' };
  }
  await activatePending(db, sub, payment.id, 'webhook');
  return { handled: true };
}

/** Admin: activate the plan for a user without a payment (support cases). */
export async function grantSubscription(db: Db, userId: string, days: number, adminId: string, note?: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound('User not found');
  const settings = await getSiteSettings(db);
  const now = new Date();
  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      status: 'active',
      amountInr: 0,
      listPriceInr: settings.plan.listPriceInr,
      provider: 'manual',
      startsAt: now,
      expiresAt: new Date(now.getTime() + days * 86_400_000),
      grantedBy: adminId,
      note: note ?? null,
    })
    .returning();
  await audit(db, adminId, 'subscription.granted', 'user', userId, { days, note: note ?? null });
  return publicSubscription(row!);
}

export async function listSubscriptionsFor(db: Db, userIds: string[]) {
  if (!userIds.length) return [];
  return db
    .select({ userId: subscriptions.userId, status: subscriptions.status, expiresAt: subscriptions.expiresAt, provider: subscriptions.provider })
    .from(subscriptions)
    .where(and(inArray(subscriptions.userId, userIds), eq(subscriptions.status, 'active'), gt(subscriptions.expiresAt, new Date())));
}

function publicSubscription(s: typeof subscriptions.$inferSelect) {
  return { id: s.id, plan: s.plan, status: s.status, provider: s.provider, amountInr: s.amountInr, startsAt: s.startsAt, expiresAt: s.expiresAt };
}
