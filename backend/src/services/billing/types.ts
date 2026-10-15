import type { SubscriptionStatus } from '../../database/schema.js';

// What a provider tells us about one subscription, normalised. Everything the
// entitlement needs comes from here, never from the app.
export interface VerifiedSubscription {
  provider: 'google_play' | 'razorpay' | 'sandbox';
  providerRef: string; // purchase token / subscription id
  productId: string;
  status: SubscriptionStatus;
  autoRenewing: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  revokedAt: Date | null;
  priceAmount: number | null; // minor units
  priceCurrency: string | null;
  // The provider's own account/customer reference, if it has one, so a
  // purchase can be tied to the guardian who made it (obfuscated ids).
  accountRef: string | null;
  raw: Record<string, unknown>;
}

export class BillingVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'invalid' | 'provider_error' = 'invalid'
  ) {
    super(message);
  }
}
