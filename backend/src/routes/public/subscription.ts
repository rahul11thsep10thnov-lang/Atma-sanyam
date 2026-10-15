// Subscriptions: what the household has, and the three ways to get one —
// Google Play (native Android app; verified with the Play Developer API),
// Razorpay (the website), and the development-only sandbox. Nothing here
// trusts the app's word for a purchase.
import { Router } from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { subscriptions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, HttpError, notFound } from '../../lib/httpError.js';
import { getEntitlement, publicEntitlement } from '../../services/entitlementService.js';
import { applyVerifiedSubscription, findSubscriptionByRef, publicSubscription } from '../../services/subscriptionService.js';
import { BillingVerificationError } from '../../services/billing/index.js';
import type { AppDeps } from '../../types.js';

export function subscriptionRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, billing } = deps;
  const r = Router();
  r.use(auth.requireGuardian);

  function products() {
    return {
      monthly: {
        productId: env.SUBSCRIPTION_PRODUCT_ID,
        name: 'LoJi Monthly',
        interval: 'month',
        // The store shows its own localised price; this is for the website and receipts.
        priceInr: env.SUBSCRIPTION_PRICE_INR,
        description: 'All games, Art & Craft and Did You Know? for every child in your home. Renews monthly, cancel any time.',
      },
      providers: {
        googlePlay: !!billing.googlePlay,
        razorpay: billing.razorpay ? { keyId: billing.razorpay.keyId } : null,
        sandbox: !!billing.sandbox,
      },
    };
  }

  r.get('/', async (req, res) => {
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.guardianId, req.guardian!.id)).orderBy(desc(subscriptions.updatedAt));
    const ent = await getEntitlement(db, req.guardian!.id);
    const current = rows.find((s) => s.id === ent.subscriptionId) ?? rows[0] ?? null;
    res.set('Cache-Control', 'no-store');
    res.json({
      entitlement: publicEntitlement(ent),
      current: current ? publicSubscription(current) : null,
      history: rows.map(publicSubscription),
      ...products(),
      manage: {
        googlePlayUrl: current?.provider === 'google_play' ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(current.productId)}&package=${encodeURIComponent(env.GOOGLE_PLAY_PACKAGE_NAME ?? '')}` : null,
        supportEmail: env.EMAIL_FROM ?? null,
      },
    });
  });

  function mapBillingError(err: unknown): never {
    if (err instanceof BillingVerificationError) {
      if (err.code === 'not_configured') throw new HttpError(503, 'This payment method is not available right now.', 'unavailable');
      if (err.code === 'invalid') throw badRequest('This purchase could not be verified.');
      throw new HttpError(502, 'The store could not be reached. Try again in a moment.', 'provider_error');
    }
    throw err;
  }

  // ---- Google Play -------------------------------------------------------
  r.post('/google/verify', limits.billing, async (req, res) => {
    if (!billing.googlePlay) throw new HttpError(503, 'Google Play billing is not configured.', 'unavailable');
    const body = parse(z.object({ purchaseToken: z.string().min(10).max(1000), productId: z.string().min(1).max(100) }), req.body);
    let verified;
    try {
      verified = await billing.googlePlay.verify(body.purchaseToken);
    } catch (err) {
      mapBillingError(err);
    }
    if (verified.productId && verified.productId !== body.productId) throw badRequest('This purchase is for a different product.');
    if (verified.accountRef && verified.accountRef !== req.guardian!.id) throw badRequest('This purchase was made for a different account.');
    const { entitlement } = await applyVerifiedSubscription(db, req.guardian!.id, verified, 'purchase_verified', `gp:${body.purchaseToken}:${verified.status}:${verified.currentPeriodEnd?.toISOString() ?? ''}`);
    if (verified.status === 'active' && billing.googlePlay) {
      // Acknowledge after our own record exists; a failure here is retried on the next verify.
      billing.googlePlay.acknowledge(body.purchaseToken, body.productId).catch((e) => console.error('[billing] acknowledge failed:', e instanceof Error ? e.message : e));
    }
    res.json({ entitlement: publicEntitlement(entitlement), status: verified.status });
  });

  // ---- Razorpay (website) ------------------------------------------------
  r.post('/razorpay/create', limits.billing, async (req, res) => {
    if (!billing.razorpay) throw new HttpError(503, 'Card/UPI payment is not configured.', 'unavailable');
    let created;
    try {
      created = await billing.razorpay.createSubscription(req.guardian!.id);
    } catch (err) {
      mapBillingError(err);
    }
    await applyVerifiedSubscription(
      db,
      req.guardian!.id,
      { provider: 'razorpay', providerRef: created.id, productId: billing.razorpay.planId, status: 'pending', autoRenewing: true, currentPeriodStart: null, currentPeriodEnd: null, cancelledAt: null, revokedAt: null, priceAmount: env.SUBSCRIPTION_PRICE_INR * 100, priceCurrency: 'INR', accountRef: req.guardian!.id, raw: {} },
      'razorpay_created',
      `rz:created:${created.id}`
    );
    res.status(201).json({ subscriptionId: created.id, keyId: billing.razorpay.keyId, shortUrl: created.shortUrl, name: 'LoJi Monthly', prefill: { contact: req.guardian!.phone, name: req.guardian!.name } });
  });

  r.post('/razorpay/confirm', limits.billing, async (req, res) => {
    if (!billing.razorpay) throw new HttpError(503, 'Card/UPI payment is not configured.', 'unavailable');
    const body = parse(z.object({ razorpay_payment_id: z.string().min(1).max(100), razorpay_subscription_id: z.string().min(1).max(100), razorpay_signature: z.string().min(1).max(200) }), req.body);
    if (!billing.razorpay.verifyCheckoutSignature(body.razorpay_payment_id, body.razorpay_subscription_id, body.razorpay_signature)) throw badRequest('This payment could not be verified.');
    const own = await findSubscriptionByRef(db, 'razorpay', body.razorpay_subscription_id);
    if (!own || own.guardianId !== req.guardian!.id) throw notFound('Subscription not found');
    let verified;
    try {
      verified = await billing.razorpay.verify(body.razorpay_subscription_id);
    } catch (err) {
      mapBillingError(err);
    }
    // Checkout succeeded but Razorpay may still show "authenticated" for a few
    // seconds; the webhook finishes the job. Treat a signed, authenticated
    // subscription as active until then.
    if (verified.status === 'pending' && verified.currentPeriodEnd === null) {
      verified = { ...verified, status: 'active' as const, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 31 * 86_400_000) };
    }
    const { entitlement } = await applyVerifiedSubscription(db, req.guardian!.id, verified, 'razorpay_checkout', `rz:checkout:${body.razorpay_payment_id}`);
    res.json({ entitlement: publicEntitlement(entitlement), status: verified.status });
  });

  r.post('/razorpay/cancel', limits.billing, async (req, res) => {
    if (!billing.razorpay) throw new HttpError(503, 'Card/UPI payment is not configured.', 'unavailable');
    const ent = await getEntitlement(db, req.guardian!.id);
    const [sub] = ent.subscriptionId ? await db.select().from(subscriptions).where(eq(subscriptions.id, ent.subscriptionId)) : [];
    if (!sub || sub.provider !== 'razorpay' || sub.guardianId !== req.guardian!.id) throw notFound('No card/UPI subscription to cancel');
    try {
      await billing.razorpay.cancel(sub.providerRef);
      const verified = await billing.razorpay.verify(sub.providerRef);
      const { entitlement } = await applyVerifiedSubscription(db, req.guardian!.id, { ...verified, status: 'cancelled', cancelledAt: new Date() }, 'razorpay_cancelled', `rz:cancel:${sub.providerRef}:${Date.now()}`);
      res.json({ entitlement: publicEntitlement(entitlement) });
    } catch (err) {
      mapBillingError(err);
    }
  });

  // ---- restore: re-verify everything the household ever bought ----------
  r.post('/restore', limits.billing, async (req, res) => {
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.guardianId, req.guardian!.id));
    let checked = 0;
    for (const s of rows) {
      try {
        if (s.provider === 'google_play' && billing.googlePlay) {
          await applyVerifiedSubscription(db, s.guardianId, await billing.googlePlay.verify(s.providerRef), 'restore', `gp:restore:${s.providerRef}:${Date.now()}`);
          checked++;
        } else if (s.provider === 'razorpay' && billing.razorpay) {
          await applyVerifiedSubscription(db, s.guardianId, await billing.razorpay.verify(s.providerRef), 'restore', `rz:restore:${s.providerRef}:${Date.now()}`);
          checked++;
        }
      } catch (err) {
        console.warn('[billing] restore skipped a subscription:', err instanceof Error ? err.message : err);
      }
    }
    res.json({ checked, entitlement: publicEntitlement(await getEntitlement(db, req.guardian!.id)) });
  });

  // ---- sandbox (development and tests only) ------------------------------
  r.post('/sandbox/activate', limits.billing, async (req, res) => {
    if (!billing.sandbox) throw notFound();
    const body = parse(z.object({ days: z.number().int().min(-30).max(60).optional(), status: z.enum(['active', 'grace', 'billing_retry', 'cancelled', 'expired', 'paused', 'revoked']).optional() }), req.body ?? {});
    const v = billing.sandbox.activate(req.guardian!.id, { days: body.days, status: body.status === 'revoked' ? 'expired' : body.status });
    if (body.status === 'revoked') v.revokedAt = new Date();
    const { entitlement } = await applyVerifiedSubscription(db, req.guardian!.id, v, 'sandbox', `sb:${v.providerRef}`);
    res.status(201).json({ entitlement: publicEntitlement(entitlement) });
  });

  r.post('/sandbox/transition', limits.billing, async (req, res) => {
    if (!billing.sandbox) throw notFound();
    const body = parse(z.object({ status: z.enum(['active', 'grace', 'billing_retry', 'cancelled', 'expired', 'paused', 'revoked']), periodEndInDays: z.number().int().min(-60).max(60).optional() }), req.body);
    const ent = await getEntitlement(db, req.guardian!.id);
    const [sub] = ent.subscriptionId ? await db.select().from(subscriptions).where(eq(subscriptions.id, ent.subscriptionId)) : await db.select().from(subscriptions).where(eq(subscriptions.guardianId, req.guardian!.id)).orderBy(desc(subscriptions.updatedAt)).limit(1);
    if (!sub || sub.provider !== 'sandbox') throw notFound('No sandbox subscription');
    const periodEnd = body.periodEndInDays !== undefined ? new Date(Date.now() + body.periodEndInDays * 86_400_000) : sub.currentPeriodEnd;
    const { entitlement } = await applyVerifiedSubscription(
      db,
      req.guardian!.id,
      { provider: 'sandbox', providerRef: sub.providerRef, productId: sub.productId, status: body.status === 'revoked' ? 'revoked' : body.status, autoRenewing: body.status === 'active', currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: periodEnd, cancelledAt: body.status === 'cancelled' ? new Date() : null, revokedAt: body.status === 'revoked' ? new Date() : null, priceAmount: 0, priceCurrency: 'INR', accountRef: req.guardian!.id, raw: { sandbox: true } },
      `sandbox:${body.status}`,
      `sb:${sub.providerRef}:${body.status}:${Date.now()}`
    );
    res.json({ entitlement: publicEntitlement(entitlement) });
  });

  return r;
}
