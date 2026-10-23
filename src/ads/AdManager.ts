// Interstitial ads for households without a subscription, through Google
// AdMob with child-directed treatment. Design rules (docs/ADS.md):
//   - never during gameplay: only before the first game of a session and
//     between games, and only after the configured waits;
//   - frequency caps (minimum gap, per hour, per day) persisted on device;
//   - the SDK's own callbacks decide what happened: a failed load is never
//     counted as an impression, and the app continues at once without an ad;
//   - entitlement.adFree (any active subscription) switches ads off entirely;
//   - the native module is loaded lazily, so Expo Go, the web build and a
//     device without the module simply run ad-free.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdsConfig } from '../context/RemoteConfigContext';
import { loadNativeAds } from './nativeAds';
import type { NativeAds } from './nativeAdsTypes';

export type AdTrigger = 'first' | 'between';

export interface AdDiagnostics {
  sdkAvailable: boolean;
  initialised: boolean;
  lastError: string | null;
  shownToday: number;
  shownThisHour: number;
  lastShownAt: number | null;
  events: { at: number; event: string; detail?: string }[];
}

const STATE_KEY = 'loji.ads.state.v1';

interface Persisted {
  day: string;
  shownToday: number;
  hourStart: number;
  shownThisHour: number;
  lastShownAt: number | null;
}

export class AdPlacementManager {
  private config: AdsConfig | null = null;
  private adFree = true;
  private sessionStart = Date.now();
  private lastGameEnd: number | null = null;
  private initialised = false;
  private lastError: string | null = null;
  private state: Persisted = { day: '', shownToday: 0, hourStart: 0, shownThisHour: 0, lastShownAt: null };
  private loaded = false;
  private events: AdDiagnostics['events'] = [];

  async init() {
    try {
      const raw = await AsyncStorage.getItem(STATE_KEY);
      if (raw) this.state = { ...this.state, ...(JSON.parse(raw) as Persisted) };
    } catch {
      // fresh state
    }
    this.sessionStart = Date.now();
  }

  /** Called whenever the remote config or the entitlement changes. */
  configure(config: AdsConfig, adFree: boolean) {
    this.config = config;
    this.adFree = adFree;
  }

  private log(event: string, detail?: string) {
    this.events = [...this.events.slice(-29), { at: Date.now(), event, detail }];
  }

  private rollWindows() {
    const now = Date.now();
    const day = new Date(now).toDateString();
    if (this.state.day !== day) this.state = { ...this.state, day, shownToday: 0 };
    if (now - this.state.hourStart > 3_600_000) this.state = { ...this.state, hourStart: now, shownThisHour: 0 };
  }

  /** Whether an ad is allowed right now for this trigger (no SDK work). */
  eligible(trigger: AdTrigger): { ok: boolean; reason: string } {
    const c = this.config;
    if (!c || !c.enabled) return { ok: false, reason: 'ads disabled' };
    if (this.adFree) return { ok: false, reason: 'ad-free household' };
    this.rollWindows();
    const now = Date.now();
    if (trigger === 'first' && now - this.sessionStart < c.firstAdTargetSeconds * 1000) return { ok: false, reason: 'before first-ad target' };
    if (trigger === 'between' && (this.lastGameEnd === null || now - this.lastGameEnd > 10 * 60_000)) return { ok: false, reason: 'no recent game' };
    if (trigger === 'between' && this.lastShownOrStart() + c.betweenGamesTargetSeconds * 1000 > now) return { ok: false, reason: 'before between-games target' };
    if (this.state.lastShownAt && now - this.state.lastShownAt < c.minGapSeconds * 1000) return { ok: false, reason: 'minimum gap' };
    if (this.state.shownThisHour >= c.maxPerHour) return { ok: false, reason: 'hourly cap' };
    if (this.state.shownToday >= c.maxPerDay) return { ok: false, reason: 'daily cap' };
    return { ok: true, reason: 'eligible' };
  }

  private lastShownOrStart() {
    return this.state.lastShownAt ?? this.sessionStart;
  }

  noteGameEnded() {
    this.lastGameEnd = Date.now();
  }

  private async ensureInit(n: NativeAds) {
    if (this.initialised) return;
    await n.mobileAds().setRequestConfiguration({ maxAdContentRating: n.MaxAdContentRating.G, tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true });
    await n.mobileAds().initialize();
    this.initialised = true;
    this.log('sdk_initialised');
  }

  /**
   * Shows an interstitial if eligible and the SDK delivers one in time.
   * Resolves when the ad is closed, or at once when no ad is shown. Never throws.
   */
  async maybeShow(trigger: AdTrigger): Promise<{ shown: boolean; reason: string }> {
    const e = this.eligible(trigger);
    if (!e.ok) return { shown: false, reason: e.reason };
    const n = loadNativeAds();
    if (!n) {
      this.log('sdk_unavailable');
      return { shown: false, reason: 'sdk unavailable' };
    }
    const c = this.config!;
    const unitId = Platform.OS === 'ios' ? c.units.interstitialIos : c.units.interstitialAndroid;
    if (!unitId) return { shown: false, reason: 'no unit id' };
    try {
      await this.ensureInit(n);
      const ad = n.InterstitialAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });
      const shown = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (v: boolean) => {
          if (settled) return;
          settled = true;
          unsubs.forEach((u) => u());
          resolve(v);
        };
        const timer = setTimeout(() => {
          this.log('load_timeout');
          finish(false);
        }, c.loadTimeoutMs);
        const unsubs = [
          ad.addAdEventListener(n.AdEventType.LOADED, () => {
            clearTimeout(timer);
            this.loaded = true;
            this.log('loaded');
            ad.show().catch((err: unknown) => {
              this.lastError = String(err);
              this.log('show_failed', this.lastError);
              finish(false);
            });
          }),
          ad.addAdEventListener(n.AdEventType.ERROR, (err) => {
            clearTimeout(timer);
            this.lastError = String((err as { message?: string })?.message ?? err);
            this.log('load_failed', this.lastError);
            finish(false); // a failed load is never an impression
          }),
          ad.addAdEventListener(n.AdEventType.OPENED, () => {
            // Only the SDK's "opened" callback counts as a shown ad.
            this.state.lastShownAt = Date.now();
            this.state.shownToday += 1;
            this.state.shownThisHour += 1;
            void AsyncStorage.setItem(STATE_KEY, JSON.stringify(this.state)).catch(() => undefined);
            this.log('opened', trigger);
          }),
          ad.addAdEventListener(n.AdEventType.CLOSED, () => {
            this.log('closed');
            finish(true);
          }),
        ];
        ad.load();
      });
      return { shown, reason: shown ? 'shown' : this.lastError ?? 'not shown' };
    } catch (err) {
      this.lastError = String(err);
      this.log('error', this.lastError);
      return { shown: false, reason: this.lastError };
    }
  }

  diagnostics(): AdDiagnostics {
    this.rollWindows();
    return { sdkAvailable: loadNativeAds() !== null, initialised: this.initialised, lastError: this.lastError, shownToday: this.state.shownToday, shownThisHour: this.state.shownThisHour, lastShownAt: this.state.lastShownAt, events: this.events };
  }
}

export const adManager = new AdPlacementManager();
void adManager.init();
