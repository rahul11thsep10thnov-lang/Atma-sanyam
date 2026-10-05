import { createHmac } from 'node:crypto';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { subscriptions } from '../src/database/schema.js';
import { appWithEnv, auth, setupTestApp, userToken } from './helpers.js';

const SECRET = 'whsec_test_secret_123';
const sign = (raw: string, secret = SECRET) => createHmac('sha256', secret).update(raw).digest('hex');

describe('Razorpay webhook', () => {
  let ctx: Awaited<ReturnType<typeof setupTestApp>>;
  let app: ReturnType<typeof appWithEnv>;
  let price: number;

  beforeAll(async () => {
    ctx = await setupTestApp();
    app = appWithEnv(ctx, { RAZORPAY_WEBHOOK_SECRET: SECRET });
    price = (await request(app).get('/api/site')).body.plan.priceInr;
  });
  afterAll(async () => ctx.close());

  /** A user with a pending Razorpay order, as createOrder leaves it. */
  async function pendingOrder(providerOrderId: string) {
    const token = await userToken(app, 'Buyer');
    const me = await request(app).get('/api/me').set(auth(token));
    const [sub] = await ctx.db
      .insert(subscriptions)
      .values({ userId: me.body.id, status: 'pending', amountInr: price, provider: 'razorpay', providerOrderId })
      .returning();
    return { token, sub: sub! };
  }

  const orderPaid = (orderId: string, paise: number, paymentId = 'pay_TEST123') =>
    JSON.stringify({
      event: 'order.paid',
      payload: {
        payment: { entity: { id: paymentId, order_id: orderId, amount: paise, currency: 'INR', status: 'captured' } },
        order: { entity: { id: orderId, amount_paid: paise, currency: 'INR', status: 'paid' } },
      },
    });

  const post = (raw: string, signature = sign(raw), target = app) =>
    request(target).post('/api/enroll/razorpay/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(raw);

  it('activates the plan when Razorpay reports the order paid', async () => {
    const { token, sub } = await pendingOrder('order_PAID1');
    const res = await post(orderPaid('order_PAID1', price * 100));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ handled: true });
    const [row] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(row).toMatchObject({ status: 'active', providerPaymentId: 'pay_TEST123' });
    const me = await request(app).get('/api/me').set(auth(token));
    expect(me.body.entitlement.subscribed).toBe(true);

    // Razorpay retries: a replay changes nothing.
    const again = await post(orderPaid('order_PAID1', price * 100));
    expect(again.body).toEqual({ handled: true });
    const [same] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(same!.startsAt!.getTime()).toBe(row!.startsAt!.getTime());

    // The browser's late confirmation returns the same active plan.
    const confirm = await request(app).post('/api/enroll/confirm').set(auth(token)).send({ orderId: sub.id, paymentId: 'pay_TEST123', signature: 'a'.repeat(64) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.subscription.status).toBe('active');
  });

  it('also accepts payment.captured', async () => {
    const { sub } = await pendingOrder('order_CAPT1');
    const raw = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_C1', order_id: 'order_CAPT1', amount: price * 100, currency: 'INR', status: 'captured' } } },
    });
    expect((await post(raw)).body).toEqual({ handled: true });
    const [row] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(row!.status).toBe('active');
  });

  it('rejects a bad or missing signature and changes nothing', async () => {
    const { sub } = await pendingOrder('order_FORGED');
    const raw = orderPaid('order_FORGED', price * 100);
    expect((await post(raw, sign(raw, 'not-the-secret'))).status).toBe(400);
    expect((await post(raw, '')).status).toBe(400);
    // Signature over different bytes (body re-serialised) does not pass.
    expect((await post(raw.replace('"captured"', '"captured" '), sign(raw))).status).toBe(400);
    const [row] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(row!.status).toBe('pending');
  });

  it('does not activate when the paid amount differs from the order', async () => {
    const { sub } = await pendingOrder('order_CHEAP');
    const res = await post(orderPaid('order_CHEAP', 100));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ handled: false, reason: 'amount mismatch' });
    const [row] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(row!.status).toBe('pending');
  });

  it('acknowledges unknown orders and other events without acting', async () => {
    expect((await post(orderPaid('order_NOPE', price * 100))).body).toEqual({ handled: false, reason: 'unknown order' });
    const other = JSON.stringify({ event: 'refund.created', payload: {} });
    expect((await post(other)).body).toEqual({ handled: false, reason: 'event ignored' });
  });

  it('is switched off (404) without RAZORPAY_WEBHOOK_SECRET', async () => {
    const raw = orderPaid('order_X', 100);
    expect((await post(raw, sign(raw), ctx.app)).status).toBe(404);
  });
});
