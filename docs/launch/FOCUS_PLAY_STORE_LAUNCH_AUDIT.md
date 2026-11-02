# Tame (Focus app): Google Play launch audit

**Audit date:** 20 October 2026.

**Code audited:** `main` at `628f65a` (PR #27 merged).

**Mode:** the audit was read-only. The owner then approved four fixes (P0-1, P1-1, P1-2, P1-3), the store-listing wording (P2-5) and recorded the picture rights (P0-2). Those are done in the same PR; see §4. Evidence comes from:
- reading the code;
- scripts run against the real source code from an isolated scratch folder;
- the project's own checks and CI;
- one generated (not committed) Android project.

## 1. What the app actually is

The audit brief assumes a native Kotlin/Compose app. The real project differs, and is audited as it is:

| Area | Found |
|---|---|
| Stack | Expo SDK 57, React Native 0.86, TypeScript. Built for Android by EAS (`eas.json`); there is no `android/` folder in the repo. |
| Android config | Package `com.atmasanyam.focus`, version `1.0.0`, `versionCode` managed remotely by EAS (`autoIncrement`), minSdk 24, targetSdk 36, compileSdk 36. |
| Storage | AsyncStorage: JSON values per feature (garden, balcony, coins, collection, museum, history, settings). No SQL database on the device. |
| Version 1 mode | Offline. With no `EXPO_PUBLIC_API_URL` there are no accounts, social features, analytics or push. Membership and ads are hidden (`src/config/features.ts`). |
| Server and admin (online builds only) | Express + Postgres API and a Next.js admin console. They are **not used by version 1**. |
| Tests | Backend: vitest (105 tests). App: no unit-test framework; checks are `tsc` and native bundle exports in CI. |

**Features the brief mentions that do not exist in this app:**
- pause/resume;
- Pomodoro;
- tasks/categories and notes;
- ambient audio (the "Sound & haptics" switch only controls vibration);
- widgets;
- in-app purchases, subscriptions and ads;
- usage access, accessibility service, app blocking.

These are reported as *not applicable*, not as defects. Nothing was invented for them.

## 2. Issue list

### P0: blocks release

| # | Issue | Evidence | Proposed fix (needs approval) |
|---|---|---|---|
| P0-1 | **In store builds, focus sessions fail when the phone's screen goes to sleep.** In development (Expo Go) Expo keeps the screen on, which hid this in all testing so far. | `node_modules/expo/src/launch/registerRootComponent.tsx` wraps the app with keep-awake only when `NODE_ENV !== 'production'`. The app itself never keeps the screen awake (no `expo-keep-awake` use in `src/`). `src/hooks/useFocusTimer.ts` treats *any* non-`active` app state as leaving: after the grace period (5 s) the session fails, leaving a wilted sapling or broken picture. On Android, screen-off pauses the activity, so a 25-minute session fails once the screen times out (often 30 s to 2 min) unless the person keeps touching it. **Device test: NOT TESTED** (no device here); the conclusion comes from code. | Keep the screen awake only while a session runs, with `expo-keep-awake` (already installed as part of Expo; needs no permission). About 3 lines in `ActiveSessionScreen.tsx`. Then confirm on a phone. |
| P0-2 | **Rights to bundled pictures are not documented.** | `assets/library/README.md`: 104 landscape photos "were supplied … with no credits or licences"; 100 quote cards came with no licences, and "quote attributions were not verified". Only 2 of 206 pictures have a recorded licence (CC BY 4.0, credited in-app). The garden/balcony/museum art (≈1,430 files) and the avatars have no provenance record either. | Owner confirms where each set came from and that it may be distributed commercially. Otherwise remove the unconfirmed sets from version 1 before upload (a code change, needing approval). |

### P1: important

| # | Issue | Evidence | Proposed fix |
|---|---|---|---|
| P1-1 | **Closing the app from Recents (or the system killing it) during a session leaves no record and no consequence.** This bypasses the "leaving fails the session" rule; the session also vanishes from history. | Session state lives only in memory (`useFocusTimer.ts`, `ActiveSessionScreen.tsx`). Nothing is written when a session starts. | Save a small "session in progress" note at start, and settle it as failed (left the app) on next launch. |
| P1-2 | **Saved progress can be wiped if a stored value cannot be read.** | Scratch test against the real repositories with simulated storage (`docs/launch/FOCUS_TEST_RESULTS.md` §3):<br>• A damaged garden value is replaced by an **empty garden and saved over the old one**.<br>• A failed coins read returns 0 coins; the next save writes 0.<br>• Damaged history plus one new session leaves **only the new session**.<br>Spaces and the museum use the same pattern. Write errors are swallowed ("best effort"). History has no size cap, while Android's AsyncStorage cannot read one value larger than about 2 MB, which leads into exactly this path for a long-term user. | Never overwrite on a failed read: keep the raw value under a backup key and stop saving that store for this run. Cap or split history. |
| P1-3 | **Unneeded sensitive permission in the release manifest:** `ACTIVITY_RECOGNITION` (physical activity). | Comes from `expo-sensors` (`node_modules/expo-sensors/android/src/main/AndroidManifest.xml`). The app only uses `DeviceMotion` for the balcony's parallax, never the pedometer. Shows on the Play listing and contradicts "requests no sensitive permissions". | Add `android.permission.ACTIVITY_RECOGNITION` to `blockedPermissions` in `app.json`. |
| P1-4 | **An incoming phone call ends the session.** | The call screen takes the foreground, so the same rule fails the session after 5 s. Detecting calls would need `READ_PHONE_STATE`, which is out of proportion here. | Owner decision: keep as is (state it in the app/listing), or lengthen the grace period. The grace period can already be set from 3 to 60 s, but only through the admin console, which offline builds don't use. |
| P1-5 | **The release build has not been produced** (blocker, not a code defect). | This environment cannot download the Android SDK (`dl.google.com` is refused by the network policy). EAS needs the owner's Expo login. | Owner runs `eas build --platform android --profile production` (see the release build report). |

### P2: improvements

| # | Issue | Evidence |
|---|---|---|
| P2-1 | Day streak and week bars break across daylight-saving changes. Not an issue in India (IST has no DST). | Scratch test: New York time zone, 4 consecutive days → streak 2. Kolkata → 4. `ProgressScreen.tsx` steps back by a fixed 86,400,000 ms. |
| P2-2 | A completed session saves coins, plant/artwork and history in separate writes, so a crash between them gives coins without the plant. The coin credit is not idempotent per session (the plant is). The online group mode can call completion twice (group-ended event plus timer) and double the coins. | `focusEngine.ts` `creditCompletedSession`; `ActiveSessionScreen.tsx` `handleComplete` has no "already done" guard. |
| P2-3 | Untranslated or English-only text: | |
| | • the leave-app warning notification ("…your **puzzle** session will fail", also shown for plant sessions); | `useFocusTimer.ts:128` |
| | • "focused", "m"/"h" on Progress; | |
| | • the store's "Buy … for … coins" screen-reader label; | |
| | • weekday names follow the phone's locale, not the app language. | |
| P2-4 | The timer uses wall-clock time (`Date.now`). Changing the clock needs leaving the app (which fails the session), so the risk is low. | `useFocusTimer.ts` |
| P2-5 | Store listing says "sound and haptics you can turn off"; the app has no sounds, only vibration. | `docs/STORE_LISTING.md`; `SettingsScreen.tsx:193` |
| P2-6 | The offline privacy and terms texts say progress is lost on uninstall. With `android:allowBackup="true"`, Android's own backup may restore it. | Generated manifest |
| P2-7 | `READ/WRITE_EXTERNAL_STORAGE` (Android 12 and below) come from `expo-image-picker`/`expo-file-system`. The photo picker doesn't need them, but removing them needs a test on an Android 12 phone. | Generated manifest |
| P2-8 | `npm audit`: 31 findings (1 critical, `shell-quote`), all in Expo/Metro **build tooling**, not in the shipped bundle. The admin console has 3 high findings (`next`, `sharp`, `source-map-js`); it is not part of version 1. | `npm audit --omit=dev` |
| P2-9 | The `puzzlefocus://` deep-link scheme is registered but unused. Harmless. | Generated manifest |

**Totals:** P0 = 2, P1 = 5 (one of them the release-build blocker), P2 = 9.

## 3. What passed

- **Seven reward sizes:** exactly 15/30/60/90/120/150/180 minutes, one table (`src/growth/size.ts`) shared by plants and jigsaws. 27 boundary values pass, including 14.99, 29.99 and 180.
- **Under 15 minutes no plant or jigsaw:** passes.
- **Garden:**
  - 5 segments, with 167–363 slots each (above 150 in every segment, across 6 layout seeds).
  - 160 plants per segment placed with unique slots.
  - Shuffling keeps every plant's id, species, size, session and minutes; moves only that segment; and keeps slots unique.
  - Plant creation is idempotent per session id.
- **Two garden views** (full plate and segment close-up) exist in `ParadiseScreen` (`view.mode`). Visual check: NOT TESTED on device.
- **Version 1 offline (checked in a browser on 20 Oct 2026):**
  - no external network requests;
  - no membership or ad UI;
  - only the offline legal texts;
  - only bundled pictures in the library.
- **Android target:** targetSdk 36 meets Google Play's requirement for new apps and updates from 31 August 2026 (developer.android.com, page updated 16 Oct 2026).
- **Hindi:** all 702 English text keys translated; no placeholder mismatches.
- **Permissions requested at runtime:** notifications only (when reminders are turned on). There is no accessibility service, usage access, device admin, VPN, overlay or foreground service.
- **Strict focus claims:** honest. The app only fails a session when the person leaves Tame; it does not claim to block other apps or lock the phone. That is consistent with the store listing.
- **Secrets:** no credentials found in the app source. `EXPO_PUBLIC_*` values are public by design.

## 4. Fix status (after the owner's approval, 20 Oct 2026)

| Issue | Status | What changed |
|---|---|---|
| P0-1 screen sleep | **Fixed** (device check still needed) | `ActiveSessionScreen.tsx` keeps the screen awake while a session runs (`expo-keep-awake`, added as a direct dependency at Expo 57's version `~57.0.2`). It is released when the session ends or the screen closes. No permission needed. |
| P0-2 picture rights | **Owner confirmed** | The owner holds the rights to the 104 landscapes and 100 quote cards (recorded in `assets/library/README.md`). Still open: quote attributions are unverified; garden/balcony/museum art provenance. |
| P1-1 app closed mid-session | **Fixed** | Once the free first 10 s are over, a note is written (`storage/activeSession.ts`). Every in-app ending removes it. At the next launch, a leftover note is settled as "left the app": failed history record plus the usual penalty (`settleInterruptedSession`), and a notice in English/Hindi explains it. Group sessions get only the history record (the server settles them). |
| P1-2 data loss on unreadable storage | **Fixed** | New `storage/safeStore.ts`: a failed read *holds* the key (no writes to it this run). Invalid JSON or an unknown schema is copied to `<key>.unreadable` before the key is reused. Used by the garden, spaces, museum, collection, coins and history. History keeps at most 400 records per stored value and moves older ones to archive chunks of 200, so no value grows toward Android's ~2 MB read limit. |
| P1-3 ACTIVITY_RECOGNITION | **Fixed** | Added to `blockedPermissions`; the generated manifest now has `tools:node="remove"` for it. |
| P1-4 phone calls | Open: owner decision | |
| P1-5 release build | Open: needs the owner's Expo login | |
| P2-5 listing "sound" | **Fixed** | "vibration you can turn off" / "वाइब्रेशन जिसे आप बंद कर सकते हैं" |
| Other P2s | Open | Not approved for this round |

## 5. Not verified here

The following were not checked:
- anything on a real phone;
- notification delivery;
- haptics;
- performance;
- process death;
- the release `.aab`;
- signing;
- Play Console state;
- the official Play Console help pages (`support.google.com` could not be reached from this environment).
