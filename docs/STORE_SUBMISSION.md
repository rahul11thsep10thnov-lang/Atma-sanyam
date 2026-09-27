# Building & submitting to Google Play and the App Store

Nothing here has been published yet — these are the steps you perform with your own accounts.

## What's already configured

| | Android | iOS |
|---|---|---|
| App ID | `com.atmasanyam.focus` (package) | `com.atmasanyam.focus` (bundle ID) |
| Name / version | FOCUS / `1.0.0` (`app.json` → `version`) | same |
| Build numbers | `versionCode` auto-incremented by EAS (`appVersionSource: remote`) | `buildNumber` auto-incremented by EAS |
| Icon | Adaptive icon (photo background + themed monochrome layer) | `assets/icon.png` 1024×1024 |
| Splash | `assets/splash-icon.png` on `#FFF3E8` | same |
| Permissions | Internet, vibrate, notifications. Camera, microphone, media-library and overlay permissions are **explicitly removed** (the system photo picker needs none) | Photo-library purpose string only; no camera/microphone |
| Privacy | SecureStore excluded from backups | `PrivacyInfo.xcprivacy` (required-reason APIs + collected data), `ITSAppUsesNonExemptEncryption = false` |
| Devices | Phones | iPhone only (`supportsTablet: false` — no iPad screenshots needed) |
| Account deletion | In-app: Settings → Account → Delete account | same |

> **App name:** store names must be unique. If "FOCUS" is taken, change `expo.name` in
> `app.json` (e.g. "FOCUS – Puzzle Timer") — the bundle IDs don't need to change.
>
> **Bundle IDs are permanent** once published. If you want a different one (e.g. your own
> domain reversed), change `ios.bundleIdentifier` and `android.package` in `app.json` **before**
> your first build.

## Commands

```bash
npm install -g eas-cli        # or prefix every command with npx
eas login
eas init                       # once: creates the EAS project, writes its ID into app.json — commit that change

# Test builds you can install directly
npm run build:android:preview  # .apk — install on any Android phone
npm run build:ios:preview      # ad-hoc build — first run `eas device:create` to register your iPhone

# Store builds
npm run build:android:production   # .aab for Google Play
npm run build:ios:production       # .ipa for the App Store

# Upload
npm run submit:android
npm run submit:ios
```

(`eas build --profile development` makes a development build with the dev menu, useful for testing
push notifications, which don't work in Expo Go.)

Before the first production build, set the app's environment variables on EAS (see
DEPLOYMENT.md §4) — at minimum `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL`.

---

## Google Play

1. **Developer account** — play.google.com/console, one-time $25, identity verification.
   ⚠️ New *personal* accounts must run a **closed test with at least 12 testers for 14 days**
   before production release is unlocked. Start this early. (Organization accounts are exempt.)
2. **Create the app** — Play Console → *Create app* → name, default language, App, Free.
3. **First upload is manual** (Google requirement): run `npm run build:android:production`,
   download the `.aab` from the build page on expo.dev, then Play Console → *Testing → Internal
   testing → Create new release* → upload. EAS manages your upload key; accept **Play App Signing**.
4. **Automate later uploads** — Google Cloud Console → create a service account → JSON key.
   Play Console → *Users and permissions* → invite the service-account email with release
   permissions. Save the key as `secrets/play-service-account.json` (the `secrets/` folder is
   git-ignored) and run `npm run submit:android`; point EAS at the file when asked (or add
   `"serviceAccountKeyPath": "./secrets/play-service-account.json"` under `submit.production.android`
   in `eas.json`). Submissions go to the **internal** track as a **draft**; promote from the console.
5. **Store listing** — short description (≤80 chars), full description, app icon 512×512 (export
   from `assets/icon.png`), feature graphic 1024×500, 2–8 phone screenshots.
6. **App content** (Policy → App content):
   - *Privacy policy URL* — required (same page as `EXPO_PUBLIC_PRIVACY_POLICY_URL`).
   - *Data safety* — Collected: **Email address** (account management; optional), **User IDs**
     (account management), **App interactions** (analytics), **Crash logs / diagnostics**
     (app functionality). Not shared with third parties, not used for ads. Encrypted in transit:
     **Yes**. Users can request deletion: **Yes**.
   - *Account deletion* — Google also requires a **web link** where people can request
     deletion without the app. Publish a short page (e.g. `your-domain.com/delete-account`)
     explaining: open FOCUS → Settings → Delete account, or email support from the account's
     address. Enter that URL here.
   - *Ads*: No. *Target audience*: 13+ (don't select children). *Content rating*: complete the
     questionnaire (no violence/UGC → "Everyone").
   - *Sensitive permissions*: none are requested.
7. **Release** — Internal → Closed testing (12 testers × 14 days if required) → Production.

## Apple App Store

1. **Apple Developer Program** — developer.apple.com, $99/year.
2. **Build** — `npm run build:ios:production`. EAS asks for your Apple ID, registers the bundle ID,
   and creates the distribution certificate + provisioning profile + push key for you.
3. **Upload** — `npm run submit:ios`. EAS can create the App Store Connect app record if it
   doesn't exist, then uploads to TestFlight. (Optionally record the numeric *App Store Connect
   App ID* and *Team ID* under `submit.production.ios` in `eas.json` as `ascAppId` / `appleTeamId`
   to skip the prompts.)
4. **TestFlight** — add yourself as an internal tester and try the build on a real iPhone.
5. **App Store listing** (App Store Connect → your app):
   - Name, subtitle, description, keywords, support URL, privacy policy URL.
   - Screenshots for the 6.9" iPhone display (1320×2868 or 1290×2796); iPad not required.
   - **App Privacy** — declare, all *not used for tracking*:
     Contact Info → Email Address (App Functionality, linked to user);
     Identifiers → User ID (App Functionality, linked);
     Usage Data → Product Interaction (Analytics, linked);
     Diagnostics → Other Diagnostic Data (App Functionality, not linked).
     (Matches the privacy manifest in `app.json`.)
   - **Age rating** questionnaire → 4+.
   - **Export compliance** is pre-answered (standard HTTPS only).
6. **App Review information** — accounts are optional, but give reviewers a test account
   (create one in the app) and mention: "Account deletion: Settings → Account → Delete account."
7. **Submit for review.**

## After release

- Put the store URLs into the admin console → *App configuration* → *App version & update
  notices* (`iosStoreUrl`, `androidStoreUrl`) so update prompts can open the store.
- For each new release: bump `version` in `app.json`, build, submit. Raise *Minimum supported
  version* in the console only when older versions must stop working.
