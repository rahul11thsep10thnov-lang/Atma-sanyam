// Google Play Billing, verified server-side with the Play Developer API
// (purchases.subscriptionsv2.get). Authentication is a service-account JWT
// signed with Node's crypto — no SDK needed. Real-time developer
// notifications (Pub/Sub push) arrive at /v1/webhooks/google-play and are
// handled by re-fetching the subscription, so a forged notification can only
// ever cause a verification, never an entitlement.
//
// Docs: https://developer.android.com/google/play/billing/subscriptions
//       https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
import { createSign } from 'node:crypto';
import type { SubscriptionStatus } from '../../database/schema.js';
import { BillingVerificationError, type VerifiedSubscription } from './types.js';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface GooglePlayOptions {
  packageName: string;
  serviceAccountJson: string; // raw JSON or base64
  fetchImpl?: typeof fetch;
}

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(text) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error('Service account JSON is missing client_email/private_key');
  return sa;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

export function createGooglePlayVerifier(opts: GooglePlayOptions) {
  const sa = parseServiceAccount(opts.serviceAccountJson);
  const fetchImpl = opts.fetchImpl ?? fetch;
  let cached: { token: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const now = Math.floor(Date.now() / 1000);
    const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
    const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key);
    const assertion = `${header}.${claims}.${b64url(signature)}`;
    let res: Response;
    try {
      res = await fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
      signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new BillingVerificationError(`Google token endpoint could not be reached: ${err instanceof Error ? err.message : err}`, 'provider_error');
    }
    if (!res.ok) throw new BillingVerificationError(`Google token endpoint responded ${res.status}`, 'provider_error');
    const body = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  return {
    name: 'google_play' as const,
    async verify(purchaseToken: string): Promise<VerifiedSubscription> {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(opts.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
      let res: Response;
      try {
        res = await fetchImpl(url, { headers: { Authorization: `Bearer ${await accessToken()}` }, signal: AbortSignal.timeout(10_000) });
      } catch (err) {
        if (err instanceof BillingVerificationError) throw err;
        throw new BillingVerificationError(`Google Play could not be reached: ${err instanceof Error ? err.message : err}`, 'provider_error');
      }
      if (res.status === 404 || res.status === 400) throw new BillingVerificationError('This purchase could not be found', 'invalid');
      if (!res.ok) throw new BillingVerificationError(`Google Play responded ${res.status}`, 'provider_error');
      const body = (await res.json()) as Record<string, unknown>;
      return mapSubscriptionV2(purchaseToken, body);
    },
    /** Tells Google the purchase was granted (required within 3 days or it is refunded). */
    async acknowledge(purchaseToken: string, productId: string): Promise<void> {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(opts.packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
      const res = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10_000) });
      // 400 "already acknowledged" is fine.
      if (!res.ok && res.status !== 400) throw new BillingVerificationError(`Acknowledge failed: ${res.status}`, 'provider_error');
    },
  };
}

// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2#SubscriptionState
const STATE_MAP: Record<string, SubscriptionStatus> = {
  SUBSCRIPTION_STATE_PENDING: 'pending',
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_PAUSED: 'paused',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'grace',
  SUBSCRIPTION_STATE_ON_HOLD: 'billing_retry',
  SUBSCRIPTION_STATE_CANCELED: 'cancelled',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'expired',
};

export function mapSubscriptionV2(purchaseToken: string, body: Record<string, unknown>): VerifiedSubscription {
  const state = String(body.subscriptionState ?? '');
  const items = (body.lineItems as Record<string, unknown>[] | undefined) ?? [];
  const item = items[0] ?? {};
  const expiry = item.expiryTime ? new Date(String(item.expiryTime)) : null;
  const start = body.startTime ? new Date(String(body.startTime)) : null;
  const autoRenew = (item.autoRenewingPlan as Record<string, unknown> | undefined)?.autoRenewEnabled === true;
  const canceled = body.canceledStateContext as Record<string, unknown> | undefined;
  const revoked = state === 'SUBSCRIPTION_STATE_EXPIRED' && body.latestOrderId && (body as { testPurchase?: unknown }).testPurchase === undefined && canceled?.systemInitiatedCancellation !== undefined;
  const ext = body.externalAccountIdentifiers as Record<string, string> | undefined;
  const status = STATE_MAP[state] ?? 'expired';
  return {
    provider: 'google_play',
    providerRef: purchaseToken,
    productId: String(item.productId ?? ''),
    status,
    autoRenewing: autoRenew,
    currentPeriodStart: start,
    currentPeriodEnd: expiry,
    cancelledAt: status === 'cancelled' ? new Date() : null,
    revokedAt: revoked ? new Date() : null,
    priceAmount: null,
    priceCurrency: null,
    accountRef: ext?.obfuscatedExternalAccountId ?? null,
    raw: body,
  };
}
