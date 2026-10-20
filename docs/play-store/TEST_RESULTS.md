# Test results (2026-10-20, after fixes)
## Executed
| Command (throwaway Kotlin/JVM Gradle project outside the repo, JDK 21, JUnit 4.13.2) | Result |
|---|---|
| `gradle test` over the repository's pure-Kotlin sources and `app/src/test/java/**` (game engines, machines, multiplayer simulation, reconnect, spectators, table talk, codecs, Ludo, Moksha Patam, UndoGate, **MembershipRules (new, 3 tests)**, presence, relations, pokes, notices, play requests, usernames, profile rules, deck) | **154 tests, 0 failed, 0 skipped — PASS** (was 151 before this work) |
## Not executed
- Android compile of any changed Android file (`PlayBilling`, `CheckoutScreen`, `AccountDeletion`, `AboutDialog`, `LoginScreen`, `MyProfileRoute`, `AppServices`, `MainActivity`, Gradle scripts, manifest, resources): **not compiled** — no SDK; Google Maven blocked. R8/lint/instrumented tests/device tests: **not run**.
- Firestore rules (emulator), Firebase auth/OTP, deletion against a live project, Play Billing purchase/cancel/restore, AdMob, Nearby, notifications: **not tested**.
- `HandLayoutTest` (needs Compose): not run here.
## Procedure for you (two phones, Firebase project, Play licence-tester account)
1. Android Studio: Sync, Build ▸ Clean, run debug; fix any compile error (send me the message).
2. Firebase: enable Phone sign-in; add `google-services.json`; deploy rules; run a few reads/writes in the Rules Playground, then two real phones play an online table of each game.
3. Sign up, delete the account (Profile ▸ Delete account); in the Firebase console confirm `users`, `profiles`, `usernames`, `presence`, relations/pokes/requests and the Auth user are gone. Also check the "sign in again" path.
4. Play Console internal test: subscribe, check ads disappear; cancel and wait for expiry; Restore purchases; pending payment (test card).
5. Release build (R8): install the signed bundle via internal testing; play every game, rotate, background/foreground, back-button prompt, Nearby with permissions granted/denied.
