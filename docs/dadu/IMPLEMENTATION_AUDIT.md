# DADU – Implementation audit

Phase 0 audit of the repository as found at commit `c2eed84` (design package) and the state after
this implementation pass. The "Found" column is what existed before any DADU code was written; the
"Now" column is the status at the end of the pass and is kept in step with
`FEATURE_COMPLETION_MATRIX.md`. Status vocabulary (exactly one per row):
COMPLETE AND VERIFIED · IMPLEMENTED BUT UNVERIFIED · PARTIALLY IMPLEMENTED · UI ONLY ·
DOCUMENTED ONLY · MISSING · BROKEN · BLOCKED BY EXTERNAL DEPENDENCY.

## 0. How the audit was done

- Read every directory listed in the master prompt (mobile `src/`, `backend/`, `admin/`, `assets/`,
  `docs/`, `tools/`, `.github/`, `eas.json`, `app.json`, `.env.example`).
- Ran the existing verification: `npx tsc --noEmit` (mobile, clean), `backend: npm run typecheck`
  (clean) and `npm test` against a local PostgreSQL 16 (**105 tests passed**), `admin: npm run
  typecheck` (clean).
- Read the DADU design package (`docs/dadu/00`–`23`, `APPROVAL.md`, `prototype/dadu/index.html`).
- Checked the session uploads for the grandfather reference image: **no file was uploaded**
  (`/mnt/user-data/uploads` is empty). Dadaji is therefore built from the written description in
  the master prompt; see `00-visual-canon-v3.md` section 3.

## 1. What the repository actually contained (found state)

| Area | Found | Evidence |
|---|---|---|
| Mobile app | A complete, working **Tame** focus-timer app (Expo 57, RN 0.86): dial timer, jigsaw reveal, Paradise Garden, balcony, museum, friends, group focus, legal screens, bilingual en/hi UI. No DADU code. | `src/`, `App.tsx`, `src/i18n`, `docs/SPACES.md` |
| Backend | Working Tame API: auth (email, phone OTP), sessions, social, group focus, reports, content library, notifications, analytics, RBAC (3 roles, 18 permissions), audit, migrations 0000–0005, 105 integration tests. No DADU tables or routes. | `backend/src`, `backend/drizzle`, `backend/tests` |
| Admin console | Working Tame console: users, content, categories, config, reports, notifications, analytics, admins, audit. No DADU pages. | `admin/src/app/(console)` |
| Assets | Tame art (balcony, garden sprites, museum, library pictures, icons). No DADU characters, environments or audio. | `assets/` |
| Audio | None (no audio dependency in the mobile app). | `package.json` |
| Tests | Backend only (vitest+supertest); mobile had `tsc` and two `tools/checks` scripts; admin had typecheck + build. | `.github/workflows/ci.yml` |
| Deployment | EAS profiles, Render blueprint for the API, Vercel for the console; bundle ids `com.atmasanyam.focus`; Tame icons and splash. | `eas.json`, `render.yaml`, `app.json` |
| Documentation | Tame docs + the full DADU design package (23 docs, canon, approval list) + the HTML prototype. | `docs/`, `prototype/dadu` |

Conclusion of Phase 0: **every DADU feature was DOCUMENTED ONLY or UI ONLY (HTML prototype)**. The
reusable foundation (Expo app shell, API, console, RBAC, CI) was COMPLETE AND VERIFIED for Tame.

## 2. Feature-by-feature audit

Columns: Found → Now · Location · Tables · APIs · Assets · Tests available / executed · Defects ·
Remaining work · Dependencies · Priority (P0 release-blocking, P1 launch, P2 later).

### 2.1 Foundation and canon

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Visual canon v3 (chibi anime, villa) | DOCUMENTED ONLY → COMPLETE AND VERIFIED (document) | `docs/dadu/00-visual-canon-v3.md` | n/a | Reference image not supplied; adjust Dadaji's head sheet when it arrives | P1 |
| Character registry with legacy aliases (gopu→chintu, kim→buddy, molly→chikki, dhanu→nandu) | MISSING → COMPLETE AND VERIFIED | `src/dadu/core/characters.ts` | `core.test.ts` (executed) | none | P0 |
| Age bands, modes, difficulty, adaptation engine | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `src/dadu/core/ageBands.ts` | `core.test.ts` (executed) | none | P0 |
| Twelve-world registry on the eight sections | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `src/dadu/core/worlds.ts` | `core.test.ts` | none | P0 |
| Location registry (villa, garden, animalia, town, excursions) with legacy `house.*` mapping | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `src/dadu/core/locations.ts` | `core.test.ts` | more neighbourhood locations (shops) are P2 | P0 |
| Shared world state (plants, animals, objects, positions, inventory, rewards, mastery, progress) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `src/dadu/core/worldState.ts` | `core.test.ts` | none | P0 |
| Living-world simulation (time, weather, season, plant growth, animal needs, routines) | DOCUMENTED ONLY → COMPLETE AND VERIFIED (logic) | `src/dadu/core/simulation.ts` | `core.test.ts` | visual verification on device pending | P0 |
| Device persistence and app state provider | MISSING → IMPLEMENTED BUT UNVERIFIED | `src/dadu/state/*` | typecheck only | needs e2e on device | P0 |
| DADU i18n core (14 languages, modes, fallback, coverage) | DOCUMENTED ONLY → PARTIALLY IMPLEMENTED | `src/dadu/i18n/index.ts` | `core.test.ts` | only en and hi tables exist; 12 languages report 0 % coverage honestly | P1 |

### 2.2 Rendering and camera

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Chibi character rigs (7), views, poses, expressions, animation | MISSING → COMPLETE AND VERIFIED | `src/dadu/render/characters/` | render harness (every pose/expression); e2e lesson header, living room | Rive rigs, PNG exports, festival skins | P2 |
| Isometric engine (projection, depth sort, pan, zoom, fit) | MISSING → COMPLETE AND VERIFIED | `src/dadu/render/iso/` | `render.iso.test.ts` (4, executed); e2e map/villa/room | — | — |
| Modern villa exterior and 32 location scenes with time/weather/season | MISSING → COMPLETE AND VERIFIED | `render/iso/villa`, `roomStyles.ts`, `defaultLayouts.ts` | harness; e2e:04/06/07 | neighbourhood street, interiors for greenhouse/workshop | P2 |
| Prop sprite library | MISSING → PARTIALLY IMPLEMENTED | `render/iso/tiles/` (103 props + plant stages) | harness | ~60 content keys use the generic prop | P1 |
| Side-view scenes (26 backgrounds) | MISSING → COMPLETE AND VERIFIED | `render/side/` | harness; e2e lesson and story headers | driveway, festival dressing | P2 |
| Camera transition and `useCamera` | MISSING → IMPLEMENTED BUT UNVERIFIED | `render/camera/` | manual browser check only | add to e2e | P1 |
| Render playground | MISSING → IMPLEMENTED BUT UNVERIFIED | `render/RenderPlayground.tsx`, Me tab link | — | — | P2 |
| Defect found and fixed during e2e | — | `render/iso/IsoScene.tsx` | e2e:09d | `accessibilityRole="button"` on an SVG group rendered an HTML `<button>` inside the SVG, hiding every prop after the first re-render; removed | — |

### 2.3 Multiverse worlds and navigation

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Twelve-world registry on the eight sections | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `core/worlds.ts` | `core.test.ts` | — | — |
| DADU navigator (stack + tabs, 3 tabs Little, 5 Explorer), `DADU_ENABLED` switch, legacy Tame switch | MISSING → COMPLETE AND VERIFIED | `navigation/DaduNavigator.tsx`, `App.tsx`, `config/features.ts` | e2e both modes; Tame switch checked by hand | strip Tame before store build (decision) | P0 |
| Miniverse map tab with daily plan | UI ONLY (prototype) → COMPLETE AND VERIFIED | `screens/world/WorldTab.tsx` | e2e:04 | — | — |
| Location screen (objects from layout + content + world state, taps → lesson/activity/preview) | UI ONLY → COMPLETE AND VERIFIED | `screens/world/LocationScreen.tsx`, `sceneObjects.ts` | `screens.world.test.ts`; e2e:06/07 | — | — |
| Learn hub, World hub, Section screens | UI ONLY → COMPLETE AND VERIFIED / IMPLEMENTED BUT UNVERIFIED | `screens/learn/*` | e2e:05 (hub); hub/section by hand | script in e2e | P1 |
| Excursions (6 side-view scenes with 3 bilingual facts each) | UI ONLY → IMPLEMENTED BUT UNVERIFIED | `screens/world/excursions.ts` | — | — | P1 |
| Wisdom Temple optional, parent toggle | DOCUMENTED ONLY → PARTIALLY IMPLEMENTED | profile toggle, `town.temple` scene, 1 lesson | — | per-item label field, content | P1 |

### 2.4 Simulation

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Time, weather, seasons, routines, plants, animals, tick on foreground | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `core/simulation.ts`, `state/DaduContext.tsx` | `core.test.ts` (3 tests) | visual verification on device | P1 |
| Object flags | DOCUMENTED ONLY → IMPLEMENTED BUT UNVERIFIED | `core/worldState.ts`, `engines/activities.ts` | `engines.activities.test.ts` world effects | few props render flag variants | P2 |

### 2.5 Engines

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Lesson runner (8 phases, variants, break, never shaming) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/lesson.ts` | `engines.lesson.test.ts` (4); e2e full lesson | — | — |
| Activity evaluators (23 kinds) and world effects | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/activities.ts` | `engines.activities.test.ts` (5) | memory scoring per pair | P2 |
| Mastery, assessment builder, 12 question validators | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/mastery.ts`, `assessment.ts` | `engines.mastery.test.ts` (4); e2e A5 daily practice | question banks | P1 |
| Rewards, badges, decorations | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/rewards.ts` | `engines.misc.test.ts`; e2e stars | decoration sprites | P2 |
| Mitthu's Echo | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/echo.ts`, `screens/echo` | `engines.misc.test.ts`; e2e:09b echo phase | standalone Echo screen not driven | P1 |
| Assignments lifecycle, screen time decisions, story reader, sync merge/diff | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `engines/assignments.ts`, `screenTime.ts`, `stories.ts`, `sync.ts` | `engines.misc.test.ts` | — | — |

### 2.6 Content

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| 52 lessons, 12 stories, 51 assignments, 167 objects, en + hi | UI ONLY (9 prototype lessons) → PARTIALLY IMPLEMENTED | `src/dadu/content/` | `content.test.ts` (3, validate + floors) | 54 planned lessons, 88 preview-only objects, 12 languages | P1 |
| Legacy id resolution (`house.*`, `gopu`…) | MISSING → COMPLETE AND VERIFIED | `core/locations.ts`, `content/catalog.ts canonicalObject` | `core.test.ts`, `content.test.ts` | — | — |
| Content in the CMS | MISSING → PARTIALLY IMPLEMENTED | `backend/src/database/seedDadu.ts` (9 lessons) | seed verified | seed the other 43 from the bundle | P1 |

### 2.7 Backend

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Schema (15 tables) and migration 0006 | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `backend/src/database/schema.ts`, `drizzle/0006_dadu.sql` | suite applies it on a fresh DB; 157 pass | — | — |
| Public API (manifest, content, packs, consents, children, world, progress, assignments, screen, summary, delete) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `routes/public/dadu.ts`, `services/daduService.ts` | `dadu.test.ts` (29) | gate token, photo upload, `/next`, `/echo`, export, certificates | P1 |
| Admin API (content workflow, assets, packs, flags, parents) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `routes/admin/dadu.ts`, `dadu/workflow.ts` | `daduAdmin.test.ts` (23) | pack file hosting | P2 |
| RBAC additions, reviewer role | MISSING → COMPLETE AND VERIFIED | `database/rbac.ts` | `admin.test.ts`, `daduAdmin.test.ts` roles | — | — |
| Cleanup purge of soft-deleted children | MISSING → IMPLEMENTED BUT UNVERIFIED | `database/cleanup.ts` | — | add a test | P2 |

### 2.8 Admin console

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| DADU overview, content list/editor with workflow and versions, translations, assets, packs, flags, parent support (8 routes) | MISSING → IMPLEMENTED BUT UNVERIFIED (UI) over a COMPLETE AND VERIFIED API | `admin/src/app/(console)/dadu/*`, `components/dadu/*` | typecheck + production build pass | browser e2e, file upload, bulk import | P1 |

### 2.9 Parent, safety and privacy

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Onboarding: language, parent consent + PIN, child profile | UI ONLY → COMPLETE AND VERIFIED | `screens/onboarding/*` | e2e:01–03 | — | — |
| Parental gate, parent dashboard, settings | UI ONLY → COMPLETE AND VERIFIED (gate, dashboard) / IMPLEMENTED BUT UNVERIFIED (settings) | `screens/parent/*` | e2e:13–14 | settings drive | P1 |
| Screen-time guard (wind-down, break, time-up, bedtime, override) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `screens/world/ScreenTimeGuard.tsx` | `engines.misc.test.ts`; bedtime card observed | script overlays | P1 |
| Consent enforcement, child isolation, data deletion | DOCUMENTED ONLY → COMPLETE AND VERIFIED | API routes | `dadu.test.ts` | legal review | P0 |
| Security audit | MISSING → COMPLETE AND VERIFIED (document) | `SECURITY_AND_PRIVACY_AUDIT.md` | — | 6 findings open | P1 |

### 2.10 Audio and language

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Mixer rules, ducking, speeds | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `audio/mixer.ts` | `audio.test.ts` (2) | — | — |
| Narration via device TTS with per-character pitch, captions | MISSING → IMPLEMENTED BUT UNVERIFIED | `audio/narrator.ts`, `useAudio.ts` | headless cannot play audio | device check; recorded voices | P1 |
| Music, ambience, SFX assets | MISSING → MISSING | — | — | composer/licensing | P1 |
| 14-language framework, en + hi tables | DOCUMENTED ONLY → PARTIALLY IMPLEMENTED | `i18n/index.ts` | `core.test.ts` coverage | 12 languages, fonts, RTL | P1 |

### 2.11 Offline and sync

| Feature | Found → Now | Location | Tests | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Offline-first app (bundled content, device persistence, resumable lesson) | DOCUMENTED ONLY → COMPLETE AND VERIFIED | `state/persistence.ts`, `DaduContext.tsx`, `LessonScreen` | e2e ran with no server | restore test | P1 |
| Sync service and API client | DOCUMENTED ONLY → IMPLEMENTED BUT UNVERIFIED | `api/client.ts`, `api/sync.ts`, `syncMapping.ts` | `screens.world.test.ts` payload mapping; server side `dadu.test.ts` | live run | P1 |
| Packs (manifests) | DOCUMENTED ONLY → PARTIALLY IMPLEMENTED | server build/publish | `daduAdmin.test.ts` | download UI, binaries | P2 |

### 2.12 Testing and release

| Feature | Found → Now | Location | Tests executed | Remaining / notes | Pri |
|---|---|---|---|---|---|
| Unit tests (mobile) | none → 43 passing | `src/dadu/__tests__/`, `npm run test:dadu` | yes | more drives | P1 |
| Backend integration | 105 → 157 passing | `backend/tests/` | yes | — | — |
| Admin build | passing → passing with 8 DADU routes | `admin` | yes | — | — |
| CI | mobile tsc + export → plus `test:dadu` | `.github/workflows/ci.yml` | not run here (no CI in this environment) | npm audit step | P0 |
| End-to-end (web) | none → two full drives, zero errors | `tools/dadu/e2e-web.js` | yes | device e2e, more branches | P1 |
| Icons, splash, favicon | Tame → DADU | `assets/`, `tools/dadu/gen_icons.mjs` | rendered and inspected | — | — |
| Release builds, store texts, privacy policy, legal review, device performance | MISSING → BLOCKED BY EXTERNAL DEPENDENCY / MISSING | `RELEASE_READINESS.md` | — | credentials, counsel, device | P0 |

## 3. Summary

Every DADU feature that was DOCUMENTED ONLY at the start now has code behind it; the core loop is
COMPLETE AND VERIFIED end to end on the web export in both interface modes, and the server side is
covered by 52 integration tests. The weighted completion in `FEATURE_COMPLETION_MATRIX.md` is
76 percent; the remainder is listed item by item in `INCOMPLETE_FEATURE_REPORT.md` (10 P0 release
mechanics, 31 P1, 16 P2).
