# Data inventory (from the code; owner must confirm) — updated 2026-10-20
| Data | Where / why | Shared with | Deleted by Delete account? |
|---|---|---|---|
| Phone number, optional name, language, membership end, sign-up/last-login, app version | Firestore `users/{uid}`; login | Google Firebase (processor) | **Yes** (new) |
| Firebase Auth user | Firebase Auth | Google | **Yes** (new; may ask to sign in again first) |
| Username, avatar, opt-in hashed phone number | `profiles`, `usernames` | Other signed-in users | Yes |
| Online status | `presence` | Friends | Yes |
| Friend relations/requests/blocks, pokes, play requests | `relations`, `pokes`, `playRequests` | The other player | **Yes** (new) |
| Reports filed about the account | `reports` | App owner only | **No** (kept for safety; delete on request) |
| Online room data (seat names, avatars, moves, preset messages) | `rooms/**` | Table players/watchers | Auto-deleted ~6 h later **if you enable the TTL policy** |
| Settings, records, language, ad-free status | Device SharedPreferences (backup off) | — | On uninstall |
| Advertising data | AdMob + UMP: advertising ID, IP, approx. location, interactions | Google | Per Google |
| Subscription | Google Play handles payment; the app reads only whether the subscription is active | Google | Per Google |
| Nearby play | Bluetooth/Wi-Fi discovery, no location stored | Nearby peers | — |
| Analytics / crash SDKs | none found | — | — |
Owner to confirm: legal entity, contact email, privacy-policy and deletion URLs, retention for reports, Firebase region, ad configuration for minors, and every Data safety answer (collected: phone number, user IDs, app interactions, device/other IDs via ads; shared with Google; encrypted in transit; deletion available).
