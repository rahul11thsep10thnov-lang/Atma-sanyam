// Development and automated tests only: activates a one-month subscription
// with no payment. The server refuses to create it in production
// (config/env.ts clears BILLING_SANDBOX), and the app never shows it unless
// /v1/config says it exists. It is how the subscription gate, expiry and
// cancellation are exercised without a store.
import { randomBytes } from 'node:crypto';
import type { VerifiedSubscription } from './types.js';

export function createSandboxProvider() {
  return {
    name: 'sandbox' as const,
    activate(guardianId: string, opts: { days?: number; status?: VerifiedSubscription['status'] } = {}): VerifiedSubscription {
      const now = new Date();
      const days = opts.days ?? 30;
      return {
        provider: 'sandbox',
        providerRef: `sandbox_${randomBytes(8).toString('hex')}`,
        productId: 'loji_monthly_sandbox',
        status: opts.status ?? 'active',
        autoRenewing: true,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + days * 86_400_000),
        cancelledAt: null,
        revokedAt: null,
        priceAmount: 0,
        priceCurrency: 'INR',
        accountRef: guardianId,
        raw: { sandbox: true },
      };
    },
  };
}
