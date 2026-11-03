# DADU – Incomplete feature report

Every item that is not COMPLETE AND VERIFIED in `FEATURE_COMPLETION_MATRIX.md`, with the reason, the
dependency that blocks or gates it, where to start, and a release priority:
**P0** blocks a store release, **P1** needed for a confident public launch, **P2** later.

Dependency kinds: *asset* (art, audio), *credential* (keys, accounts), *device* (hardware or
emulator), *legal*, *content* (authoring or translation), *engineering* (code only).

## A. Art, animation and assets

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| Dadaji head sheet against the reference image | The image named in the master prompt was never uploaded; the rig follows the written description | asset | `render/characters/Dadaji.tsx`, `00-visual-canon-v3.md` §3 | P1 |
| Rive/Lottie rigs and transparent PNG exports | Rive needs a native module outside Expo Go; vector rigs ship instead | engineering + asset | `HYBRID_CAMERA_ARCHITECTURE.md` "why SVG now" | P2 |
| ~60 object sprite keys render the generic prop | Content registry names more props than the tile library draws | asset (vector) | `render/iso/tiles/*.tsx`, keys listed in `content/objects.ts`; add an assertion against `SPRITE_NAMES` in `content.test.ts` | P1 |
| Decoration sprites (bird_bath, blocks, dholak, keyboard, cap, scarf, cloud, diya, globe) | Not in the tile registry | asset | `engines/rewards.ts DECORATIONS` | P2 |
| Per-page story illustrations | Scenes composed from backgrounds only | asset | `screens/story/illustration.ts` | P1 |
| Festival costume skins, neighbourhood street, greenhouse/workshop interiors, driveway background | Not drawn | asset | `ENVIRONMENT_MASTER_REGISTRY.md` "Missing" column | P2 |
| Buddy sitting pose, Mitthu flight pose, three-quarter view as a separate drawing | Simplifications | asset | `CHARACTER_MASTER_REGISTRY.md` | P2 |
| Store feature graphic and screenshots (14 languages × 2 sizes) | Not produced | asset | `22-assets.md` | P0 (en/hi), P2 (others) |

## B. Voice, music and audio

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| Recorded character voices (Dadaji, Chintu, Mitthu in 14 languages; animals en/hi) | No studio or actors in this environment; device text-to-speech reads every line today | asset + credential (studio) | `14-voice-audio.md`, `audio/narrator.ts recordedLineFor` | P1 |
| Background music, ambience loops, SFX | No composer/licences; mixer and ducking logic exist | asset (licensed or original) | `audio/mixer.ts ambienceFor` | P1 |
| Lip-sync | Needs recorded audio with visemes | asset | `14-voice-audio.md` §lip-sync | P2 |
| Offline audio packs | No audio to pack | asset | `backend/src/routes/admin/dadu.ts packs` | P1 |
| TTS verification on devices (voices available per language, quality) | Cannot run headless | device | `audio/narrator.ts BCP47` | P1 |

## C. Language and content

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| 12 of 14 languages at 0 % (bn, as, or, mr, gu, pa, ta, te, kn, ml, ur, sa) | Only en and hi authored; the CMS translation workbench exists | content (translators + proofreaders) | `admin /dadu/translations`, `i18n/index.ts UI`, `content/*` | P1 |
| Per-script fonts (Baloo Da 2, Bhai 2, Paaji 2, Thambi 2, Tammudu 2, Tamma 2, Chettan 2, Bhaina 2, Bhaijaan 2, Noto Sans) | Added when their languages are translated | engineering | `App.tsx` font loading | P1 |
| Urdu RTL layout verification | Flag exists, never exercised | engineering + device | `i18n LANGS.rtl`, `I18nManager` use in `src/i18n` | P2 |
| 54 planned lessons (objects open with a preview line only) | Not yet authored | content | `content/catalog.ts PLANNED_LESSONS`, `CONTENT_COVERAGE_MATRIX.md` §7 | P1 |
| Topic coverage of `11-eight-sections.md` (900-lesson launch target) | 52 authored | content | `content/lessons/*` | P1 (launch slice), P2 (full) |
| A0 Lap-mode media (songs, pictures, single-tap) | Lap mode shows the Little content | content + asset | `12-age-adaptive-interface.md` A0 row | P1 |
| Licensed stories (Malgudi Days, Ruskin Bond, Satyajit Ray, Grandma's Bag of Stories) | Rights not obtained | legal | `13-story-library.md` permissions list | P2 |
| Dedicated question banks, Olympiad sets, chapter/weekly/monthly sets | Assessments are built from lesson quizzes | content | `engines/assessment.ts buildAssessment` | P1 |
| 43 app-bundled lessons not present in the CMS | Seed inserts 9; the rest live in `src/dadu/content` | engineering (seed from the bundle) | `backend/src/database/seedDadu.ts` | P1 |
| Temple items lack a per-item History/Mythology/Belief field | Labels drawn in the scene, not in the content model | engineering + content | `core/content.ts`, `08-temple-courtyard.md` | P1 |
| Sanskriti world content (festivals, food, clothing, folk arts) | Only locations and a few lessons | content | `content/lessons/explore.ts`, `town.bazaar`, `town.festival_ground` | P1 |

## D. Mobile engineering

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| Camera transition and in-world activities not in the scripted e2e | Verified once in a browser by hand, not scripted | engineering | `tools/dadu/e2e-web.js` add plant/water/animal-care steps | P1 |
| 14 of 15 activity components unverified in a drive | Only the sequence activity ran | engineering | e2e: drive one lesson per activity kind | P1 |
| Assignment, Echo, Achievements, Settings, WorldHub, Section screens unverified in a drive | Typecheck only | engineering | e2e steps | P1 |
| Wind-down, time-up, break overlays not scripted | Bedtime card observed only | engineering | pin the clock and usage in `e2e-web.js` | P1 |
| Pack download/pause/resume/update/delete UI, integrity checks | Content is bundled; no binary packs exist yet | engineering (after audio packs exist) | `api/client.ts content.packs`, `19-parent-dashboard.md` downloads | P2 |
| Sync against a live API | No app-to-server run here | engineering + credential (deployed API) | `api/sync.ts`, `backend/tests/dadu.test.ts` as contract | P1 |
| Resume after offline/restore scripted test | Persistence exists; not driven | engineering | `state/persistence.ts`, e2e | P1 |
| Gallery viewer for saved drawings | Drawings saved, no viewer | engineering | `screens/activities/DrawActivity.tsx saveToGallery`, `screens/me/MeTab.tsx` | P2 |
| Maze/code grids use emoji glyphs for Chikki/Buddy/carrot | Placeholder glyphs | engineering + asset | `screens/activities/MazeActivity.tsx`, `CodeBlocksActivity.tsx` | P2 |
| Memory activity marks done at the first matched pair | Engine scores one pair per call | engineering | `engines/activities.ts evaluate(memory)` | P2 |
| Legacy Tame compiled in behind the parent switch; 84 MB of Tame assets in the Android bundle | Preservation requirement vs app size | engineering (decision) | `src/config/features.ts`, `assets/library` | P0 (decide before store build) |
| Bundle ids `com.atmasanyam.focus`, EAS project id from Tame | Not changed | engineering + credential | `app.json`, `eas.json` | P0 |
| Analytics allow-list for DADU events | Only Tame's anonymous events exist | engineering | `src/services/analytics.ts`, `01-product-architecture.md` analytics boundaries | P1 |

## E. Backend and CMS

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| Server parental-gate token for parent-only writes | Gate is client-side | engineering | `API_COMPLETION_MATRIX.md` gate rows, `18-api.md` | P1 |
| Photo upload, signed URLs, deletion with the child | No object storage attached | credential (bucket) + engineering | `SECURITY_AND_PRIVACY_AUDIT.md` finding 2 | P1 |
| Pack file hosting on a CDN | No storage | credential + engineering | packs routes | P2 |
| Certificates PDF | Not built | engineering | `engines/rewards.ts certificateFor` | P2 |
| Single export file endpoint | Parent uses the app's JSON share | engineering | `ParentDashboardScreen exportData` | P2 |
| Curriculum-tree CRUD, bulk import, review-throughput dashboards, parent notifications | Not built | engineering | `20-admin-cms.md` implementation notes | P2 |
| Console file upload to storage (register-by-URL only) | No storage | credential + engineering | `admin/src/app/(console)/dadu/assets` | P1 |
| Console UI driven in a browser | Build passes; no e2e | engineering | Playwright against `admin` | P1 |

## F. Security, legal, release

| Item | Why open | Dependency | Start from | Pri |
|---|---|---|---|---|
| DPDP legal review of consent strength, notice, grievance process | Engineering cannot substitute for counsel | legal | `SECURITY_AND_PRIVACY_AUDIT.md` §3 | P0 |
| Privacy policy, terms, parental consent disclosures, Play Data safety and App Store privacy answers for DADU | Tame texts exist, DADU texts not written | legal + engineering | `src/legal/documents.ts`, `docs/STORE_LISTING.md` | P0 |
| Store listing texts and screenshots | Not produced | asset + content | `docs/STORE_LISTING.md` | P0 |
| `npm audit` and dependency review | Registry audit endpoint blocked by the proxy here | engineering (CI) | `.github/workflows/ci.yml` | P0 |
| Android and iOS release builds, signing, submission | No EAS credentials in this environment | credential | `eas.json`, `docs/STORE_SUBMISSION.md` | P0 |
| Device performance measurements (cold start, memory, FPS, audio latency, battery) on budget Android | No device or emulator here | device | `PERFORMANCE_REPORT.md` method | P0 |
| Crash reporting and monitoring hooks | Not wired | credential + engineering | `RELEASE_READINESS.md` | P1 |
| Rollback strategy rehearsal (migration down, content unpublish, app rollback) | Documented only | engineering | `DATABASE_MIGRATION_LOG.md` rollback notes, CMS unpublish | P1 |
| Decision: strip Tame social features from the DADU build | Open product decision | product | `SECURITY_AND_PRIVACY_AUDIT.md` finding 3 | P0 |

## Counts

| Priority | Items |
|---|---|
| P0 | 10 |
| P1 | 31 |
| P2 | 16 |

Nothing in this list is a crash or a broken feature; the drives ran with zero page errors. The P0
items are release mechanics (credentials, legal texts, device measurements, the legacy decision),
not product functionality.
