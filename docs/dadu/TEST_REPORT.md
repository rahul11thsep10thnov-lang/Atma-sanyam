# DADU – Test report

Date: 2026-11-03. Branch `ccr-391ecc43-qfpbk8`, head `93b5615`. Environment: Linux container,
Node 22.23, npm 10.9, PostgreSQL 16.15 (local cluster started for the run), Playwright Chromium
(pre-installed). No Android or iOS device or emulator was available.

## 1. What was executed

| Suite | Command | Result | Notes |
|---|---|---|---|
| Backend integration (Tame + DADU) | `cd backend && TEST_DATABASE_URL=postgres://focus:focus-ci@localhost:5432/focus_test npm test` (vitest + supertest against a real database) | **10 files, 157 tests passed, 0 failed** (about 25 s) | 105 pre-existing Tame tests, `tests/dadu.test.ts` 29, `tests/daduAdmin.test.ts` 23. One Tame assertion updated for the new `reviewer` role. |
| Backend typecheck and build | `npm run typecheck && npm run build` | Clean | Migration `0006_dadu.sql` applied on a fresh database; `npm run seed:dadu` verified idempotent (63 items). |
| Admin console | `cd admin && npm run typecheck && NEXT_TELEMETRY_DISABLED=1 API_URL=http://localhost:4000 npm run build` | Clean; production build lists the nine `/dadu*` routes | No browser tests for the console. |
| Mobile typecheck | `npx tsc --noEmit` (repo root, strict) | Clean | Covers Tame and DADU code. |
| Mobile unit tests | `npm run test:dadu` (`tsc -p tsconfig.dadu-tests.json` then `tsx --test "src/dadu/**/*.test.ts"`) | **43 passed, 0 failed** (under 2 s) | Pure modules only; no React Native rendering. |
| Web bundle | `EXPO_NO_TELEMETRY=1 npx expo export --platform web` | Succeeds; 3.6 MB main JS | Used as the e2e target. |
| Android bundle | `EXPO_PUBLIC_API_URL=https://api.example.com npx expo export --platform android` | Succeeds; 5.0 MB Hermes/JS, 84 MB assets | Size only; not run on a device. |
| End-to-end (web) | `node tools/dadu/e2e-web.js <export-dir> A2` and `... A5` | **Both runs complete, zero page or console errors** | See section 3. |

## 2. Unit and integration coverage by suite

### Mobile (`src/dadu/__tests__`)

| File | Covers |
|---|---|
| `core.test.ts` (7) | Legacy character keys resolve to the canonical six; age bands, interface modes and the adaptation engine (clamped to one band, difficulty and mastery); twelve worlds reference the eight sections and known locations; plant growth only while watered and never regressing; animal needs rising gently and care resetting them; deterministic tick of time, weather, season and routines (held characters stay put); i18n fallback primary → helper → English and honest coverage. |
| `audio.test.ts` (2) | Ducking of music and ambience under voice, sfx unducked, mute, reduced-audio; ambience keys by time and weather; narration speeds allowed per band. |
| `render.iso.test.ts` (4) | Tile to screen projection round-trips, depth ordering and tile polygons, scene bounds, fit and clamp, walk paths and facing. |
| `engines.lesson.test.ts` (5) | Phase mapping onto the eight-step formula; happy path to two stars; wrong answers retry without blocking or shaming (one star, 0.6 weight); simpler/advanced/example variants and repeat counter; `applyLessonResult` grants once and queues Mitthu's Echo. |
| `engines.activities.test.ts` (5) | Every activity kind's evaluator (choose, sort, sequence, memory, count, trace, draw, colour mixing, rhythm, balance, circuit, code-blocks interpreter, mazes) and world effects (plant, water, harvest, animal care, object flags, inventory refill, cooking). |
| `engines.mastery.test.ts` (4) | Exponential mastery update with difficulty weights, mastery states and spaced revision, next-difficulty rule, assessment set ordering (due, weak, new) and validation of the twelve question kinds. |
| `engines.misc.test.ts` (5) | Rewards never negative and badges from the catalogue; screen-time decisions (ok, wind-down, time-up, bedtime, break); sync merge never loses progress and diff gives stable client ids; assignment lifecycle, supervision gating and photo consent; story reader sentences, pages, bedtime pacing, questions. |
| `content.test.ts` (3) | `catalog.validate()` passes (structure, host objects, locations, en+hi on every string); launch volumes (52 lessons, 12 stories, 51 assignments, 167 objects); indexes and legacy id resolution. |
| `screens.logic.test.ts` (4) | Trace coverage scoring, sort zones and rhythm spec, grid and program parsing, story illustration mapping. |
| `screens.world.test.ts` (3) | Scene object merge of layout, content, world flags, plants and decorations; object tap resolution (lesson, world activity or preview); engine events mapped onto the strict API payload. |

### Backend (`backend/tests`)

| File | Covers |
|---|---|
| `dadu.test.ts` (29) | Manifest and published content without auth (languages, flags, packs, catalogue; published-only filtering; canonical character keys and both languages; 404 for unknown or unpublished); consent and child profiles (token required, consent before first child, validation, list/read/patch, isolation between parents, five-child cap, soft delete freeing a slot, single withdrawal); world state (404 then version 1, version increment, 409 with merged copy on stale version, malformed rejected, legacy keys normalised); progress and mastery (idempotent per client id, formula and intervals, reaching mastered, paging, strict payload, screen-time minutes); screen rules, assignment completion with and without photo consent, parent summary; account data deletion cascading everything. |
| `daduAdmin.test.ts` (23) | Reviewer role permissions; content body validation per kind; draft creation with audit; drafts invisible to the app; edit and submit; refusal of edits in review and of out-of-order steps; editor cannot approve, reviewer can; send-back and resubmit; all eight steps to approved; reviewer cannot publish, publisher can; new draft version while version 1 stays live; version 2 publish then rollback to 1; unpublish; list filters and read permissions; the other kinds (object, character, location, story, assignment); media assets with rights metadata, attribution rule, bad hashes, sha256 duplicates (409), editor forbidden, in-use delete refusal; pack build and publish; feature flags in the manifest; parent support view limited to support staff. |

## 3. End-to-end drive (web export, Playwright Chromium, 400 × 860, clock pinned to 10:30 local)

Harness: `tools/dadu/e2e-web.js`. Screenshots are written to `./e2e-shots`. Steps and results:

| # | Step | A2 (Little mode) | A5 (Explorer mode) |
|---|---|---|---|
| 1 | Language selection screen renders fourteen languages; choose English | Pass | Pass |
| 2 | Parent setup: consent switch, 4-digit PIN, confirmation | Pass | Pass |
| 3 | Child profile: band chip, difficulty, save | Pass | Pass |
| 4 | Miniverse map renders characters and places; three large tabs in Little mode, five in Explorer | Pass | Pass |
| 5 | Learn tab shows the twelve worlds and Dadaji's suggestion | Pass | Pass |
| 6 | Villa exterior isometric scene | Pass | Pass |
| 7 | Living room: sprites, glows, Dadaji, Chintu, Chikki | Pass | Pass |
| 8 | Tap the telescope → lesson opens with phase bar 1/8 | Pass | Pass |
| 9 | All eight phases: four dialogues, tap-target activity, feedback, quiz (a separate run took the wrong-then-right path), Mitthu's Echo repeat | Pass | Pass |
| 10 | Completion card "2 star and 5 coins"; map header shows ★ 2 | Pass | Pass |
| 11 | Story Corner lists stories for the band | Pass | Pass |
| 12 | "The Monkey and the Crocodile": four pages, read-along highlight, vocabulary chips, comprehension question, "Story complete" | Pass | Pass |
| 13 | Tests tab: daily practice, three items, result card "3 of 3 right", concepts marked Secure | n/a (tab hidden by design) | Pass |
| 14 | Me tab: avatar colours, badges, stars and coins | n/a | Pass |
| 15 | Parent lock → maths gate → PIN → parent dashboard (screen time, limits, bedtime, breaks, weekly chart, progress by section) | Pass | Pass |
| 16 | Console and page errors during the run | 0 | 0 |

Also observed: with the real clock at night local time the bedtime guard card ("Bedtime, beta. See you in the morning. All your progress is saved. Parent: 15 more minutes") blocked the tabs as designed.

Defect found and fixed during e2e: `accessibilityRole="button"` on SVG groups made react-native-svg on web emit `<button>` inside `<svg>`, which blanked every sprite after a re-render (commit `93b5615`). Regression check: the map and rooms keep their sprites after returning from a lesson.

## 4. Known failures

None in the executed suites.

## 5. Gaps

- No tests on a real Android or iOS device or emulator (rendering performance, touch, TTS voices, AsyncStorage limits).
- No iOS run at all.
- Sync was not exercised against a live API in the e2e run (the web drive runs with no `EXPO_PUBLIC_API_URL`); sync merge and event mapping are covered by unit tests, the server side by integration tests.
- Only English (UI and e2e) and Hindi (unit tests on strings) are tested; the other twelve languages have no content and no tests.
- No screen-reader or accessibility audit run; only labels and roles were added by code review.
- The admin console has type and build checks only, no browser tests.
- No load or soak tests on the API.
- No `npm audit` (registry endpoint blocked in this environment).

## 6. How to re-run everything

```bash
# PostgreSQL (once per machine)
service postgresql start
su postgres -c "psql -c \"CREATE USER focus WITH PASSWORD 'focus-ci' SUPERUSER;\""
su postgres -c "createdb -O focus focus_test"

# Backend
cd backend && npm ci && npm run typecheck && \
  TEST_DATABASE_URL=postgres://focus:focus-ci@localhost:5432/focus_test npm test && npm run build

# Admin console
cd ../admin && npm ci && npm run typecheck && \
  NEXT_TELEMETRY_DISABLED=1 API_URL=http://localhost:4000 npm run build

# Mobile
cd .. && npm ci && npx tsc --noEmit && npm run test:dadu

# Web export and end-to-end drive (both bands)
EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir /tmp/dadu-web
node tools/dadu/e2e-web.js /tmp/dadu-web A2
node tools/dadu/e2e-web.js /tmp/dadu-web A5

# Android bundle size
EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_URL=https://api.example.com \
  npx expo export --platform android --output-dir /tmp/dadu-android && du -sh /tmp/dadu-android
```

CI (`.github/workflows/ci.yml`) runs the backend tests, the admin build, the mobile typecheck,
`npm run test:dadu` and the Android/iOS bundle exports on every push.
