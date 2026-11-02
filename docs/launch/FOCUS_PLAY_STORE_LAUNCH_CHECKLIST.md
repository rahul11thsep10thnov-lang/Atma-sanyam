# Launch checklist: 20 October 2026

Status values: PASS · FAIL · BLOCKED · NOT TESTED · OWNER (needs the owner).

## App behaviour

| Requirement | Status | Evidence / next action |
|---|---|---|
| Timer computed from timestamps, not ticks | PASS | `useFocusTimer.ts` |
| Session survives screen timeout in a release build | FIXED, NOT TESTED on a device | Screen kept awake during sessions; confirm on a phone with a 30 s screen timeout |
| Session survives an incoming call | FAIL by design | P1-4. Owner decides. |
| App closed during a session is recorded and penalised | PASS | Scratch tests plus browser test (reload mid-session → failed record, 1 sapling; reload within free 10 s → nothing) |
| Completion fires once; one plant per session | PASS | Code plus test |
| Seven size tiers, < 15 min gives no plant | PASS | 27/27 |
| Garden: 5 segments, ≥ 150 slots each, 2 views | PASS (logic); NOT TESTED (visual) | Test plus code |
| Shuffle moves positions only | PASS | Test, 5/5 segments |
| Saved data never wiped by a read error | PASS | Scratch tests: garden, coins, history; history sharding with 1,000 sessions |
| Coins and rewards written atomically / idempotently | FAIL (minor) | P2-2 |
| Streaks correct across DST | FAIL outside India | P2-1 |
| Offline: no network use | PASS | Browser test, 0 hosts |
| Membership and ads hidden | PASS | Browser test |
| Hindi complete | PASS | 702/702 |
| All visible text translated | FAIL (minor) | P2-3 |
| Device tests (notifications, haptics, performance, TalkBack, font scale) | NOT TESTED | Owner, on phones |

## Policy and Play Console

| Requirement | Status | Evidence / next action |
|---|---|---|
| targetSdk ≥ 36 | PASS | Official page, checked today |
| No sensitive permission without a need | PASS (generated manifest) | `ACTIVITY_RECOGNITION` removed. The final merged manifest is checked only by a real build. |
| Accessibility / usage access / foreground service declarations | PASS (none used) | Manifest |
| Distraction claims match the implementation | PASS | Listing review |
| Rights to all bundled pictures and quotes | OWNER CONFIRMED | Quote attributions and garden-art provenance still for the owner to check |
| Privacy policy accurate | PASS, apart from P2-6 | Text review |
| Privacy policy hosted (HTTPS URL) | OWNER | Generator ready |
| Data safety: "no data collected" | OWNER (proposed) | `FOCUS_PRIVACY_AND_DATA_SAFETY.md` |
| Account deletion | N/A (no accounts in version 1) | |
| Content rating questionnaire | OWNER | Answers proposed in `docs/STORE_SUBMISSION.md` |
| Target audience (13+ proposed) | OWNER | |
| Ads declaration: No | OWNER (verified no ads) | |
| Store texts EN/HI | PASS | `docs/STORE_LISTING.md` (wording fixed) |
| Icon, feature graphic, screenshots | OWNER | |
| Support email | OWNER | |
| Release `.aab` built and signed | BLOCKED | Needs the Expo login (`FOCUS_RELEASE_BUILD_REPORT.md`) |
| Closed testing (12 testers × 14 days for personal accounts created after 13 Nov 2023) | OWNER | Confirm in Play Console. The official help page could not be reached from here. |
