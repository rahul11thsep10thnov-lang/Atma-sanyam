# Test results: 20 October 2026, `main` @ `628f65a`

No test was skipped, removed or changed. The audit scripts in §3 were run from a scratch folder outside the repository. They import the real app source, with tiny stand-ins for React Native and AsyncStorage, so the logic is real but the phone is not.

## 1. Project checks

| Check | Command | Result |
|---|---|---|
| App typecheck | `npx tsc --noEmit` | **PASS** (local and CI on PR #27, identical tree to `main`) |
| Android and iOS JS bundles | `npx expo export --platform android --platform ios` | **PASS** (CI "Mobile app"); Android export also passed locally |
| Backend unit and integration tests | `cd backend && npm test` (vitest, real Postgres) | **PASS: 105/105**, 8 files (local + CI) |
| Backend typecheck and build | `npm run typecheck && npm run build` | **PASS** |
| Admin console typecheck and build | `cd admin && npm run typecheck && npm run build` | **PASS** |
| Expo doctor | `npx expo-doctor` | **19/21 PASS**; 2 **NOT RUN** (they need `exp.host` / React Native Directory, which this network blocks) |
| Android project generation | `npx expo prebuild --platform android` (scratch copy) | **PASS**: manifest inspected, see the audit |
| Dependency audit | `npm audit --omit=dev` | App: 31 findings in build tooling (1 critical, 19 high); backend: 0; admin: 3 high. See audit P2-8. |
| Release `.aab` build | `eas build -p android --profile production` | **BLOCKED**: no Android SDK download possible here, no Expo login |

## 2. Browser walkthrough (from PR #27, same code)

Offline web build in headless Chromium, 400 × 860:
- **PASS:** no Membership section;
- **PASS:** Coins sheet has no ad box;
- **PASS:** Legal shows 3 offline documents;
- **PASS:** picture library shows bundled pictures (Nature, Wildlife, Inspirational);
- **PASS:** **0 external hosts contacted**.

Online web build against a local API: **PASS**. A report sent from the group lobby was saved with its note, context and group id.

## 3. Audit scripts (scratch folder, not in the repo)

### Reward tiers (`rewards.test.ts`)

| Result | Detail |
|---|---|
| **27/27 PASS** | Minutes 0, 1, 14, 14.99, 15, 16, 29, 29.99, 30, 31, 59, 60, 61, 89, 90, 91, 119, 120, 121, 149, 150, 151, 179, 180, 181, 240 and 600. `sizeForMinutes` (plants) and `tierForMinutes` (jigsaws) both match the 7-tier table. |
| Edge values | NaN → none, −5 → none, Infinity → size 7. The timer cannot produce these. |

### Garden (`garden.test.ts`)

| Check | Result |
|---|---|
| Slots per segment, 6 seeds each | flowers 214–221, trees 317–328, indoor 167–186, fruits 348–363, herbs 306–322 → **all ≥ 150: PASS** |
| 800 plants (160 per segment, mixed sizes 1–7) | all placed, unique slots, none homeless: **PASS** |
| Same session id twice | returns the existing plant, no duplicate: **PASS** |
| Shuffle each segment | ids, species, sizes, sessions and minutes unchanged; 160 still placed; slots unique; other segments untouched; 157–159 plants moved: **PASS (5/5)** |

### Storage damage (`storage.test.ts`)

These are **FAIL**s against the "never lose user data" requirement:
- **Garden:** a truncated stored value loads as an empty garden and the **empty garden is written over the stored one**.
- **Coins:** a failed read returns 0 coins (500 were stored). The next save would store 0.
- **History:** a damaged list plus one new session leaves only the new session.

### Hindi coverage (`i18n.test.ts`)

702/702 keys translated, 0 placeholder mismatches: **PASS**.

### Day streak (`streak.test.ts`)

`computeStats` copied verbatim from `ProgressScreen.tsx`:

| Time zone | Result |
|---|---|
| Asia/Kolkata | 4/4 → **PASS** |
| America/New_York, plain week | **PASS** |
| America/New_York, across DST start and end | expected 4, got 2 → **FAIL** |

### After the approved fixes (`storage2.test.ts`, 15/15 PASS)

| Check | Result |
|---|---|
| Failed garden read | Stored garden untouched; later saves skipped for the run: **PASS** |
| Failed coins read | Stored 500 coins survive a save: **PASS** |
| Damaged history | Kept under `.unreadable`; new session saved: **PASS** |
| 1,000 sessions | All load, unique, in order; largest stored list 400; duplicates from an interrupted move dropped; Clear history removes every part: **PASS** |
| App closed mid-session | Failed `left_app` record; 1 sapling in the right segment; settled once; group → history only; balcony → drooping plant and penalties; no note → nothing: **PASS** |

Earlier checks re-run after the fixes:
- reward tiers 27/27: **PASS**;
- garden and shuffle: **PASS**;
- app `tsc`: **PASS**.

### Browser test of the real app (offline web build, after the fixes)

| Scenario | Result |
|---|---|
| Start a 30-min plant session | No note at 4 s; a note at 12 s |
| Reload (= app killed) | Note gone, history `failed left_app`, garden penalties 0 → 1, no page errors: **PASS** |
| Start, leave at 3 s with ✕, wait 12 s, reload | No note, 0 penalties, no history: **PASS** |
| Generated Android manifest | `ACTIVITY_RECOGNITION` marked `tools:node="remove"`: **PASS** |

## 4. Not tested (no device, emulator or credentials here)

- Timer on a phone:
  - screen lock and screen timeout (see audit P0-1);
  - phone calls;
  - process death;
  - battery saver / manufacturer task killers;
  - time-zone change.
- Notifications:
  - permission prompt;
  - leave-app warning;
  - the notification being cancelled on return.
- Haptics.
- Animations and frame rate.
- Large jigsaws on low-end devices.
- Garden rendering with hundreds of plants.
- Garden touch gestures.
- Accessibility with TalkBack.
- Font scaling.
- Android 7–12 photo picker.
- Upgrade from an older install.
- Android Auto Backup restore.
- Release build, signing, Play pre-launch report.
- Play Billing: not applicable (no purchases in version 1).
