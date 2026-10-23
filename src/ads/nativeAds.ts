// Web (and any platform without the native module): no ad SDK. Metro picks
// nativeAds.native.ts on iOS/Android, so the SDK is never bundled for web.
import type { NativeAds } from './nativeAdsTypes';

export function loadNativeAds(): NativeAds | null {
  return null;
}
