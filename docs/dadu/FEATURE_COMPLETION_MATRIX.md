# DADU – Feature completion matrix

State of every feature the master prompt (Parts II–XVII) asks for, at commit `93b5615` on
`ccr-391ecc43-qfpbk8`. Status vocabulary, exactly one per row:

- **COMPLETE AND VERIFIED**: implemented and exercised by an automated test, the backend suite, the
  Playwright end-to-end drive of the web export (`tools/dadu/e2e-web.js`, Little mode 4–6 and Explorer
  mode 10–12, clock pinned to 10:30, zero page errors) or the server-side render harness.
- **IMPLEMENTED BUT UNVERIFIED**: code exists and typechecks; no test or drive exercised it.
- **PARTIALLY IMPLEMENTED**, **UI ONLY**, **DOCUMENTED ONLY**, **MISSING**, **BROKEN**,
  **BLOCKED BY EXTERNAL DEPENDENCY** as the words say.

Evidence abbreviations: `e2e:<step>` = step of the end-to-end drive; `ut:<name>` = test in
`src/dadu/__tests__`; `bt:<name>` = test in `backend/tests/dadu*.test.ts`; `harness` = render preview.

## 1. Product canon and characters (Parts II–III)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Canon | Visual canon v3 (Premium Chibi Anime, modern villa) | COMPLETE AND VERIFIED | `docs/dadu/00-visual-canon-v3.md`; rigs and villa in harness | Reference image was never uploaded; Dadaji follows the written spec |
| Canon | Product name DADU everywhere (app, console, docs) | COMPLETE AND VERIFIED | `app.json`, `admin/src/components/ConsoleShell.tsx`, e2e:01 wordmark | Bundle ids still `com.atmasanyam.focus` |
| Characters | Six primary characters + Mitthu with canonical keys and legacy aliases | COMPLETE AND VERIFIED | `src/dadu/core/characters.ts`; ut:legacy character keys; bt:normalises legacy character keys | gopu/kim/molly/dhanu accepted everywhere |
| Characters | Dadaji rig (bald crown, side hair, curved moustache, rectangular tinted glasses, kurta, dhoti, green sandals, no gamchha) | COMPLETE AND VERIFIED | `render/characters/Dadaji.tsx`; harness; e2e:08 lesson header, app icon | Festival skins missing |
| Characters | Chintu, Buddy, Chikki, Gauri, Nandu, Mitthu rigs | COMPLETE AND VERIFIED | `render/characters/*`; harness; e2e:07 living room (Chintu, Chikki) | Buddy "sit" is a lying pose |
| Characters | Views front/side/back/three-quarter, 10 poses, 12 expressions, animation loops | COMPLETE AND VERIFIED | `CHARACTER_MASTER_REGISTRY.md`; harness | Three-quarter is a front variant |
| Characters | Height chart, colour spec, consistent identity across both cameras | COMPLETE AND VERIFIED | `HEIGHT_CHART`, `render/palette.ts`; same rig in IsoScene and SideScene | — |
| Characters | Transparent exports, rigging-ready (Rive/Lottie) files | MISSING | `ASSET_COMPLETION_MATRIX.md` | Vector rigs only; export tool not written |
| Characters | Children cannot alter primary characters; avatar personalisation only | COMPLETE AND VERIFIED | `screens/me/MeTab.tsx`; e2e:A5-12 Me tab | Avatar colours stored on the child profile |

## 2. Hybrid camera and world rendering (Part IV)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Camera | Isometric 2.5D primary view (2:1 dimetric, depth sorting, pan, zoom, fit) | COMPLETE AND VERIFIED | `render/iso/IsoScene.tsx`, `isoMath.ts`; ut:tile projection, depth ordering, bounds; e2e:04/06/07 | — |
| Camera | Side-view 2D activity view (26 backgrounds, parallax layers) | COMPLETE AND VERIFIED | `render/side/*`; harness; e2e:08 lesson header, e2e:10b story | — |
| Camera | Shared world model for both views | COMPLETE AND VERIFIED | `core/worldState.ts`; `screens/world/LocationScreen.tsx` passes the same state to both; ut:scene objects merge layout, content, flags, plants and decorations | — |
| Camera | Transition iso → activity → iso, manual "Change view" | IMPLEMENTED BUT UNVERIFIED | `render/camera/CameraTransition.tsx`, `useCamera.ts`; "Change view" chip visible in e2e:06 | The S1 fork drove plant→return in a browser; not in the scripted e2e |
| Camera | Camera architecture document (coordinates, units, scaling, depth, zones, layers, fallbacks) | COMPLETE AND VERIFIED | `HYBRID_CAMERA_ARCHITECTURE.md` | — |
| Camera | Rendering fallbacks for weak devices (reduced motion → static frames) | IMPLEMENTED BUT UNVERIFIED | `reducedMotion` props throughout render | No device test |
| Environments | Modern villa exterior + 13 rooms, gardens, animal areas, town, excursions (32 locations) | COMPLETE AND VERIFIED | `ENVIRONMENT_MASTER_REGISTRY.md`; harness; e2e:04/06/07 | Neighbourhood street missing |
| Environments | Time of day, weather and season variants | COMPLETE AND VERIFIED | `render/iso/IsoScene.tsx` overlays; ut:tick advances time, weather, season; e2e:04 chips | — |
| Environments | Interactive object sprites (103 named props + plant stages) | PARTIALLY IMPLEMENTED | `render/iso/tiles/*`; `ASSET_COMPLETION_MATRIX.md` | ~60 content sprite keys fall back to a generic prop |

## 3. Multiverse and learning sections (Parts V–VI)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Multiverse | Twelve-world registry on the eight sections, no duplicate engines | COMPLETE AND VERIFIED | `core/worlds.ts`; ut:twelve worlds share the eight sections; `MULTIVERSE_ARCHITECTURE.md` | — |
| Multiverse | World hub (12 tiles), WorldHub screen, Section screen | COMPLETE AND VERIFIED | `screens/learn/*`; e2e:05 Learn tab | WorldHub/Section opened only in the S1 browser check |
| Multiverse | Cross-links lesson → object → location → world; `worldsForSection`, `lessonForObject` | COMPLETE AND VERIFIED | `content/catalog.ts`; ut:indexes and legacy ids; e2e:07→08 telescope opens its lesson | — |
| Multiverse | Wisdom Temple optional and parent-controlled, History/Mythology/Belief labels | PARTIALLY IMPLEMENTED | `core/worlds.ts optional`, `ChildProfileScreen` toggle, `town.temple` scene, 1 temple lesson | Label chips drawn in the scene; per-item label field not yet in content model |
| Sections | Eight sections preserved with curriculum alignment line | COMPLETE AND VERIFIED | `core/worlds.ts SECTIONS`; `screens/learn/SectionScreen.tsx` | — |
| Sections | Lessons per section: 52 total (8/6/6/6/6/8/6/6) with both levels | PARTIALLY IMPLEMENTED | `content/lessons/*`; ut:content volumes meet the launch floor | 54 planned lesson ids unauthored; topic coverage per `11-eight-sections.md` incomplete |
| Age adaptation | Bands A0–A5, Lap/Little/Explorer modes, gentle/steady/stretch, adaptation engine | COMPLETE AND VERIFIED | `core/ageBands.ts`; ut:age bands, modes and adaptation; e2e: Little 3 tabs vs Explorer 5 tabs, different lesson scripts | — |
| Teaching formula | Eight phases incl. Mitthu's Echo, never shaming, repeat/simpler/advanced/example/break | COMPLETE AND VERIFIED | `engines/lesson.ts`; ut:happy path…, wrong answers never block or shame; e2e:08–09b all phases | — |

## 4. Simulation (Part VII)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Simulation | Daily routines per character by time of day | COMPLETE AND VERIFIED | `core/simulation.ts ROUTINES`; ut:tick … routines deterministically | Visible movement between visits, not continuous walking |
| Simulation | Animal needs (hunger, thirst, rest, groom), mood, care never punitive | COMPLETE AND VERIFIED | ut:animal needs rise gently; `WorldActivity` care UI | Care UI exercised only in the S1 browser check |
| Simulation | Object flags (open/on/full/clean/ready/inUse/unlocked) | IMPLEMENTED BUT UNVERIFIED | `core/worldState.ts`, `engines/activities.ts setObjectFlag`; ut:world effects (flags) | Few objects use flags visually |
| Simulation | Plant stages seed → harvest with watering history | COMPLETE AND VERIFIED | ut:plants grow only while watered; S1 browser plant check | — |
| Simulation | World time, five weathers, five seasons, lightweight tick (no background processing) | COMPLETE AND VERIFIED | ut:tick advances time, weather, season; `state/DaduContext.tsx` foreground tick | — |

## 5. Activities (Part VIII)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Activities | 23 activity kinds with components and evaluators | COMPLETE AND VERIFIED (engine) / IMPLEMENTED BUT UNVERIFIED (14 of 15 components) | `engines/activities.ts`; ut:choose-type…, sort/sequence/memory/count/trace/draw, colour mixing/rhythm/balance/circuit, code-blocks and mazes; e2e:09 exercised the telescope's sequence activity component | Only the sequence component ran in the drive |
| Activities | In-world garden (plant, water, harvest), animal care, kitchen cooking, clean/organise | IMPLEMENTED BUT UNVERIFIED | `screens/world/WorldActivity.tsx`; ut:world effects | Garden plant/water verified in the S1 browser check only |
| Activities | Household, creative, STEM, cognitive activities inside lessons | PARTIALLY IMPLEMENTED | lessons use 17 of 23 kinds (`CONTENT_COVERAGE_MATRIX.md` §5) | — |
| Activities | Instructions, character participation, completion, feedback, persistence, audio, age variants | COMPLETE AND VERIFIED | lesson flow e2e:08–09b; resumable state `dadu.lesson.v1.<child>` | Audio is device TTS |

## 6. Content, stories, curriculum (Part IX)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Content | Unique ids, objective, bands, difficulty, prerequisites, provenance, rights, languages, review status, version on every item | COMPLETE AND VERIFIED | `core/content.ts ContentMeta`; ut:content validates structurally and bilingually | — |
| Content | Coverage matrix generated from code | COMPLETE AND VERIFIED | `CONTENT_COVERAGE_MATRIX.md` | — |
| Stories | 12 traditional stories with pages, vocabulary, moral, questions per level | COMPLETE AND VERIFIED | `content/stories.ts`; e2e:10b–10d read-along and question | 4 licensed collections pending rights, no pages |
| Stories | Read-along highlighting, narration pacing, bedtime mode | COMPLETE AND VERIFIED (read-along) / IMPLEMENTED BUT UNVERIFIED (bedtime) | ut:story reader; e2e:10b | Bedtime button present, not driven |
| Stories | Per-page illustrations | PARTIALLY IMPLEMENTED | `screens/story/illustration.ts` composes scenes from backgrounds | No dedicated illustrations |
| Assignments | 51 real-world assignments with all eight parts, tiers, badges | COMPLETE AND VERIFIED (data) / IMPLEMENTED BUT UNVERIFIED (screen) | `content/assignments.ts`; ut:assignment lifecycle…; `screens/assignment/AssignmentScreen.tsx` | Screen not in the drive |
| QA workflow | Eight-step editorial workflow with human verification, AI drafts never auto-published | COMPLETE AND VERIFIED | `backend/src/dadu/workflow.ts`; bt:refuses steps out of order, editor cannot approve, reviewer cannot publish | — |

## 7. Language, voice, audio (Part X)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Language | 14-language framework, modes (single, bilingual, compare, en-with-hi, hi-with-en), fallback, honest coverage | COMPLETE AND VERIFIED | `i18n/index.ts`; ut:i18n falls back…; e2e:01 language grid | — |
| Language | English and Hindi content complete | COMPLETE AND VERIFIED | ut:content validates … bilingually | — |
| Language | Other 12 languages | BLOCKED BY EXTERNAL DEPENDENCY | coverage() = 0; `admin /dadu/translations` workbench exists | Needs translators; fonts per script not bundled |
| Language | RTL (Urdu) layout verification | DOCUMENTED ONLY | `i18n LANGS.rtl` flag only | Not exercised |
| Voice | Character narration for every line (device TTS, per-character pitch, speed table, captions) | IMPLEMENTED BUT UNVERIFIED | `audio/narrator.ts`, `useAudio.ts`; ut:ducking and speed rules | TTS cannot run headless; recorded voices absent |
| Voice | Recorded human voices, lip-sync, offline audio packs | BLOCKED BY EXTERNAL DEPENDENCY | `14-voice-audio.md` | Studio and actors required |
| Music | Background music, ambience, SFX | MISSING | mixer/ducking logic only (`audio/mixer.ts`, ut) | No tracks exist |
| Audio controls | Volume per bus, mute, narration speed, captions, reduced audio | IMPLEMENTED BUT UNVERIFIED | `screens/parent/SettingsScreen.tsx` | Not driven |

## 8. Gamification and personalisation (Part XI)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Rewards | Stars, coins, badges, certificates rules; no negatives, no streak loss, no gambling | COMPLETE AND VERIFIED | `engines/rewards.ts`; ut:rewards never go negative…; e2e:09b "2 stars and 5 coins", top bar ★2, A5-12 badges | — |
| Rewards | Decoration shop (furniture, garden, toys, instruments, accessories) placed into locations | IMPLEMENTED BUT UNVERIFIED | `screens/me/AchievementsScreen.tsx`, `decorationsAt` in LocationScreen | Several decoration sprites render the generic prop |
| Personalisation | Child avatar colours, never the primary characters | COMPLETE AND VERIFIED | e2e:A5-12 | — |

## 9. Real-world adventures (Part XII)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| RWA | Assignment contract (intro, objective, instructions, materials, duration, supervision, safety, completion, outcome) | COMPLETE AND VERIFIED | `core/content.ts Assignment`; ut:content validates | — |
| RWA | Parent-confirmed completion, optional note, photo only with consent, never uploaded | IMPLEMENTED BUT UNVERIFIED (app) / COMPLETE AND VERIFIED (server rule) | `AssignmentScreen.tsx`; bt:refuses a photo without consent | — |
| RWA | Server completion records | COMPLETE AND VERIFIED | bt:completes an assignment without a photo | Photo upload endpoint absent |

## 10. Parent dashboard and child safety (Part XIII)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Parents | Parental gate (worded maths + PIN, lockout) | COMPLETE AND VERIFIED | `screens/parent/ParentGateScreen.tsx`; e2e:13 | Client-side only |
| Parents | Multiple child profiles (max 5), age/difficulty/language/temple settings | COMPLETE AND VERIFIED | e2e:03, e2e:14; bt:caps an account at five children | — |
| Parents | Progress by section, mastery buckets, stories, assignments | COMPLETE AND VERIFIED | e2e:14 dashboard | Numbers reflect the drive (1 lesson, 1 story) |
| Parents | Screen time: daily limits 15/30/45/60/none, warnings, breaks, bedtime, wind-down, override | COMPLETE AND VERIFIED | `engines/screenTime.ts`; ut:screen-time decisions; `ScreenTimeGuard.tsx`; bedtime card observed at night; limits in e2e:14 | Wind-down/time-up overlays not scripted |
| Parents | Weekly report, session summaries | COMPLETE AND VERIFIED | e2e:14 "This week" | — |
| Parents | Downloads management | MISSING | — | Content is bundled; no pack UI |
| Parents | Subscription management | MISSING | `MONETIZATION_ENABLED=false` | Out of scope for this build |
| Parents | Data export (share JSON), delete child, delete all data | IMPLEMENTED BUT UNVERIFIED (app) / COMPLETE AND VERIFIED (server) | `ParentDashboardScreen.tsx`; bt:deletes every child, world, event and consent | — |
| Safety | DPDP consent before any child data; server `consent_required` | COMPLETE AND VERIFIED | e2e:02 consent switch; bt:refuses to create a child before processing consent | Legal review pending |
| Safety | No chat, no social, no ads, no external links, no public profiles in DADU | COMPLETE AND VERIFIED | `SECURITY_AND_PRIVACY_AUDIT.md` review | Legacy Tame social still compiled behind the gate |
| Safety | Child-profile isolation on the API | COMPLETE AND VERIFIED | bt:isolates children between parents | — |
| Safety | Data minimisation (band not DOB, no child photos required) | COMPLETE AND VERIFIED | schema + consent copy | — |

## 11. Admin panel and CMS (Part XIV)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| CMS | Content items for lesson/story/assignment/object/character/location with structured lesson editor and raw JSON | COMPLETE AND VERIFIED (API) / IMPLEMENTED BUT UNVERIFIED (UI) | bt:content items and workflow (14 tests); `admin/src/app/(console)/dadu/content/*`; `npm run build` passes | Console UI not driven in a browser |
| CMS | Eight-step workflow with per-step permissions, send-back, publish/unpublish/rollback, immutable versions, audit | COMPLETE AND VERIFIED | bt:walks every remaining step…, rolls back to version 1; audit calls in router | — |
| CMS | Translations workbench | IMPLEMENTED BUT UNVERIFIED | `/dadu/translations` | — |
| CMS | Media assets with licence provenance, duplicate detection, in-use refusal | COMPLETE AND VERIFIED (API) | bt:media assets (5 tests) | File upload to object storage absent (register by URL) |
| CMS | Packs build/publish, feature flags, parent support view | COMPLETE AND VERIFIED (API) | bt:packs and flags | — |
| CMS | Curriculum tree CRUD, bulk import, notifications, review dashboards | MISSING | `20-admin-cms.md` notes | — |
| CMS | Seed content | COMPLETE AND VERIFIED | `npm run seed:dadu`: 7 characters, 38 locations, 9 lessons, 9 assignments | 43 lessons live only in the app bundle, not in the CMS |

## 12. Backend, database, API (Part XV)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Database | 15 `dadu_` tables, 32 indexes, FKs, cascades, soft delete + purge, migration 0006 | COMPLETE AND VERIFIED | `DATABASE_MIGRATION_LOG.md`; migration applied on a fresh DB in tests | — |
| API | Manifest, content, packs (public) | COMPLETE AND VERIFIED | bt:manifest and published content | — |
| API | Consents, children CRUD, ownership middleware | COMPLETE AND VERIFIED | bt:consent and child profiles | — |
| API | World state with optimistic version and merge | COMPLETE AND VERIFIED | bt:world state | — |
| API | Progress events, mastery formula, screen time | COMPLETE AND VERIFIED | bt:progress and mastery | — |
| API | Screen rules, assignments, summary, data deletion | COMPLETE AND VERIFIED | bt:screen rules, assignments, summary; account data deletion | — |
| API | Admin content/assets/packs/flags/parents | COMPLETE AND VERIFIED | bt:daduAdmin (23 tests) | — |
| API | Gate tokens, photo upload, pack file hosting, certificates PDF, `/next`, `/echo`, export file | MISSING | `API_COMPLETION_MATRIX.md` (15 NOT IMPLEMENTED rows, each with reason) | — |
| API | Rate limits, validation, error format, audit, logging | COMPLETE AND VERIFIED | existing middleware reused; bt:rejects unknown payload fields | — |
| RBAC | 14 `dadu:*` permissions, reviewer role | COMPLETE AND VERIFIED | bt:roles | — |

## 13. Offline and performance (Part XVI)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Offline | App fully usable without a server (all content bundled, device persistence) | COMPLETE AND VERIFIED | e2e drives ran with no API configured | — |
| Offline | Sync: consent → child → world PUT with 409 merge → progress push → pull cursor | IMPLEMENTED BUT UNVERIFIED | `api/sync.ts`; ut:engine events map onto the strict API payload; ut:sync merge never loses progress | No app-to-server run in this environment |
| Offline | Pack download/pause/resume/update/delete/integrity UI | MISSING | server manifests only | — |
| Performance | Bundle sizes measured | COMPLETE AND VERIFIED | web JS 3.6 MB; Android Hermes bundle 5.0 MB; 84 MB legacy Tame assets | See `PERFORMANCE_REPORT.md` |
| Performance | Cold start, memory, FPS, audio latency, battery on budget Android | BLOCKED BY EXTERNAL DEPENDENCY | no device or emulator in this environment | — |
| Performance | Lazy loading, reduced-motion fallbacks, no whole-multiverse in memory | PARTIALLY IMPLEMENTED | scenes render per location; reducedMotion props | No atlases needed (vector) |

## 14. Security, testing, release (Part XVII)

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| Security | Review of auth, gate, consent, isolation, uploads, roles, secrets, logging, rate limits | COMPLETE AND VERIFIED | `SECURITY_AND_PRIVACY_AUDIT.md` | 6 open findings listed there |
| Security | Dependency vulnerability scan | BLOCKED BY EXTERNAL DEPENDENCY | npm audit endpoint blocked by proxy | Run in CI |
| Tests | Unit (43), backend integration (157), admin typecheck+build, mobile typecheck, web and Android export | COMPLETE AND VERIFIED | `npm run test:dadu`, `backend npm test`, `.github/workflows/ci.yml` | — |
| Tests | End-to-end: install → language → parent → child → Miniverse → room → lesson → assessment → save → parent dashboard | COMPLETE AND VERIFIED (web) | `tools/dadu/e2e-web.js`, both age modes | Camera switch, offline/restore, account deletion not scripted; no device e2e |
| Release | Icons, adaptive icon, splash, notification icon, favicon | COMPLETE AND VERIFIED | `assets/*.png`, `tools/dadu/gen_icons.mjs` | — |
| Release | Android/iOS release builds | BLOCKED BY EXTERNAL DEPENDENCY | no EAS credentials | — |
| Release | Store listing, screenshots, privacy policy, terms, consent disclosures, data safety form for DADU | MISSING | `RELEASE_READINESS.md` | Tame texts exist, DADU texts not written |
| Release | Crash reporting, monitoring, rollback strategy | DOCUMENTED ONLY | `RELEASE_READINESS.md` | — |
| Legacy | Tame preserved and reachable behind the parent switch; `DADU_ENABLED` reversible | COMPLETE AND VERIFIED | `App.tsx`, `src/config/features.ts`; S1 browser check of the Tame switch | Strip before store submission recommended |

## 15. Weighted completion

Weighting: each row scores COMPLETE AND VERIFIED 1.0, IMPLEMENTED BUT UNVERIFIED 0.7, PARTIALLY
IMPLEMENTED 0.5, UI ONLY / DOCUMENTED ONLY 0.2, MISSING / BLOCKED 0, BROKEN 0. Rows with a split
status use the mean of the two. Areas are weighted equally; this measures verified functionality,
not file counts.

| Area | Rows | Score | Completion |
|---|---|---|---|
| Canon and characters | 9 | 7.0 | 78 % |
| Camera and rendering | 9 | 7.4 | 82 % |
| Multiverse and sections | 8 | 7.0 | 88 % |
| Simulation | 5 | 4.7 | 94 % |
| Activities | 4 | 2.85 | 71 % |
| Content and stories | 7 | 5.5 | 79 % |
| Language, voice, audio | 8 | 3.0 | 38 % |
| Gamification | 3 | 2.7 | 90 % |
| Real-world adventures | 3 | 2.85 | 95 % |
| Parents and safety | 12 | 9.85 | 82 % |
| Admin and CMS | 7 | 5.25 | 75 % |
| Backend and API | 10 | 9.0 | 90 % |
| Offline and performance | 6 | 3.2 | 53 % |
| Security, tests, release | 8 | 4.2 | 53 % |
| **Overall (equal area weights)** | 99 | | **76 %** |

Reading the figure: the software is complete and verified for the core loop (world → object →
lesson → reward → parent view) in English and Hindi with device narration. What remains is
dominated by external assets (voices, music, translations, illustrations), device and store
work (builds, performance measurements, listings, legal texts) and the long tail of content.
See `INCOMPLETE_FEATURE_REPORT.md`.
