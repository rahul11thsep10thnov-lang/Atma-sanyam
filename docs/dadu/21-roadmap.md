# DADU – Technical roadmap

Ten phases, in the order of the master prompt. Each phase ships working functionality, not just
screens; a feature is complete only when its engine, content, tests and performance pass are
done. Architecture is in `01-product-architecture.md`, tables in `17-database-schema.md`,
endpoints in `18-api.md`, assets in `22-assets.md`, costs in `23-costs.md`.

**Assumed team:** two mobile engineers, one backend engineer (shared with the admin console),
one 2D artist / animator, one educational content lead, one voice and audio producer, part-time
QA, part-time project manager. Translators and voice actors are contracted per language.
Timeline totals about 58 weeks of engineering with content produced in parallel; content
volumes (`22-assets.md`) are the real schedule driver and can extend Phases 4–6.

## Status after the v3 implementation pass (November 2026)

The phases below were written for the v2 design stage. The v3 master prompt reorganised the work
into Phases 0–10 (audit, characters, hybrid Miniverse, environments, simulation, engines, stories and
culture, language and audio, assessment and rewards, parent and admin, hardening) and this pass
executed them as parallel workstreams. Where things stand, phase by phase:

| v3 phase | Status | Evidence |
|---|---|---|
| 0 Audit and reconciliation | Done | `IMPLEMENTATION_AUDIT.md`, `00-visual-canon-v3.md`, character alias map |
| 1 Character and visual foundation | Done (vector rigs; no Rive, no PNG exports) | `src/dadu/render/characters`, `CHARACTER_MASTER_REGISTRY.md` |
| 2 Hybrid Miniverse | Done | `src/dadu/render/iso`, `side`, `camera`; `HYBRID_CAMERA_ARCHITECTURE.md` |
| 3 Interactive environments | Done for 32 locations, 167 objects (88 preview-only) | `ENVIRONMENT_MASTER_REGISTRY.md`, `src/dadu/content/objects.ts` |
| 4 Behaviour and simulation | Done (routines, animal needs, plants, time, weather, seasons) | `src/dadu/core/simulation.ts`, tests |
| 5 Educational and activity engines | Done; 52 lessons across the eight sections | `src/dadu/engines`, `CONTENT_COVERAGE_MATRIX.md` |
| 6 Stories, culture, discovery | Done for 12 public-domain stories, temple world, 6 excursions | `src/dadu/content/stories.ts`, `screens/story` |
| 7 Language, voice, audio | Partial: en+hi, device TTS, mixer; no recordings, 12 languages untranslated | `src/dadu/i18n`, `src/dadu/audio`, `ASSET_COMPLETION_MATRIX.md` |
| 8 Assessment, gamification, assignments | Done | `screens/tests`, `engines/rewards`, `screens/assignment` |
| 9 Parent and admin systems | Done (gate, dashboard, screen time, CMS workflow, API) | `screens/parent`, `admin/src/app/(console)/dadu`, `backend/src/dadu` |
| 10 Production hardening | Partial: tests and audits done; store builds, legal texts, device profiling open | `TEST_REPORT.md`, `RELEASE_READINESS.md` |

The v2 phase plan that follows is kept as the detailed reference for what each area was meant to
contain; the week estimates no longer apply.

## Every phase delivers

1. Working functionality on a device (Android reference device, iOS simulator).
2. Updated architecture documentation (`docs/dadu/*` and `docs/ARCHITECTURE.md`).
3. Modified and new file list (in the phase's pull request description).
4. Database changes (a numbered migration, applied in CI).
5. API documentation (`18-api.md` updated, every endpoint tested).
6. Automated tests (backend integration, mobile unit, Maestro flows).
7. Manual testing against the checklist below, both schemes, two languages, two age bands.
8. Performance review against the budget in `01-product-architecture.md` §9.
9. An incomplete-feature report (template at the end).

---

## Phase 1 – Character and Miniverse foundation (6 weeks)

**Goal:** the app opens into an explorable Miniverse with all seven characters alive on screen,
language chosen first, a parent account and a child profile behind consent.

| Item | Detail |
|---|---|
| Functionality | Language selection as the first screen (14 languages, fonts loaded per script); parent OTP sign-in and consent; child profile with age band; the world map; walking the camera through the house exterior, veranda, living room, private garden; the seven characters idle, walking, talking and reacting with Rive state machines; Dadaji's welcome dialogue; the dock (map, sections sheet placeholder, parent gate). |
| Modules | `auth`, `profiles`, `language`, `miniverse`, `characters`, `offline` (core pack loader only) |
| New files | `src/dadu/{auth,profiles,language,miniverse,characters,offline}/**`, `src/dadu/theme/` (palette, fonts), `src/dadu/db/` (expo-sqlite schema), `src/navigation/DaduNavigator.tsx`, `assets/dadu/characters/*.riv`, `assets/dadu/scenes/**`, `backend/src/dadu/{routes,profiles,consent,seeds}/**`, `backend/drizzle/0006_dadu_foundation.sql`, `tools/checks/perf_budget.mjs` |
| Modified files | `App.tsx` (DADU providers), `app.json` (name DADU, slug, bundle ids, fonts, permissions), `package.json` (rive-react-native, expo-sqlite, expo-audio, expo-image, Baloo and Nunito fonts), `src/theme/*` (DADU tokens), `backend/src/app.ts`, `backend/src/database/schema.ts`, `backend/src/database/rbac.ts`, `.github/workflows/ci.yml` |
| Database | Migration 0006: parent columns on `users`, `dadu_languages`, `dadu_consents`, `dadu_child_profiles`, `dadu_characters`, `dadu_media_assets`, `dadu_translations` |
| API | `/v1/dadu/bootstrap`, `/consent`, `/gate/*`, `/children*`, `/characters` |
| Automated tests | Backend: consent gating, gate lock-out, five-profile limit, deletion cascade. Mobile: language store, font map, scene camera maths, character state reducer. Maestro: install → language → sign-in → profile → map → living room. |
| Manual checklist | Every language renders its script and heading font; RTL layout for Urdu; reduce-motion gives static poses; back navigation never strands the child; gate cannot be passed by a child tapping; 2 GB device holds 60 fps with four characters |
| Performance | Cold start, scene fps, memory, bundle size measured and recorded |
| Exit criteria | Prototype parity for the Miniverse, characters and dashboard shell; approved art in the app, not placeholders |

## Phase 2 – Interactive rooms, objects and environments (7 weeks)

**Goal:** every room, the gardens, the library and the temple courtyard exist as scenes, and the
interaction engine turns a tap on any object into a complete activity loop.

| Item | Detail |
|---|---|
| Functionality | All 13 rooms, private garden with planting, watering and persistent growth, public garden, public library, temple courtyard (optional, restricted by default until Phase 6 content), excursion portals (locked); the interaction engine (tap → animation → reaction → hook line → activity → completion → inline check); at least one working activity per room using placeholder lesson content; garden plots persisted in world state; reserved shelter zones on the map |
| Modules | `miniverse`, `interaction`, `gamification` (world state only), `cms` (locations and objects editor), `offline` (scene assets in packs) |
| New files | `src/dadu/interaction/**`, `src/dadu/miniverse/scenes/<location>.ts` (data), `src/dadu/world/**`, `admin/src/app/(console)/dadu/world/**`, `backend/src/dadu/{cms,world}/**`, `backend/drizzle/0007_dadu_miniverse.sql` |
| Database | Migration 0007: locations, objects, object activities, sections, subjects, topics, concepts, content items and versions, workflow transitions, world state, object completions; seeds for the location tree, the eight sections and `10-interactive-object-map.md` |
| API | `/v1/dadu/world*`, `/sections`, `/children/:id/sync/push|pull` (world state and completions), admin world and content routes with the workflow transition endpoint |
| Automated tests | Workflow state machine (every allowed and forbidden transition, permissions), object activity resolution by band and difficulty, world-state merge rules; Maestro: plant a seed, leave, return, plant is still there |
| Manual checklist | Every object responds within 100 ms; no object opens an unrelated screen; Dadaji introduces every room on first entry; growth matches completed activities; temple hidden when restricted |
| Performance | Scene asset sizes per location within budget; memory across ten room changes |
| Exit criteria | Location-to-learning database populated for every object; the console can create and publish a location |

## Phase 3 – Language, character voice and audio systems (5 weeks)

**Goal:** everything spoken, in every launch language, with lip-sync, ducking and offline audio.

| Item | Detail |
|---|---|
| Functionality | Audio engine with three buses, ducking, narration speed, caching; viseme-driven mouth input in Rive; voice profiles per character per language; dialogue sequencing (turn taking, interrupt rules); background music catalogue (flute, piano, santoor, sitar, veena, guitar, ambient, birds, garden, rain, night); volume controls and mute; bilingual and comparison modes; audio packs per section and language; the first two languages fully recorded (English, Hindi) and the other twelve with proofread text and TTS placeholders flagged in the CMS |
| Modules | `audio`, `language`, `characters`, `offline`, `cms` (voice review) |
| New files | `src/dadu/audio/**`, `assets/dadu/music/**`, `backend/src/dadu/{audio,offline/packBuilder.ts}`, `admin/src/app/(console)/dadu/voices/**`, `backend/drizzle/0008_dadu_audio.sql` |
| Database | Migration 0008: voice profiles, packs, pack files, sync cursors |
| API | `/v1/dadu/packs*`, admin translations (bulk, machine draft), media upload with rights metadata, voice profile routes, pack build jobs |
| Automated tests | Pack manifest and delta generation, SHA-256 verification, translation fallback order (`child language → helper → en`), ducking timing (unit), viseme track parser |
| Manual checklist | Music ducks within 250 ms of a line; no audio gap between lines; speeds very slow to very fast intelligible; offline flight-mode run of a full room; Urdu audio and text match |
| Performance | Line start latency; audio pack sizes; memory with cached audio |
| Exit criteria | Any text in the CMS can be heard in-app in English and Hindi within one build cycle |

## Phase 4 – Academic learning (8 weeks)

**Goal:** the lesson engine, the assessment engine's inline checks, and the Academic section's
launch curriculum (languages, mathematics, science, social studies) for A1–A5.

| Item | Detail |
|---|---|
| Functionality | Lesson player with the nine step types; activity components (tap-match, drag-sort, trace, count, sequence, fill-blank, reading with highlight, number line, map pick); age variants and the three speed controls; repeat, simpler, advanced, more examples, break; inline assessment and Dadaji's feedback; Mitthu's Echo revision; Academic section navigation with subject and topic cards; curriculum tagging (NCERT, CBSE, ICSE, IB, Cambridge); the CMS lesson editor with step ordering and preview |
| Modules | `lessons`, `assessment` (inline), `language`, `cms`, `analytics` |
| New files | `src/dadu/lessons/**`, `src/dadu/activities/**`, `src/dadu/assessment/inline/**`, `admin/src/app/(console)/dadu/lessons/**`, `backend/src/dadu/{lessons,assessment}/**`, `backend/drizzle/0009_dadu_learning.sql`, `backend/src/dadu/seeds/academic/**` |
| Database | Migration 0009: lesson steps, lesson progress, assessments, items, item links, attempts, mastery |
| API | `/v1/dadu/content*`, `/children/:id/lessons/*`, `/attempts`, `/next`, `/echo`, `/mastery`; admin steps, assessment items, import |
| Automated tests | Step machine transitions, speed timers, activity scoring per component, mastery update maths, adaptive next-item selection, Echo set construction; Maestro: complete a counting lesson at A1 and a fractions lesson at A4 |
| Manual checklist | Same lesson at A1 and A5 differs in vocabulary, length and assessment type; a wrong answer never shames; Echo appears after the configured interval; curriculum filters correct |
| Performance | Lesson load under 500 ms from local database; memory with media-heavy steps |
| Exit criteria | At least 120 published Academic lessons across bands, each with inline assessment and audio in English and Hindi |

## Phase 5 – Remaining seven learning sections (9 weeks)

**Goal:** STEM, Music, Art, Sports, Nature and Life Skills, Cognitive and Social, Knowledge and
Exploration, each with its own activity components and launch content.

| Item | Detail |
|---|---|
| Functionality | STEM: block-coding canvas, keyboard and mouse trainer, circuit builder, algorithm cards. Music: swar and taal trainer, instrument boards (tabla, harmonium, piano, flute), rhythm games, dance step viewer. Art: drawing canvas with brushes, rangoli and Madhubani pattern tools, origami step viewer, personal gallery (saved on device, synced with consent). Sports: animated demonstrations, timers, balance and stretch guides. Nature: garden biology links, bird and tree identifiers, waste-sorting game, kitchen measurement and nutrition activities. Cognitive: chess, sudoku, mazes, jigsaws, memory, riddles, empathy story choices. Exploration: virtual excursions (museum, forest, mountains, ocean, monuments, space) with Dadaji as guide |
| Modules | `lessons`, `interaction`, `gamification` (gallery), `cms` |
| New files | `src/dadu/activities/{stem,music,art,sports,nature,mind,explore}/**`, `src/dadu/gallery/**`, `src/dadu/excursions/**`, `backend/src/dadu/seeds/<section>/**` |
| Database | Gallery items table (`dadu_gallery_items`: child, asset key, title, created at); excursion content type uses `dadu_content_items` |
| API | `/v1/dadu/children/:id/gallery*` (private, consent for upload), excursion content routes |
| Automated tests | Each activity component's scoring and completion; block-coding interpreter; rhythm timing tolerance; drawing canvas serialisation |
| Manual checklist | Every section has Dadaji's intro, Gopu's question, an animal's part, an activity, feedback, assessment; instruments respond without lag; gallery saves and restores; excursions work offline once packed |
| Performance | Canvas and instrument activities at 60 fps on the reference device; section pack sizes |
| Exit criteria | Every section has at least 40 published lessons across bands; every room object has at least one live activity |

## Phase 6 – Stories and cultural exploration (6 weeks)

**Goal:** Dadaji's Story Corner and the temple courtyard content.

| Item | Detail |
|---|---|
| Functionality | Story player: narration, read-along with word highlight, independent reading, bedtime mode (night palette, slower voice, music fade); character participation lines; vocabulary pop-ups; comprehension questions; multilingual versions; age-wise adaptations; the sixteen collections with public-domain and original retellings first (Panchatantra, Jataka, Hitopadesha, Akbar-Birbal, Tenali Raman, Vikram-Betaal, Gopal Bhar, Nasruddin, Kathasaritsagara, The Jungle Book) and licensed collections only once permissions are recorded in the CMS; temple courtyard: deities and regional traditions, stories, festivals, architecture, bhajans, with history / mythology / belief labelling and the parent restriction |
| Modules | `stories`, `cms` (story editor, copyright workflow step), `audio` |
| New files | `src/dadu/stories/**`, `src/dadu/temple/**`, `admin/src/app/(console)/dadu/stories/**`, `backend/src/dadu/stories/**`, seeds |
| Database | `dadu_story_pages`; copyright permission documents as media assets |
| API | story content routes, bedtime schedule in profile settings |
| Automated tests | Read-along timing alignment, comprehension scoring, copyright gate (publishing a story with `licensed` provenance and no permission document is refused) |
| Manual checklist | Bedtime mode ends with the screen dimmed and no reward prompts; regional traditions reviewed by the cultural reviewer; no tradition misclassified |
| Performance | Page turn under 100 ms; story pack sizes |
| Exit criteria | 60 published stories, 12 temple areas with content, all with provenance recorded |

## Phase 7 – Real-world activities and assignments (4 weeks)

**Goal:** Dadaji's Real World Adventures.

| Item | Detail |
|---|---|
| Functionality | Assignment catalogue by subject; each with Dadaji's introduction, instructions, materials, duration, safety notes, adult-supervision flag, completion confirmation, learning outcome; parent-gated completion with optional note and optional private photo under its own consent; lessons link to related assignments; badges for participation, curiosity and effort |
| Modules | `assignments`, `gamification`, `parents` |
| New files | `src/dadu/assignments/**`, `backend/src/dadu/assignments/**`, private bucket client, seeds |
| Database | `dadu_assignment_completions`, `assignment_photos` consent scope |
| API | §7 of `18-api.md` |
| Automated tests | Consent required for photo upload, signed URL expiry, note length, completion needs gate |
| Manual checklist | No assignment asks for unsupervised or dangerous work (reviewed by the educational lead); photo never required; photo deletion removes the object from storage |
| Exit criteria | 100 published assignments covering every subject in the master prompt list |

## Phase 8 – Assessments and gamification (6 weeks)

**Goal:** the full assessment system and the reward economy.

| Item | Detail |
|---|---|
| Functionality | Daily practice, chapter, subject, weekly, monthly, revision, comprehensive, challenge and Olympiad-style tests; twelve question types including oral, drawing and practical with parent marking; adaptive difficulty; Dadaji as quiz master; mastery dashboard; stars, coins, badges, certificates (PDF), decorations, books, instruments, art supplies, accessories, new areas; the catalogue and inventory; decorating rooms and the garden; no gambling mechanics (no random rewards, no timed scarcity) |
| Modules | `assessment`, `gamification`, `cms` (question bank, rewards) |
| New files | `src/dadu/assessment/**`, `src/dadu/rewards/**`, `src/dadu/decorate/**`, `admin/src/app/(console)/dadu/{questions,rewards}/**`, `backend/src/dadu/{assessment,gamification,certificates}/**` |
| Database | wallets, wallet entries, badges, badges earned, certificates, catalogue, inventory |
| API | §6 and §8 of `18-api.md` |
| Automated tests | Adaptive item selection, score and mastery maths, wallet recomputation from entries, catalogue unlock rules, certificate rendering |
| Manual checklist | A single score never labels the child; feedback is immediate and warm; rewards encourage curiosity and consistency, not grinding; purchases only with in-app coins |
| Exit criteria | 3,000 published assessment items with difficulty and concept tags |

## Phase 9 – Parent dashboard and screen-time controls (4 weeks)

**Goal:** everything a parent needs, behind the gate.

| Item | Detail |
|---|---|
| Functionality | Multiple child profiles; age and difficulty settings; progress and subject-wise performance; screen-time reports; daily limits of 15, 30, 45, 60 or custom; warnings before the limit; weekly reports (in-app and push); break reminders; bedtime schedules; download management; language settings; content restrictions; subscription management (store billing, parent-only); account deletion; privacy controls; data export |
| Modules | `parents`, `screentime`, `profiles`, `offline` |
| New files | `src/dadu/parents/**`, `src/dadu/screentime/**`, `backend/src/dadu/{screentime,reports}/**` |
| Database | screen-time rules, usage sessions, parent notifications |
| API | §9 of `18-api.md`, WebSocket rule push |
| Automated tests | Limit evaluation across midnight and time zones, warning timing, weekly report aggregation, deletion cascade and export completeness |
| Manual checklist | Limit reached mid-lesson saves progress and ends kindly; rules changed on one device apply on the other; export opens and is complete |
| Exit criteria | A parent can run the whole product without support |

## Phase 10 – Admin panel, security, optimisation and release (3 weeks engineering plus review)

**Goal:** the complete CMS, a security review, performance hardening and store release.

| Item | Detail |
|---|---|
| Functionality | Remaining CMS sections (characters, age groups, languages, voices, illustrations, videos, animations, difficulty, background music, notifications, content versions and diff, dashboard of workflow queues); security review (`security-review` pass, dependency audit, penetration test of the gate, consent and photo routes); optimisation on the reference device; store listings, privacy labels, DPDP notice; staged rollout |
| Modules | `cms`, `analytics`, all |
| New files | remaining `admin/src/app/(console)/dadu/**`, `docs/dadu/STORE_LISTING.md`, `docs/dadu/PRIVACY_NOTICE.md` |
| Automated tests | Full CI green; Maestro regression suite on the ten key flows |
| Manual checklist | Every approval step exercised end to end by a non-engineer; both stores' pre-launch reports clean |
| Exit criteria | Public release on Google Play; iOS release when the App Store review passes |

---

## Timeline and dependencies

```
Weeks  0───6────13───18────26─────35────41───45────51────55──58
P1     ██████
P2           ███████
P3                  █████                 (audio recording continues through P6)
P4                       ████████
P5                               █████████
P6                                        ██████
P7                                              ████
P8                                                  ██████
P9                                                        ████
P10                                                           ███
Content production runs from week 4 to release; translation and voice from week 10.
```

- P2 needs P1's scene and character engines. P3 can start its audio engine in parallel with P2
  but needs P2's objects for hook lines.
- P4 needs P3 for spoken lessons; P5 and P6 need P4's lesson engine.
- P7 and P8 are independent of each other and both need P4. P9 needs P8's wallet and P7's
  completion data for reports. P10 needs everything.
- A soft launch with P1–P4 content only (Academic, English and Hindi) is possible at week 26
  for a closed test group.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Content volume (lessons, items, stories, audio in 14 languages) slips the schedule | High | High | Launch with English and Hindi fully recorded; other languages text-first with TTS placeholders clearly marked; CMS machine drafts plus human proofreading; phased language rollout |
| Rive performance on 2 GB devices with many artboards | Medium | High | Limit to five artboards on screen; static poses fallback; measure in Phase 1 before committing art pipeline |
| Copyright for literary collections (Malgudi Days, Ruskin Bond, Satyajit Ray, Sudha Murty, Tagore translations) | High | Medium | Public-domain and original retellings first; licensed collections gated by the copyright step and a stored permission document; legal review before Phase 6 |
| Cultural and religious content errors | Medium | High | Named cultural reviewers per region; history / mythology / belief labelling; optional and parent-restricted section |
| DPDP compliance detail changes | Medium | Medium | Consent versioning; deletion jobs; legal review at Phase 1 and Phase 10 |
| Expo SDK or React Native upgrade during the project | Medium | Medium | Pin SDK 57 for the project; upgrade only between phases with a full regression |
| Pack sizes exceed what budget devices will store | Medium | Medium | Per-section and per-language packs; WebP and Opus; delta updates; storage view for parents |
| The cow's name (Gauri, proposed) changes after recording | Low | Medium | Approve names before Phase 3 recording starts; the key and display names change together in one migration |
| Team size smaller than assumed | Medium | High | Phases are sequential and self-contained; a smaller team lengthens the timeline rather than breaking the plan |

## Incomplete-feature report (template, filled at every phase exit)

```
Phase: <n> – <name>
Date:
Build: <app version> / <API commit>

1. Features complete and verified (device + tests): ...
2. Features with UI but no working engine or content (NOT complete): ...
3. Features started, not finished (what remains, who, estimate): ...
4. Features deferred to a later phase (reason): ...
5. Known defects (severity, repro, owner): ...
6. Performance budget results on the reference device:
   cold start p75/p95, scene fps, memory, bundle size, pack sizes
7. Content counts published in this phase (lessons / items / stories / assignments / audio lines per language): ...
8. Documentation updated: docs/dadu/<files>, docs/ARCHITECTURE.md, docs/API.md
9. Migrations added: ...
10. Decisions needed from the owner: ...
```
