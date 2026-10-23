// iOS/Android: load react-native-google-mobile-ads lazily. A build without
// the module (Expo Go, a dev client made before it was added) returns null and
// the app runs ad-free.
import type { NativeAds } from './nativeAdsTypes';

let cached: NativeAds | null | undefined;

export function loadNativeAds(): NativeAds | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-google-mobile-ads');
    cached = { mobileAds: mod.default ?? mod.mobileAds, InterstitialAd: mod.InterstitialAd, AdEventType: mod.AdEventType, MaxAdContentRating: mod.MaxAdContentRating };
  } catch {
    cached = null;
  }
  return cached;
}
