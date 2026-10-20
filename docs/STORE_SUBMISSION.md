# Building & submitting to Google Play and the App Store

Nothing here has been published yet — these are the steps you perform with your own accounts.

## What's already configured

| | Android | iOS |
|---|---|---|
| App ID | `com.atmasanyam.focus` (package) | `com.atmasanyam.focus` (bundle ID) |
| Name / version | Tame / `1.0.0` (`app.json` → `version`) | same |
| Build numbers | `versionCode` auto-incremented by EAS (`appVersionSource: remote`) | `buildNumber` auto-incremented by EAS |
| Icon | Adaptive icon (photo background + themed monochrome layer) | `assets/icon.png` 1024×1024 |
| Splash | `assets/splash-icon.png` on `#FFF3E8` | same |
| Permissions | Internet, vibrate, notifications. Camera, microphone, media-library and overlay permissions are **explicitly removed** (the system photo picker needs none) | Photo-library purpose string only; no camera/microphone |
| Privacy | SecureStore excluded from backups | `PrivacyInfo.xcprivacy` (required-reason APIs + collected data), `ITSAppUsesNonExemptEncryption = false` |
| Devices | Phones | iPhone only (`supportsTablet: false` — no iPad screenshots needed) |
| Account deletion | In-app: Settings → Account → Delete account | same |

> **App name:** store names must be unique. If "Tame" is taken, change `expo.name` in
> `app.json` (e.g. "Tame – Puzzle Timer") — the bundle IDs don't need to change.
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
DEPLOYMENT.md §4). For **version 1 (offline)** that is only `EXPO_PUBLIC_SUPPORT_EMAIL`; an online
build also needs `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL`.

---

## Version 1: offline only

Version 1 ships **without the server**: no accounts, no friends, no analytics, no push, no
membership and no ads. Everything stays on the phone. This is decided by the build, not by a
setting people can change:

- **Leave `EXPO_PUBLIC_API_URL` unset** in the EAS `production` environment. Without it the app
  hides sign-in, the Friends tab, the bell, analytics and announcements, makes no request for
  content (the picture library shows only the pictures inside the app), and Settings → Legal
  shows the offline Terms, Privacy Policy and Subscription & Refund Policy.
- **Set `EXPO_PUBLIC_SUPPORT_EMAIL`** — it is the contact address in the legal documents and the
  *Contact support* row in Settings.
- Membership and the "watch an ad for coins" box are switched off in `src/config/features.ts`
  (`MONETIZATION_ENABLED = false`). Keep it off until real Google Play Billing and a real ad
  network are added — the current ones are placeholders.

**Privacy policy page** — `LEGAL_EMAIL=you@your-domain.com node --experimental-strip-types tools/legal/build_legal_html.mjs`
(offline is the default; `LEGAL_MODE=online` builds the full set), host `docs/legal/index.html`
over HTTPS and use `<url>#privacy` as the *Privacy policy URL*.

**Play Console → App content, for version 1:**

| Question | Answer |
|---|---|
| Privacy policy | `<your page>#privacy` |
| Ads — does your app contain ads? | **No** |
| App access | All functionality is available without special access |
| Content rating questionnaire | Category *Utility, productivity, communication or other*. Violence, sexuality, language, drugs, gambling: **No**. Do users interact or exchange content? **No**. Shares location? **No**. Digital purchases? **No**. (Expect the lowest rating, e.g. *Everyone / 3+*.) |
| Target audience | **13–15, 16–17 and 18+** (do **not** tick any age under 13, which would bring in the Families policy). The legal texts say 13+ for this version. |
| Data safety → Does your app collect or share any of the required user data types? | **No.** Nothing is sent off the phone: history, plants, coins and settings are stored only in the app's private storage, and a photo picked for a jigsaw comes through the system photo picker and stays on the device. (Google may ask for the "encrypted in transit" and "deletion" questions only if you answer Yes.) |
| Data deletion / account deletion URL | Not required: the app has no accounts. |
| Government, financial, health, news app declarations | **No** to each |
| Sensitive permissions | None (camera, microphone, media and overlay permissions are removed in `app.json`) |
| Store listing | Use `docs/STORE_LISTING.md` (English and Hindi) |

When a later version turns on the server, switch to the online answers below, publish the
online legal page (`LEGAL_MODE=online`), and re-do Data safety, Target audience (18+) and the
content rating (users interact) **before** that version is released.

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
6. **App content** (Policy → App content) — for an **online** build (with `EXPO_PUBLIC_API_URL`).
   For version 1, use the offline table above instead.
   - *Privacy policy URL* — required (same page as `EXPO_PUBLIC_PRIVACY_POLICY_URL`).
   - *Data safety* — Collected (all optional: the app works without an account):
     **Phone number** and **Email address** (account management; email only for older accounts),
     **Name** (optional display name), **User IDs** (username, account id), **Other in-app
     messages** (the fixed group-chat phrases), **App interactions** and **Crash logs /
     diagnostics** (analytics, which people can switch off in Settings → Privacy), **Device or
     other IDs** (random install id, push token). *Not* collected: location, photos, contacts,
     camera/microphone (the photo picker hands over only the photo someone chooses, and it stays
     on the device). Not shared with third parties for their own use, not used for ads.
     Encrypted in transit: **Yes**. Users can request deletion: **Yes**. If you count reports
     ("Report this person": reason, optional note) as data, they fall under **Other in-app messages**
     / *Safety, security and compliance*.
   - *Policies* — the five documents in the app (Settings → Legal) come from
     `src/legal/documents.ts`. For the public links Google asks for, run
     `LEGAL_MODE=online LEGAL_EMAIL=you@your-domain.com node --experimental-strip-types tools/legal/build_legal_html.mjs`,
     host `docs/legal/index.html` over HTTPS, and use `<url>#privacy` as the *Privacy policy URL*
     and `<url>#deletion` as the account-deletion link below. Also set `EXPO_PUBLIC_SUPPORT_EMAIL`
     (it is the contact address shown in the documents). The online documents say the app is for
     people aged 18+, that there are no paid features or ads, and that people can be reported from
     the Friends tab and the group lobby (reviewed in the admin console → *Reports*): keep the
     store listing, Data safety form and app in line with that, or change the text.
   - *Account deletion* — Google also requires a **web link** where people can request
     deletion without the app. Publish a short page (e.g. `your-domain.com/delete-account`)
     explaining: open Tame → Settings → Delete account, or email support from the account's
     address. Enter that URL here.
   - *Ads*: No. *Target audience*: 18+ only (don't select children). *Content rating*: complete the
     questionnaire and say users can interact (friends, pokes, preset chat), which raises the
     rating a little.
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
