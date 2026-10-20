# Privacy and Data safety: version 1 (offline build)

This applies to a production build **without** `EXPO_PUBLIC_API_URL`. An online build collects much more; see `docs/STORE_SUBMISSION.md` → App content.

## 1. Data inventory (from code)

| Data | Where it is kept | Leaves the phone? |
|---|---|---|
| Session history (start, end, minutes, outcome, picture used) | AsyncStorage `puzzlefocus.history.v1` | No |
| Coins, lifetime minutes, milestones | `focus.rewards.v3` | No |
| Garden, balcony, museum, collection | `focus.paradise.v1`, space and museum keys | No |
| Settings and language | AsyncStorage | No |
| A photo picked for a jigsaw | App storage, through the system photo picker | No |
| Network | None. Every API, analytics, push-token and remote-config call is skipped when no server URL is set (`isBackendConfigured`). The browser test found 0 external hosts. | No |
| Third-party SDKs | Expo modules only. No analytics, crash-reporting or ad SDK; no Firebase config. | No |
| Android Auto Backup | `allowBackup="true"`: Android may copy app data to the user's own Google account backup. Google does not count this as developer collection, but the "lost if uninstalled" sentence in the legal texts should mention it (P2-6). | Only to the user's own backup |

## 2. Permissions in the generated release manifest

| Permission | From | Needed? |
|---|---|---|
| INTERNET | React Native / Expo | Unused offline, but standard and not sensitive |
| VIBRATE | expo-haptics | Yes |
| POST_NOTIFICATIONS | expo-notifications | Yes. Asked only when reminders are turned on. |
| RECEIVE_BOOT_COMPLETED | expo-notifications | Keeps scheduled notifications after a reboot. Harmless. |
| ~~ACTIVITY_RECOGNITION~~ | expo-sensors | Unused; **now removed** via `blockedPermissions` (P1-3) |
| READ/WRITE_EXTERNAL_STORAGE (Android 12 and below) | expo-image-picker, expo-file-system | Probably not (P2-7). Needs a device test before removal. |
| CAMERA, READ_MEDIA_*, RECORD_AUDIO, SYSTEM_ALERT_WINDOW | — | Already removed in `app.json` |

**Not present:**
- accessibility service;
- usage access;
- device admin;
- VPN;
- foreground service;
- full-screen intent;
- exact alarms;
- location;
- contacts.

## 3. Data safety form: proposed answers (owner must confirm)

| Question | Proposed answer | Confidence |
|---|---|---|
| Does the app collect or share user data? | **No** | High for the app code. Owner must confirm no other SDK is added in the build. |
| Ads | **No** | High |
| Account creation | **No** | High |
| Data deletion URL | Not applicable (no data collected) | High |

## 4. Privacy policy

- **Source:** the offline text is in `src/legal/documents.ts` (`OFFLINE_LEGAL_DOCS`).
- **It matches the code**, except:
  - P2-6 (Android backup);
  - its "no sensitive permissions" statement is true now that `ACTIVITY_RECOGNITION` is blocked.
- **Hosting:** not done. Owner runs `tools/legal/build_legal_html.mjs` with `LEGAL_EMAIL` and hosts the page over HTTPS.

## 5. Needs owner confirmation

- Support email (`EXPO_PUBLIC_SUPPORT_EMAIL`, shown publicly).
- Target audience: 13+ is proposed for version 1.
- That no extra SDK is added at build time.
- Picture and quote rights: confirmed by the owner on 20 Oct 2026. Quote attributions and garden-art provenance are still to check.
