// Google Play Billing through expo-iap, loaded lazily so Expo Go and the
// web (where the native module does not exist) still run. The purchase
// token is sent to the LoJi API, which verifies it with Google and grants
// the entitlement; nothing in the app decides that a payment succeeded.
import { Platform } from 'react-native';

export interface PlayProduct {
  productId: string;
  title: string;
  description: string;
  displayPrice: string;
  offerToken?: string;
}

export interface PlayPurchase {
  productId: string;
  purchaseToken: string;
}

type IapModule = {
  initConnection: () => Promise<boolean>;
  endConnection: () => Promise<void>;
  fetchProducts: (params: { skus: string[]; type: 'subs' }) => Promise<unknown[]>;
  requestPurchase: (params: unknown) => Promise<unknown>;
  getAvailablePurchases: () => Promise<unknown[]>;
  purchaseUpdatedListener?: (fn: (p: unknown) => void) => { remove: () => void };
};

let mod: IapModule | null | undefined;

function load(): IapModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-iap') as IapModule;
  } catch {
    mod = null;
  }
  return mod;
}

export const playBillingAvailable = () => load() !== null;

function pickToken(p: unknown): PlayPurchase | null {
  const x = (p ?? {}) as Record<string, unknown>;
  const token = (x.purchaseToken ?? x.purchaseTokenAndroid ?? x.transactionReceipt) as string | undefined;
  const productId = (x.productId ?? (Array.isArray(x.ids) ? x.ids[0] : undefined) ?? x.id) as string | undefined;
  if (!token || !productId) return null;
  return { productId, purchaseToken: token };
}

export async function fetchSubscription(productId: string): Promise<PlayProduct | null> {
  const iap = load();
  if (!iap) return null;
  await iap.initConnection();
  const products = (await iap.fetchProducts({ skus: [productId], type: 'subs' })) as Record<string, unknown>[];
  const p = products.find((x) => x.id === productId || x.productId === productId);
  if (!p) return null;
  const offers = (p.subscriptionOfferDetailsAndroid ?? p.subscriptionOfferDetails) as { offerToken?: string; pricingPhases?: { pricingPhaseList?: { formattedPrice?: string }[] } }[] | undefined;
  const offer = offers?.[0];
  return {
    productId,
    title: String(p.title ?? 'LoJi Monthly'),
    description: String(p.description ?? ''),
    displayPrice: String(p.displayPrice ?? offer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ?? ''),
    offerToken: offer?.offerToken,
  };
}

/** Opens the Play purchase sheet and resolves with the purchase token to verify. */
export async function purchaseSubscription(productId: string, offerToken?: string, obfuscatedAccountId?: string): Promise<PlayPurchase> {
  const iap = load();
  if (!iap) throw new Error('Google Play Billing is not available on this device.');
  await iap.initConnection();
  return new Promise<PlayPurchase>((resolve, reject) => {
    const sub = iap.purchaseUpdatedListener?.((p) => {
      const t = pickToken(p);
      if (t) {
        sub?.remove();
        resolve(t);
      }
    });
    iap
      .requestPurchase({
        type: 'subs',
        request: {
          android: { skus: [productId], subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined, obfuscatedAccountIdAndroid: obfuscatedAccountId },
          ios: { sku: productId, appAccountToken: obfuscatedAccountId },
        },
      })
      .then((r) => {
        const t = pickToken(Array.isArray(r) ? r[0] : r);
        if (t) {
          sub?.remove();
          resolve(t);
        }
      })
      .catch((e) => {
        sub?.remove();
        reject(e);
      });
  });
}

/** Tokens of every subscription the Play account still owns (for Restore). */
export async function ownedPurchases(): Promise<PlayPurchase[]> {
  const iap = load();
  if (!iap) return [];
  await iap.initConnection();
  return ((await iap.getAvailablePurchases()) as unknown[]).map(pickToken).filter((x): x is PlayPurchase => !!x);
}
