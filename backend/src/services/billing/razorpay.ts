// Razorpay Subscriptions for the LoJi website (the browser cannot use Google
// Play Billing). The server creates the subscription against a plan, the
// browser opens Razorpay Checkout with it, and the result is verified here by
// signature and by fetching the subscription back from Razorpay. Webhooks
// (subscription.charged / .cancelled / .halted / .completed …) are checked
// with the webhook secret and also re-fetch, never trusting the payload.
//
// Docs: https://razorpay.com/docs/payments/subscriptions/
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SubscriptionStatus } from '../../database/schema.js';
import { BillingVerificationError, type VerifiedSubscription } from './types.js';

export interface RazorpayOptions {
  keyId: string;
  keySecret: string;
  planId: string;
  webhookSecret?: string;
  fetchImpl?: typeof fetch;
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  created: 'pending',
  authenticated: 'pending',
  active: 'active',
  pending: 'billing_retry', // a renewal charge failed, retrying
  halted: 'expired', // retries exhausted
  cancelled: 'cancelled',
  completed: 'expired',
  expired: 'expired',
  paused: 'paused',
};

export function createRazorpayProvider(opts: RazorpayOptions) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const authHeader = `Basic ${Buffer.from(`${opts.keyId}:${opts.keySecret}`).toString('base64')}`;

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
        ...init,
        headers: { Authorization: authHeader, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new BillingVerificationError(`Razorpay could not be reached: ${err instanceof Error ? err.message : err}`, 'provider_error');
    }
    if (res.status === 400 || res.status === 404) throw new BillingVerificationError('Razorpay did not recognise this subscription', 'invalid');
    if (!res.ok) throw new BillingVerificationError(`Razorpay responded ${res.status}`, 'provider_error');
    return (await res.json()) as T;
  }

  return {
    name: 'razorpay' as const,
    keyId: opts.keyId,
    planId: opts.planId,
    /** Creates a subscription the browser then pays for with Checkout. */
    async createSubscription(guardianId: string): Promise<{ id: string; shortUrl: string | null }> {
      const body = { plan_id: opts.planId, total_count: 120, customer_notify: 1, notes: { guardian_id: guardianId } };
      const sub = await call<{ id: string; short_url?: string }>('/subscriptions', { method: 'POST', body: JSON.stringify(body) });
      return { id: sub.id, shortUrl: sub.short_url ?? null };
    },
    /** Checkout handler signature: HMAC-SHA256(payment_id + "|" + subscription_id, key_secret). */
    verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
      const expected = createHmac('sha256', opts.keySecret).update(`${paymentId}|${subscriptionId}`).digest('hex');
      return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    },
    verifyWebhookSignature(rawBody: string, signature: string): boolean {
      if (!opts.webhookSecret) return false;
      const expected = createHmac('sha256', opts.webhookSecret).update(rawBody).digest('hex');
      return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    },
    async verify(subscriptionId: string): Promise<VerifiedSubscription> {
      const sub = await call<Record<string, unknown>>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
      return mapRazorpaySubscription(sub);
    },
    async cancel(subscriptionId: string): Promise<void> {
      await call(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: 1 }) });
    },
  };
}

const sec = (v: unknown) => (typeof v === 'number' && v > 0 ? new Date(v * 1000) : null);

export function mapRazorpaySubscription(sub: Record<string, unknown>): VerifiedSubscription {
  const status = STATUS_MAP[String(sub.status)] ?? 'expired';
  const notes = (sub.notes as Record<string, string> | undefined) ?? {};
  return {
    provider: 'razorpay',
    providerRef: String(sub.id),
    productId: String(sub.plan_id ?? ''),
    status,
    autoRenewing: status === 'active' || status === 'billing_retry',
    currentPeriodStart: sec(sub.current_start),
    currentPeriodEnd: sec(sub.current_end) ?? sec(sub.end_at),
    cancelledAt: status === 'cancelled' ? sec(sub.ended_at) ?? new Date() : null,
    revokedAt: null,
    priceAmount: null,
    priceCurrency: 'INR',
    accountRef: notes.guardian_id ?? null,
    raw: sub,
  };
}
