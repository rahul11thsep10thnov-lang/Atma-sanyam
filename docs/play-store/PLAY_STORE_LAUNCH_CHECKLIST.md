# Launch checklist (PASS / FAIL / BLOCKED / NOT TESTED) — after fixes
| Item | Status | Evidence / next action |
|---|---|---|
| Target API 36 | CHANGED, NOT BUILT | `app/build.gradle.kts`; build in Android Studio, fix any API-36 issues |
| Release .aab built | BLOCKED | no SDK where written; run Generate Signed App Bundle |
| Release signing | CONFIGURED, NOT TESTED | create `keystore.properties`; enrol Play App Signing |
| Firebase connected | BLOCKED | you supply `app/google-services.json`; release build refuses without it |
| Demo login out of release | PASS (by reading) | `AppServices`, `UnavailablePhoneAuthService`, Gradle guard |
| Firestore rules | WRITTEN, NOT TESTED | emulator test, then `firebase deploy --only firestore:rules`; enable TTL on `rooms.expireAt` |
| Privacy policy URL | BLOCKED | host `docs/web/privacy-policy.html` (fill [OWNER]); set `legal_privacy_url`; enter in Play Console |
| Account deletion in-app | WRITTEN, NOT TESTED | test with a throwaway account, check Firebase console |
| Account deletion web URL | BLOCKED | host `docs/web/delete-account.html`; `legal_delete_url`; Play Console |
| Data safety form | NOT TESTED | use PRIVACY_AND_DATA_SAFETY_INVENTORY.md; confirm answers |
| AdMob real ids | BLOCKED | your AdMob account |
| Ads consent (UMP) | NOT TESTED | verify on a device (EEA) |
| Play Billing | WRITTEN, NOT TESTED | create subscription `remove_ads_monthly` (₹29), license-tester test: purchase, cancel, restore, pending |
| Server-side purchase verification | NOT BUILT | optional hardening (Play Developer API + RTDN) |
| Real-money gambling | PASS (by reading) | none present |
| Content rating | NOT TESTED | IARC questionnaire; simulated gambling in Teen Patti; online interaction |
| UGC safeguards | PASS (by reading) | preset messages, block, report |
| Game logic tests | PASS | 154/154 JVM tests |
| Android build / lint / UI tests / device tests | NOT TESTED | no SDK/devices |
| R8 release smoke test | NOT TESTED | install the release build, play each game, sign in, delete a test account |
| Store assets | NOT TESTED | icon art done (app icon); screenshots + 1024×500 feature graphic to make |
| Account testing requirements for production | NOT TESTED | read Play Console for your account type (new personal accounts have had a closed-test requirement) |
