# Store listing draft: version 1

The full English and Hindi texts (name, short and full description, with character counts checked) are in `docs/STORE_LISTING.md`. The audit checked them against the code.

| Claim in the listing | In the app? |
|---|---|
| Focus timer: turn the dial or type minutes | Yes (multiples of 5) |
| Leaving the app gives a few seconds, then the session fails | Yes (5 s by default) |
| Plant grows / picture reveals tile by tile | Yes |
| One coin per focused minute | Yes |
| Balcony, Paradise Garden (3D, walk/turn/zoom), My Museum, Store | Yes. The garden's visuals were not checked on a device. |
| Library of nature, wildlife, inspirational pictures; own photo | Yes. Rights confirmed by the owner. |
| The longer you focus, the bigger the jigsaw | Yes (7 tiers) |
| Progress: focus time, streaks, longest, week | Yes |
| Offline, no account, no ads, no purchases | Yes (verified offline) |
| Nothing leaves your phone | Yes for the app. Android's own backup may copy data to the user's Google account (P2-6). |
| Morning and night themes, gentle motion | Yes |
| "vibration you can turn off" | Yes (wording fixed: it said "sound and haptics") |
| Optional reminder if you leave mid-session | Yes (needs notification permission) |
| English and Hindi | Yes (702/702 strings) |

**Not claimed (correct):**
- blocking other apps;
- locking the phone;
- health or productivity guarantees;
- user numbers.

## Assets still to make (owner)

Sizes are as documented by Google. `support.google.com` could not be reached from here to re-check them; confirm in Play Console.

| Asset | Requirement |
|---|---|
| App icon | 512 × 512 PNG, up to 1 MB. Export from `assets/icon.png`. |
| Feature graphic | 1024 × 500 PNG or JPEG |
| Phone screenshots | 2–8, PNG or JPEG, 16:9 or 9:16, each side 320–3840 px. Take them from a release build, after P0-1 is fixed. |
| Category | Productivity |
| Contact email | Required |
| Privacy policy URL | Required (offline page, `#privacy`) |
