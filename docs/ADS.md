# Ads (Google AdMob) and the subscription

The monthly family plan stays the product: **any active subscription removes ads**
(`entitlement.adFree`, derived on the server). Ads exist only for households without a
subscription, and only when the admin feature flag `adSupportedAccess` lets such households into
the Player Console at all (default **off**: without a plan the console is locked, as before).

## Rules the app enforces (`src/ads/AdManager.ts`)

- **Never during gameplay.** The only placement is before a game starts (`GamePlayScreen`):
  the first time at least `firstAdTargetSeconds` (default 15) after the console opened, then
  between games at least `betweenGamesTargetSeconds` (default 25) after the last ad.
- **Frequency caps** persisted on the device: `minGapSeconds` (180), `maxPerHour` (6),
  `maxPerDay` (20).
- **SDK callbacks decide.** An ad counts as shown only on the SDK's *opened* event; a failed
  load, a timeout (`loadTimeoutMs`, 6 s) or an unavailable SDK means the game starts at once with
  no ad and nothing is counted. Diagnostics (`adManager.diagnostics()`) keep the last 30 events.
- **Child-directed treatment, always:** `tagForChildDirectedTreatment: true`,
  `tagForUnderAgeOfConsent: true`, `maxAdContentRating: G`, non-personalised requests. These are
  fixed in code, not settings.
- **Test ads by default.** Until real unit ids are configured and `testMode` is turned off, the
  app uses Google's sample interstitial units and nothing is ever paid out.
- Web and builds without the native module run ad-free (`nativeAds.ts` vs `nativeAds.native.ts`).

## Configuration

| Where | What |
|---|---|
| Admin console → Feature flags & config → **Ads** | `enabled`, targets, caps, `loadTimeoutMs`, `testMode` |
| Feature flags | `ads` (master switch), `adSupportedAccess` (lets non-subscribers in with ads) |
| Server environment | `ADMOB_INTERSTITIAL_UNIT_ANDROID`, `ADMOB_INTERSTITIAL_UNIT_IOS` (real unit ids) |
| `app.json` plugin `react-native-google-mobile-ads` | `androidAppId`, `iosAppId` — **currently Google's sample app ids**; replace with the real AdMob app ids before a store build |

`/v1/config` → `ads` carries everything the app needs; `/v1/player/me` → `access` is
`subscriber`, `ad_supported` or `locked`.

## What is not verified here

No ad has been shown in this environment: there is no native build and no AdMob account. The
manager, caps and callbacks are implemented and type-checked; the first device build with the
plugin is where the SDK path is exercised. Google Play's Families policy requires the AdMob app
to be registered as child-directed and the Families self-certified ads SDK; see
STORE_SUBMISSION.md.
