import type { Env } from '../../config/env.js';
import { createGooglePlayVerifier } from './googlePlay.js';
import { createRazorpayProvider } from './razorpay.js';
import { createSandboxProvider } from './sandbox.js';

export type { VerifiedSubscription } from './types.js';
export { BillingVerificationError } from './types.js';

export interface BillingProviders {
  googlePlay: ReturnType<typeof createGooglePlayVerifier> | null;
  razorpay: ReturnType<typeof createRazorpayProvider> | null;
  sandbox: ReturnType<typeof createSandboxProvider> | null;
}

export function createBillingProviders(env: Env): BillingProviders {
  let googlePlay: BillingProviders['googlePlay'] = null;
  if (env.GOOGLE_PLAY_PACKAGE_NAME && env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    try {
      googlePlay = createGooglePlayVerifier({ packageName: env.GOOGLE_PLAY_PACKAGE_NAME, serviceAccountJson: env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON });
    } catch (err) {
      console.warn('Google Play billing is disabled:', err instanceof Error ? err.message : err);
    }
  }
  const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_PLAN_ID
    ? createRazorpayProvider({ keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, planId: env.RAZORPAY_PLAN_ID, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET })
    : null;
  const sandbox = env.BILLING_SANDBOX && env.NODE_ENV !== 'production' ? createSandboxProvider() : null;
  return { googlePlay, razorpay, sandbox };
}
