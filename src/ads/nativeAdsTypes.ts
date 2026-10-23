// The slice of react-native-google-mobile-ads the placement manager uses.
export interface NativeAds {
  mobileAds: () => { initialize: () => Promise<unknown>; setRequestConfiguration: (c: Record<string, unknown>) => Promise<void> };
  InterstitialAd: { createForAdRequest: (unitId: string, opts?: Record<string, unknown>) => { load: () => void; show: () => Promise<void>; addAdEventListener: (type: string, cb: (payload?: unknown) => void) => () => void } };
  AdEventType: { LOADED: string; ERROR: string; OPENED: string; CLOSED: string };
  MaxAdContentRating: { G: string };
}
