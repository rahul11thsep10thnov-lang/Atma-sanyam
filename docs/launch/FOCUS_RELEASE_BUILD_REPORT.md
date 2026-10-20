# Release build report: 20 October 2026

| Item | Value | Source / status |
|---|---|---|
| Application ID | `com.atmasanyam.focus` | `app.json` |
| App name | Tame | `app.json` |
| versionName | 1.0.0 | `app.json` |
| versionCode | Assigned by EAS (`appVersionSource: remote`, `autoIncrement: true`) | `eas.json` |
| minSdk / targetSdk / compileSdk | 24 / **36** / 36 | `node_modules/react-native/gradle/libs.versions.toml`, `expo-modules-core` defaults |
| Play requirement (checked 20 Oct 2026) | New apps and updates must target API 36 from 31 Aug 2026 | developer.android.com/google/play/requirements/target-sdk (page updated 2026-10-16): **PASS** |
| Format | Android App Bundle (`buildType: app-bundle`, production profile) | `eas.json` |
| 64-bit | React Native and Expo ship arm64-v8a, armeabi-v7a, x86, x86_64 by default | Not verified without a build |
| Signing | Managed by EAS (upload key held by Expo); Play App Signing expected | **NOT VERIFIED.** Needs the owner's Expo account. No key is in the repo (checked). |
| Production config | Offline v1: `EXPO_PUBLIC_API_URL` must be **unset** and `EXPO_PUBLIC_SUPPORT_EMAIL` set in the EAS `production` environment | Owner action |
| Debug-only code | Expo dev tools and keep-awake run only in development; `expo-dev-client` is debug-only in release builds | By framework design |
| Edge-to-edge | Expo SDK 57 / React Native 0.86 draw edge-to-edge; the app uses safe-area insets | Not verified on a device |

## Build result

**BLOCKED.** No `.aab` was produced, so there is no artifact path and no checksum.

- **Cause 1:** a local Gradle build needs the Android SDK, and `dl.google.com` is refused by this environment's network policy.
- **Cause 2:** an EAS cloud build needs the owner's Expo login.
- **What was verified instead:**
  - JS bundles export for Android and iOS;
  - `expo prebuild --platform android` generates the native project, whose manifest was inspected.

## Owner commands

Run these on your PC, in the project folder:

```
npm install -g eas-cli
eas login
eas env:list --environment production   # check: no EXPO_PUBLIC_API_URL; EXPO_PUBLIC_SUPPORT_EMAIL set
npm run build:android:production         # = eas build --profile production --platform android
```

Then download the `.aab` from the build page on expo.dev. The first upload to Play Console has to be manual (Internal testing → Create release).

## Before the production upload

P0-1 (screen sleep) is fixed in code, and P0-2 (picture rights) is confirmed by the owner. Build a **preview** first (`npm run build:android:preview`, an installable .apk) and check:
- a 25-minute session with the phone left alone;
- closing the app from Recents mid-session, then reopening;
- the reminder notification when leaving.
