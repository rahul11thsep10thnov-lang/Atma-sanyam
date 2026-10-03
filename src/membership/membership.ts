// Ad-free membership behind one small interface, so a billing library
// (Google Play Billing / StoreKit via RevenueCat or expo-iap) can be wired
// in without touching Settings. Until one is, purchases succeed only in
// development builds, so the ad-free flow can be tested.
import { MEMBERSHIP, updateRewards } from '../spaces/rewards';

export interface PurchaseProvider {
  readonly name: string;
  readonly real: boolean;
  /** Start the monthly subscription. Resolves true once paid. */
  subscribe(): Promise<boolean>;
  cancel(): Promise<boolean>;
}

class DevelopmentPurchases implements PurchaseProvider {
  readonly name = 'Development (no billing connected)';
  readonly real = false;
  async subscribe() {
    return __DEV__;
  }
  async cancel() {
    return true;
  }
}

let provider: PurchaseProvider = new DevelopmentPurchases();

export function setPurchaseProvider(p: PurchaseProvider) {
  provider = p;
}

export function purchases(): PurchaseProvider {
  return provider;
}

export const PLAN = MEMBERSHIP;

export async function subscribe(): Promise<'ok' | 'unavailable' | 'failed'> {
  if (!provider.real && !__DEV__) return 'unavailable';
  const ok = await provider.subscribe();
  if (!ok) return 'failed';
  await updateRewards((r) => ({ ...r, membership: { active: true, since: Date.now(), plan: 'monthly' } }));
  return 'ok';
}

export async function cancelMembership(): Promise<void> {
  await provider.cancel();
  await updateRewards((r) => ({ ...r, membership: { active: false, since: null, plan: null } }));
}
