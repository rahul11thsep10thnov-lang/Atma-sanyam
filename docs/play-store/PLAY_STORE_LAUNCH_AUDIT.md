# Play Store launch audit — Indian Taash (`com.rangepatte.app`)
Audit 2026-10-20, fixes applied the same day on branch `claude/rang-e-patte-card-games-sj8xsw`.
**Important limit: the Android module could not be compiled, linted, packaged or run in the environment where these fixes were written** (no Android SDK; Google's Maven host is blocked). Every Kotlin/Gradle change below is reviewed by reading but is **uncompiled** — the first Android Studio build is the real test.

## Stack (verified)
Native Android: Kotlin 2.0.21, Jetpack Compose, AGP now 8.10.1 / Gradle 8.11.1, minSdk 24, compile/targetSdk now **36**, versionCode 1 / versionName 1.0.0. Firebase Auth (phone OTP) + Firestore, AdMob + UMP, Nearby, Play Billing 8. No server code: the backend is Firebase plus `firestore.rules`.

## Official requirement verified
developer.android.com/google/play/requirements/target-sdk (fetched 2026-10-20): from 31 Aug 2026 new apps and updates must target **API 36**; an extension to 1 Nov 2026 can be requested in Play Console. `support.google.com` was unreachable, so account-deletion, Data-safety and testing-requirement pages were **not** re-read — confirm them in Play Console.

## Findings and what was done
| ID | Finding | Status |
|---|---|---|
| P0-1 | targetSdk 34 (< 36) | **Changed, uncompiled**: compile/targetSdk 36, AGP 8.10.1, Gradle 8.11.1. Expect to open it in Android Studio Narwhal or newer. Edge-to-edge was already enabled; on API 36 large screens ignore orientation locks (Settings ▸ orientation has no effect on tablets) |
| P0-2 | Release could ship demo login (OTP 123456) | **Fixed**: release tasks fail without `app/google-services.json`; release never uses `DemoPhoneAuthService` (`UnavailablePhoneAuthService` instead) |
| P0-3 | Account deletion incomplete | **Fixed, uncompiled**: `FirestoreAccountDeletion` removes users/profiles/presence/username, relations, pokes, play requests and the Firebase Auth user; "sign in again" case handled; web page `docs/web/delete-account.html`. Not deleted by design: reports other players filed; rooms (6 h TTL — **you must enable the Firestore TTL policy on `rooms.expireAt`**) |
| P0-4 | No privacy policy | **Partly**: drafts in `docs/web/` and links in Settings ▸ About + login (hidden until you set the URLs in `res/values/legal_config.xml`). **You must host and fill them in** |
| P0-5 | Test AdMob ids | **Not fixable by me**: needs your AdMob account (`res/values/ads_config.xml`) |
| P0-6 | No signing / `.aab` | **Config added** (`keystore.properties` or env vars; `.gitignore` extended). **No `.aab` built** — needs the SDK and your key |
| P0-7 | Firestore rules | **Written** (`firestore.rules`, `firebase.json`); **not run in the emulator or deployed**. Known limit: private `to` messages in room logs are readable by any signed-in user who knows the room code (hands are visible to seated phones by design) |
| P1-1 | Membership payment placeholder | **Built, uncompiled**: Google Play Billing 8 subscription (`PlayBilling.kt`), checkout rewritten, restore/manage/disclosure, strings in 8 languages. Needs the subscription `remove_ads_monthly` (₹29) created in Play Console and licence-tester testing. Server-side purchase verification **not built** |
| P1-2 | Dead Settings rows | **Fixed**: About dialog implemented; "Reset game data" row removed |
| P1-3 | Lockstep multiplayer trusts phones; records local | Unchanged; disclose honestly. No stakes/prizes |
| P1-4 | Never run on real devices | Open — see TEST_RESULTS procedure |
| P1-5 | allowBackup true | **Fixed**: `allowBackup=false` and exclusion rules |
| P1-6 | Simulated gambling (Teen Patti "Stake") for content rating | Open — your IARC answers |
| P1-7 | No R8 | **Enabled, unverified**: `isMinifyEnabled`/`isShrinkResources` true; app has no own reflection; must be smoke-tested on a device |
| P1-8 | Avatars / translations | Open |
| P1-9 | Old dependencies | Only AGP/Gradle/Billing updated deliberately (blind upgrades risk compile breaks). Update Compose, Firebase, Ads after the first good build |
## P2
No crash reporting beyond Play vitals; accessibility pass not done; store graphics to produce.
## Verified positives
One exported component (launcher activity); no WebView, deep links, cleartext HTTP or hard-coded keys found; no sensitive logging; payment simulator is DEBUG-only; no real-money features.
