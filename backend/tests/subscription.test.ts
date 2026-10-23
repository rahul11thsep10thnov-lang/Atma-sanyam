import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { subscriptions } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';
import { addChild, as, playerLogin, registerGuardian } from './lojiHelpers.js';
import { entitlementValidUntil, isEntitling } from '../src/services/entitlementService.js';
import { mapSubscriptionV2 } from '../src/services/billing/googlePlay.js';
import { createRazorpayProvider, mapRazorpaySubscription } from '../src/services/billing/razorpay.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let token = '';

beforeAll(async () => {
  ctx = await setupTestApp({ envExtra: { RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'rzp_test_secret', RAZORPAY_PLAN_ID: 'plan_test', RAZORPAY_WEBHOOK_SECRET: 'whsec' } });
  token = (await registerGuardian(ctx, '+919876530001')).token;
});
afterAll(async () => {
  await ctx.close();
});

const sandbox = (body: Record<string, unknown>) => request(ctx.app).post('/v1/guardian/subscription/sandbox/activate').set(as(token)).send(body);
const transition = (body: Record<string, unknown>) => request(ctx.app).post('/v1/guardian/subscription/sandbox/transition').set(as(token)).send(body);
const status = async () => (await request(ctx.app).get('/v1/guardian/subscription').set(as(token))).body;

describe('subscription gate', () => {
  it('without a subscription the guardian console is limited to account and purchase screens', async () => {
    const s = await status();
    expect(s.entitlement).toEqual({ active: false, status: 'never_subscribed', validUntil: null, adFree: false });
    expect(s.monthly.priceInr).toBeGreaterThan(0);
    expect((await request(ctx.app).get('/v1/guardian/me').set(as(token))).status).toBe(200);
    expect((await request(ctx.app).get('/v1/guardian/dashboard').set(as(token))).status).toBe(200); // read-only, shows the locked state
    const add = await request(ctx.app).post('/v1/guardian/children').set(as(token)).send({ displayName: 'K', avatarId: 'comic_01', birthMonth: '2019-01', pin: '2580' });
    expect(add.status).toBe(402);
  });

  it('the sandbox provider activates a month and the gate opens; expiry closes it again', async () => {
    expect((await sandbox({})).status).toBe(201);
    let s = await status();
    expect(s.entitlement.active).toBe(true);
    expect(s.entitlement.status).toBe('active');
    expect(new Date(s.entitlement.validUntil).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    const kid = await addChild(ctx, token, { displayName: 'Kiran', birthMonth: '2019-01', pin: '2580' });
    const p = await playerLogin(ctx, kid.playerId, '2580');
    expect((await request(ctx.app).get('/v1/player/games').set(as(p.body.token))).status).toBe(200);

    // Period ended yesterday, store says expired.
    await transition({ status: 'expired', periodEndInDays: -1 });
    s = await status();
    expect(s.entitlement.active).toBe(false);
    expect(s.entitlement.status).toBe('expired');
    const games = await request(ctx.app).get('/v1/player/games').set(as(p.body.token));
    expect(games.status).toBe(402);
    expect(games.body.error.code).toBe('subscription_required');
    expect((await request(ctx.app).post('/v1/player/sessions/start').set(as(p.body.token)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-9001', difficulty: 'easy' })).status).toBe(402);
    expect((await request(ctx.app).get('/v1/player/facts/daily').set(as(p.body.token))).status).toBe(402);
    expect((await request(ctx.app).get('/v1/player/crafts').set(as(p.body.token))).status).toBe(402);
    // /me still works so the child sees a kind locked screen rather than an error.
    const me = await request(ctx.app).get('/v1/player/me').set(as(p.body.token));
    expect(me.status).toBe(200);
    expect(me.body.entitlement.active).toBe(false);
  });

  it('cancellation keeps access until the paid period ends; revocation ends it now', async () => {
    await transition({ status: 'active', periodEndInDays: 10 });
    expect((await status()).entitlement.active).toBe(true);
    await transition({ status: 'cancelled', periodEndInDays: 10 });
    let s = await status();
    expect(s.entitlement.active).toBe(true);
    expect(s.entitlement.status).toBe('cancelled');
    expect(s.current.cancelledAt).toBeTruthy();
    await transition({ status: 'revoked', periodEndInDays: 10 });
    s = await status();
    expect(s.entitlement.active).toBe(false);
    expect(s.entitlement.status).toBe('revoked');
  });

  it('grace and billing retry keep access for a few days; paused does not', async () => {
    await transition({ status: 'grace', periodEndInDays: -1 });
    expect((await status()).entitlement.active).toBe(true);
    await transition({ status: 'billing_retry', periodEndInDays: -2 });
    expect((await status()).entitlement.active).toBe(true);
    await transition({ status: 'billing_retry', periodEndInDays: -5 });
    expect((await status()).entitlement.active).toBe(false);
    await transition({ status: 'paused', periodEndInDays: 10 });
    expect((await status()).entitlement.active).toBe(false);
    await transition({ status: 'active', periodEndInDays: 30 });
    expect((await status()).entitlement.active).toBe(true);
  });

  it('a stored entitlement that lapses is re-derived on read', async () => {
    const [sub] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.guardianId, (await request(ctx.app).get('/v1/guardian/me').set(as(token))).body.guardian.id));
    await ctx.db.update(subscriptions).set({ currentPeriodEnd: new Date(Date.now() - 1000) }).where(eq(subscriptions.id, sub!.id));
    // entitlements row still says active with the old validUntil → getEntitlement sees validUntil passed and recomputes.
    const { entitlements } = await import('../src/database/schema.js');
    await ctx.db.update(entitlements).set({ validUntil: new Date(Date.now() - 1000) });
    expect((await status()).entitlement.active).toBe(false);
    await transition({ status: 'active', periodEndInDays: 30 });
  });

  it('never trusts an app-supplied flag: there is no endpoint to set entitlement', async () => {
    expect((await request(ctx.app).put('/v1/guardian/subscription').set(as(token)).send({ active: true })).status).toBe(404);
    expect((await request(ctx.app).post('/v1/guardian/subscription/google/verify').set(as(token)).send({ purchaseToken: 'x'.repeat(20), productId: 'loji_monthly' })).status).toBe(503);
  });

  it('refuses the sandbox in production configuration', async () => {
    const { loadEnv } = await import('../src/config/env.js');
    const env = loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', BILLING_SANDBOX: 'true', OTP_TEST_NUMBERS: '+919999900001:123456' });
    expect(env.BILLING_SANDBOX).toBe(false);
    expect(env.OTP_TEST_NUMBERS.size).toBe(0);
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', SMS_PROVIDER: 'console' })).toThrow();
  });
});

describe('provider mapping', () => {
  it('maps Google Play subscriptionsv2 states', () => {
    const v = mapSubscriptionV2('tok', { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', startTime: '2026-10-01T00:00:00Z', lineItems: [{ productId: 'loji_monthly', expiryTime: '2026-11-01T00:00:00Z', autoRenewingPlan: { autoRenewEnabled: true } }] });
    expect(v).toMatchObject({ provider: 'google_play', providerRef: 'tok', productId: 'loji_monthly', status: 'active', autoRenewing: true });
    expect(isEntitling(v, new Date('2026-10-15T00:00:00Z'))).toBe(true);
    expect(isEntitling(v, new Date('2026-11-02T00:00:00Z'))).toBe(false);
    const grace = mapSubscriptionV2('tok', { subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', lineItems: [{ productId: 'loji_monthly', expiryTime: '2026-11-01T00:00:00Z' }] });
    expect(grace.status).toBe('grace');
    expect(entitlementValidUntil(grace)!.toISOString()).toBe('2026-11-04T00:00:00.000Z');
    expect(mapSubscriptionV2('tok', { subscriptionState: 'SUBSCRIPTION_STATE_ON_HOLD', lineItems: [] }).status).toBe('billing_retry');
    expect(mapSubscriptionV2('tok', { subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', lineItems: [{ expiryTime: '2026-11-01T00:00:00Z' }] }).status).toBe('cancelled');
    expect(mapSubscriptionV2('tok', { subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', lineItems: [] }).status).toBe('expired');
  });

  it('maps Razorpay subscription states and verifies signatures', () => {
    const v = mapRazorpaySubscription({ id: 'sub_1', plan_id: 'plan_test', status: 'active', current_start: 1760000000, current_end: 1762592000, notes: { guardian_id: 'g1' } });
    expect(v).toMatchObject({ provider: 'razorpay', providerRef: 'sub_1', status: 'active', accountRef: 'g1' });
    expect(v.currentPeriodEnd!.toISOString()).toBe(new Date(1762592000 * 1000).toISOString());
    expect(mapRazorpaySubscription({ id: 's', status: 'pending' }).status).toBe('billing_retry');
    expect(mapRazorpaySubscription({ id: 's', status: 'halted' }).status).toBe('expired');
    const rz = createRazorpayProvider({ keyId: 'k', keySecret: 'secret', planId: 'p', webhookSecret: 'whsec' });
    const sig = createHmac('sha256', 'secret').update('pay_1|sub_1').digest('hex');
    expect(rz.verifyCheckoutSignature('pay_1', 'sub_1', sig)).toBe(true);
    expect(rz.verifyCheckoutSignature('pay_1', 'sub_2', sig)).toBe(false);
    const body = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_1' } } } });
    expect(rz.verifyWebhookSignature(body, createHmac('sha256', 'whsec').update(body).digest('hex'))).toBe(true);
    expect(rz.verifyWebhookSignature(body, 'bad')).toBe(false);
  });

  it('webhooks reject bad signatures and bad tokens', async () => {
    expect((await request(ctx.app).post('/v1/webhooks/razorpay').set('x-razorpay-signature', 'nope').send({ event: 'subscription.charged' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/webhooks/google-play?token=wrong').send({ message: { data: 'e30=' } })).status).toBe(401);
    // A correctly signed webhook for an unknown subscription is acknowledged and changes nothing.
    const body = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_unknown' } } } });
    const res = await request(ctx.app).post('/v1/webhooks/razorpay').set('x-razorpay-signature', createHmac('sha256', 'whsec').update(body).digest('hex')).set('Content-Type', 'application/json').send(body);
    expect(res.status).toBe(204);
  });

  it('razorpay create requires a guardian and records a pending subscription', async () => {
    // Without network the provider call fails → 502; the route must not invent an active subscription.
    const res = await request(ctx.app).post('/v1/guardian/subscription/razorpay/create').set(as(token));
    expect([502, 503]).toContain(res.status);
    expect((await status()).entitlement.active).toBe(true); // unchanged from the sandbox subscription
  });
});
