# DADU – Product architecture

Follows `00-canon.md`. Database detail is in `17-database-schema.md`, endpoints in `18-api.md`,
the build order in `21-roadmap.md`, the content model behind the Miniverse in
`10-interactive-object-map.md`.

---

## Implementation notes (v3 pass, November 2026)

What was built differs from the design below in these deliberate ways:

| Design | Built | Why |
|---|---|---|
| SQLite (`expo-sqlite`) on device | AsyncStorage with versioned keys (`src/dadu/state/persistence.ts`); content bundled as TypeScript | No new native modules so Expo Go and the web export keep working; content volume (52 lessons) does not yet need a database. Move to SQLite when packs are downloaded. |
| Rive for characters, Lottie for effects | Vector rigs in react-native-svg driven by a 10 fps clock and `Animated` (`src/dadu/render`) | Rive needs a native module outside Expo Go; the rigs are structured so a Rive export can replace them per character. |
| Recorded voices in audio packs | Device text-to-speech per character (`expo-speech`) with pitch/rate profiles, captions always on | No recordings exist yet; the narrator adapter resolves recorded lines first when packs arrive. |
| Pack download/install UI | Server-side pack build and publish only; app content is bundled | Packs become necessary with audio and the other twelve languages. |
| Server parental-gate token | Client-side gate (maths + hashed PIN); every server write still needs the account token | Deferred (P1); see `SECURITY_AND_PRIVACY_AUDIT.md`. |
| Tame removed at Phase 1 exit | Tame kept behind the parental gate and an off-by-default switch; `DADU_ENABLED` flag selects the product | Reversible change as the master prompt required; strip before the store build to drop 84 MB of legacy assets. |

Module map as built: `src/dadu/core` (registries, world state, simulation), `engines`, `content`,
`render`, `screens`, `navigation`, `state`, `i18n`, `audio`, `api`, `ui`; `backend/src/dadu` plus
`routes/{public,admin}/dadu.ts`; `admin/src/app/(console)/dadu`. Tests: `src/dadu/__tests__`,
`backend/tests/dadu*.test.ts`, `tools/dadu/e2e-web.js`.

## 1. One sentence

DADU is an offline-first Expo app that renders one explorable Indian world (the Miniverse),
drives it from a published content graph (locations, objects, lessons, stories, assignments,
assessments) served by the existing Express/PostgreSQL API, and is edited and approved in the
existing Next.js admin console.

## 2. System diagram

```
            Parent's phone (Android first, iOS)                       Content team (browser)
 ┌────────────────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │ DADU mobile app  (Expo 57 / RN 0.86 / TS)      │       │ DADU admin console (Next.js 16)       │
 │                                                │       │  CMS, approval workflow, voices,      │
 │  Miniverse scene ─ Interaction engine          │       │  question banks, assignments, rewards │
 │  Character engine ─ Audio engine ─ Lesson engine│       └───────────────┬──────────────────────┘
 │  Story · Assessment · Assignment · Gamification │                       │ same-origin proxy,
 │  Screen time · Parent dashboard · Offline packs │                       │ httpOnly cookie
 │  Local store: SQLite (expo-sqlite) + files      │                       ▼
 └───────────────────────┬────────────────────────┘       ┌──────────────────────────────────────┐
                         │ HTTPS, Bearer token             │ DADU API (Express 5 + Drizzle)        │
                         │ /v1/dadu/*                      │  /v1/dadu/*   /admin/v1/dadu/*        │
                         └───────────────────────────────▶ │  zod · RBAC · rate limits · audit     │
                                                           │  content publisher · pack builder     │
                                                           │  progress sync · consent · screen time│
                                                           └──────┬──────────────┬────────────────┘
                                                                  │              │
                                                           ┌──────▼─────┐  ┌─────▼──────────────┐
                                                           │ PostgreSQL │  │ Object storage + CDN│
                                                           │ (Drizzle)  │  │ art · audio · packs │
                                                           └────────────┘  └────────────────────┘
                                                                  │
                                                           Expo Push (APNs/FCM), SMS (OTP), Resend (email)
```

Three deployables, as today: the mobile app at the repository root, the API in `backend/`, the
console in `admin/`. No new services. The only new infrastructure is object storage with a CDN
in front of it for audio, animation and image packs.

## 3. The seventeen modules

Mobile code lives in `src/dadu/<module>/`, server code in `backend/src/dadu/<module>/`, console
pages in `admin/src/app/(console)/dadu/<module>/`. A module exports a small public surface
(`index.ts`) and keeps the rest private.

| # | Module | Responsibility | Mobile | API | Console |
|---|---|---|---|---|---|
| 1 | `auth` | Parent account (reuses `users`, OTP and password flows), device registration, parental gate (maths-question or PIN) | yes | yes | – |
| 2 | `profiles` | Child profiles: name, age band `A0`–`A5`, difficulty `gentle/steady/stretch`, language, accessibility flags, avatar. Consent record. | yes | yes | yes (support view) |
| 3 | `miniverse` | The world: locations, scenes, camera, layers, navigation between places, map, world state (decorations, garden growth) | yes | yes (location graph) | yes |
| 4 | `characters` | The seven characters: Rive state machines, emotions, voice profile lookup, reaction rules, dialogue sequencing, Mitthu's Echo trigger | yes | yes (voice profiles) | yes |
| 5 | `interaction` | Interactive object engine: tap → animation → reaction → audio → activity → objective → completion → assessment | yes | yes (object map) | yes |
| 6 | `language` | 14 languages, string tables, bilingual mode, script fonts, RTL (Urdu), content fallback order | yes | yes | yes |
| 7 | `audio` | Narration playback, caching, ducking of music, speed, lip-sync cue tracks, SFX bus, background music bus | yes | yes (manifests) | yes (review) |
| 8 | `lessons` | Lesson player: ordered steps (intro, question, explain, activity, feedback, assess), age variants, speed controls | yes | yes | yes |
| 9 | `stories` | Story Corner: narration, read-along, independent, bedtime modes; comprehension questions | yes | yes | yes |
| 10 | `assessment` | Item bank, twelve question types, adaptive difficulty, mastery tracking per concept | yes | yes | yes |
| 11 | `assignments` | Dadaji's Real World Adventures: catalogue, safety, completion with parent help, optional private photo | yes | yes | yes |
| 12 | `gamification` | Stars, coins, badges, certificates, inventory, decorations, unlockable areas; no gambling mechanics | yes | yes | yes |
| 13 | `screentime` | Daily limits, warnings, breaks, bedtime, usage logs | yes | yes | – |
| 14 | `parents` | Parent dashboard: progress, reports, settings, downloads, privacy, deletion | yes | yes | – |
| 15 | `cms` | Content types, versions, eight-step approval workflow, publishing, packs | – | yes | yes |
| 16 | `analytics` | Anonymous product events, learning analytics aggregates; parent-visible reports | yes | yes | yes |
| 17 | `offline` | Content packs: download, verify, install, delta update, storage management; sync queue for progress | yes | yes | yes (pack builds) |

Dependency rule (enforced by an ESLint import boundary): engines (`interaction`, `lessons`,
`stories`, `assessment`, `assignments`) depend on `characters`, `audio`, `language` and
`offline`; nothing depends on a screen; `gamification` and `analytics` subscribe to events and are
never imported by engines directly.

## 4. Content pipeline and data flow

```
CMS (console) ──draft──▶ API: content_items + content_versions
      │ eight-step workflow (17-database-schema.md §11)
      ▼
  published version ──▶ Pack builder (API job) ──▶ object storage: packs/<pack>/<version>.tar.zst + manifest.json
      │                                                          │
      │ /v1/dadu/packs (manifest, CDN URLs)                      │ CDN
      ▼                                                          ▼
  Mobile `offline` module ── download, SHA-256 verify, unpack ──▶ app documents directory
      │
      ▼
  Local SQLite (content tables mirror the published shape) ──▶ engines read only from local storage
      │
      ▼
  Progress, attempts, completions, usage ──▶ sync queue ──▶ /v1/dadu/sync/progress (batched, idempotent)
```

Rules:

- Engines never call the network. They read SQLite and files; the `offline` module fills them.
- A pack is the unit of download: `core` (UI strings, characters, Miniverse shell, A1–A3 starter
  lessons in the chosen language), then per-section and per-language packs, then audio packs.
- Every pack version is immutable and content-addressed. A delta update ships only changed files.
- The app runs fully without a server once `core` is on the device, which is how Expo Go and
  store-review testing work.

## 5. Client architecture (Expo)

```
App.tsx
└── providers: Settings → Theme → Language → Auth → Profile → ScreenTime → Audio → Offline
    └── RootNavigator (src/navigation)
        ├── Onboarding stack: Language → Parent sign-in/consent → Child profile → Age
        ├── Miniverse stack (default): MiniverseScreen → LocationScreen → ActivityScreen
        ├── Sections tab sheet: eight sections, Stories, Tests, Achievements
        └── Parent stack (behind the gate): Dashboard, Reports, Settings, Downloads, Privacy
```

### 5.1 How the engines fit together

```
 ┌──────────────┐  tap   ┌───────────────────┐  resolve  ┌────────────────────┐
 │ Miniverse    │ ─────▶ │ Interaction engine │ ────────▶ │ Content store (SQLite)
 │ scene        │        │ src/dadu/interaction│           └────────────────────┘
 └──────┬───────┘        └────────┬──────────┘
        │ scene events            │ activity spec (lesson | story | assignment | assessment | mini-game)
        │                         ▼
        │                ┌───────────────────┐
        │                │ Lesson engine      │  plays steps; each step emits CharacterCue + AudioCue + UI step
        │                └────────┬──────────┘
        ▼                         ▼
 ┌──────────────┐  cues  ┌───────────────────┐  narration/sfx/music  ┌──────────────┐
 │ Character    │ ◀───── │ Audio engine       │ ─────────────────────▶ │ expo-audio   │
 │ engine (Rive)│        │ src/dadu/audio     │                        └──────────────┘
 └──────────────┘        └───────────────────┘
        ▲                         │ completed(step|lesson|item)
        │                         ▼
 ┌──────────────┐        ┌───────────────────┐
 │ Gamification │ ◀───── │ Event bus (typed)  │ ──▶ analytics, mastery, assignments, screentime
 └──────────────┘        └───────────────────┘
```

- **Miniverse scene** (`src/dadu/miniverse`): a layered 2.5D scene per location. Background,
  mid-ground, objects and characters are separate layers in a `ScrollView`/gesture-driven camera
  with parallax. Scenes are data: a `location` row lists layers, hotspots and object placements;
  the scene component is generic. Scenes render with `react-native-svg` plus raster layers
  (`expo-image`), not three.js (the Tame museum's three.js code is not reused for the Miniverse).
- **Interaction engine** (`src/dadu/interaction`): `interact(objectId, profile)` looks up the
  object's `object_activities` for the child's band and difficulty, picks the next incomplete one,
  plays the object's `tap` animation and Dadaji's hook line, and hands an `ActivitySpec` to the
  right engine. It also records `object_completions`.
- **Lesson engine** (`src/dadu/lessons`): a step machine. Step types: `intro`, `question`
  (Gopu/animal asks), `explain`, `example`, `experiment`, `activity`, `feedback`, `assess`, `echo`
  (Mitthu). Each step holds dialogue lines (character, text per language, audio asset id, emotion),
  optional media, and an activity component key. Speed settings change timers, not content.
- **Character engine** (`src/dadu/characters`): one Rive artboard per character with a state
  machine (`idle, walk, run, sit, laugh, talk, think, clap, dance, surprised, correct, incorrect,
  sleepy, wave`) and a `mouth` input driven by the audio engine's viseme track. Reaction rules
  map events to states (for example `answer.correct → dadaji.clap, gopu.dance, kim.run`).
- **Audio engine** (`src/dadu/audio`): three buses (dialogue, sfx, music). Dialogue start ducks
  music to 20 % over 250 ms; music recovers 600 ms after the last line. Narration speed ×0.6–×1.6
  with pitch preserved (pre-rendered rate variants for very slow/fast where the platform cannot
  time-stretch cleanly). Every line has a `.m4a` file and a `.json` viseme/timing track.
- **Event bus**: a typed in-process emitter. Every engine emits; `gamification`, `analytics`,
  `assessment` (mastery) and `screentime` subscribe. This keeps rewards and tracking out of
  lesson code.

### 5.2 Local storage

| Store | Technology | Holds |
|---|---|---|
| Content | SQLite (`expo-sqlite`) | Published content mirrored from packs; read-only to engines |
| Progress | SQLite | Attempts, completions, mastery, inventory, world state, usage logs, sync queue |
| Files | `expo-file-system` documents dir | Audio, Rive, images per pack, content-addressed |
| Settings | AsyncStorage (existing `src/storage/settings.ts`) | Preferences |
| Secrets | `expo-secure-store` (existing) | Parent token, parental-gate PIN hash |

Tame's AsyncStorage-only history is not enough for DADU's volumes (thousands of attempts); SQLite
is new in Phase 1.

## 6. Server architecture

The existing `backend/src/app.ts` gains two routers, `dadu/public` and `dadu/admin`, mounted at
`/v1/dadu` and `/admin/v1/dadu`. Everything else is reused: env validation, auth middleware (user
and admin tokens), RBAC (`rbac.ts` gains DADU permissions), zod `parse`, rate limits, audit log,
push, SMS, mailer, request logging, migrations, vitest integration tests.

New server concerns:

| Concern | Where | Notes |
|---|---|---|
| Content graph and versions | `backend/src/dadu/cms` | Items are typed JSON documents validated per type with zod; versions are immutable |
| Workflow | `backend/src/dadu/cms/workflow.ts` | State machine with per-step permissions; every transition audited |
| Pack builder | `backend/src/dadu/offline/packBuilder.ts` | Runs as a job (`npm run packs:build`) or on publish; writes to object storage via S3-compatible API |
| Progress sync | `backend/src/dadu/sync` | Idempotent batched upserts keyed by client-generated UUIDs |
| Consent | `backend/src/dadu/profiles/consent.ts` | Records consent text version, method and timestamp; blocks child data writes without it |
| Screen time | `backend/src/dadu/screentime` | Rules are stored server-side so a reinstall keeps limits; evaluation is on-device |
| Learning analytics | `backend/src/dadu/analytics` | Aggregates per child per week; raw events are anonymous |

## 7. Animation stack

| Option | Fit | Verdict |
|---|---|---|
| **Rive** (`rive-react-native`) | State machines, inputs (mouth, emotion), one small `.riv` per character (~100–300 KB), runs on the GPU, mixes states, cheap on 2 GB devices | **Recommended for the seven characters and interactive objects.** |
| Lottie (`lottie-react-native`) | Timeline clips, no state mixing, JSON files grow fast with 13 states × 7 characters | Use only for one-off celebratory effects (confetti, star bursts) where After Effects output is handy |
| SVG / Skia | Full control, scenes as data, parallax | Use for environments, UI illustrations, icons; not for character acting |
| three.js on expo-gl (existing in Tame) | 3D | Not used for DADU; the soft 2.5D look is cheaper and more consistent |

Reasons: a state machine with a `mouth` input gives lip-sync and emotion blending without
hundreds of clips; artists iterate in the Rive editor without a code change; file sizes keep the
`core` pack small. Fallback for A0 Lap mode and reduce-motion: static poses exported from the same
Rive artboards.

## 8. Offline strategy

1. Install → language chosen → `core` pack for that language downloads (target ≤ 60 MB).
2. The parent dashboard's Downloads page lists packs by section and language with sizes; the
   child can also ask Dadaji "take me there" and a missing pack prompts the parent.
3. Audio packs are per language and per section; pictures and animations are shared.
4. Packs verify by SHA-256 before install; a failed verify is deleted and retried.
5. Delta updates: manifests list file hashes; only new hashes download.
6. Progress writes go to the local database first and to a sync queue; sync runs on app open,
   every ten minutes while online, and on background fetch. Conflict rule: server keeps the union
   of completions and the maximum mastery; the client never deletes server progress.
7. Storage pressure: the Downloads page shows used space and lets the parent remove packs; the
   app never silently evicts a pack.

## 9. Performance budget (budget Android)

Reference device: 2 GB RAM, Snapdragon 4xx-class, Android 10, 720×1600.

| Metric | Budget |
|---|---|
| Cold start to Miniverse interactive | < 3.0 s (p75), < 4.5 s (p95) |
| Scene frame rate | 60 fps target, never below 45 fps with four characters animating |
| Memory while in a scene | < 300 MB total process RSS |
| JS bundle (Hermes) | < 6 MB |
| `core` pack | ≤ 60 MB; section pack ≤ 80 MB; audio pack per section-language ≤ 120 MB |
| Audio line start latency | < 150 ms from cue (files pre-opened for the current step) |
| Scene image layers | ≤ 4 raster layers per location at 1× device width, WebP |
| Rive artboards on screen | ≤ 5 simultaneously |
| Touch to feedback | < 100 ms (local animation starts before any lookup completes) |

Enforced by: a `tools/checks/perf_budget.mjs` script that measures bundle and pack sizes in CI,
a Maestro flow timing cold start on a CI emulator, and a manual pass on the reference device at
every phase exit (see `21-roadmap.md`).

## 10. Security and child privacy

- **Accounts belong to parents.** A child profile is a row under a parent's account and is never
  an identity of its own. No child email, phone, public profile, chat or messaging.
- **Parental consent** (Indian DPDP Act 2023, s.9): verifiable consent recorded with the consent
  text version, the method (OTP-verified phone plus explicit acceptance) and timestamp before any
  child data is written. Withdrawal deletes child data within the stated window.
- **Data minimisation:** stored child data is name or nickname, age band (not date of birth),
  language, settings, learning progress. Optional assignment photos are stored encrypted, private
  to the parent, never used for anything else, never required.
- **Parental gate:** every parent-only area and every purchase, download, data or deletion action
  is behind the gate (a three-digit arithmetic challenge for pre-readers to fail naturally, or the
  parent's PIN). The PIN hash lives in secure storage; five failures lock for five minutes.
- **No behavioural advertising, no third-party trackers.** Analytics are first-party, anonymous
  product events with no free text and no media; a parent can turn them off.
- **AI use:** none at runtime for children. AI may draft content in the CMS; every item still
  passes the eight-step human workflow before publishing.
- **Transport and storage:** HTTPS only, helmet headers, opaque hashed tokens, scrypt passwords,
  zod on every input, JSON body limits, S3-style private buckets with signed URLs for photos, CDN
  for public packs. All existing in Tame except the buckets.
- **Deletion and export:** parent deletes a child profile or the whole account from the
  dashboard; the API cascades, strips analytics links, deletes photos from storage, and emails a
  confirmation. Export is a JSON file of progress and settings, parent-initiated.

## 11. Analytics boundaries

| Allowed | Not allowed |
|---|---|
| Event names from a fixed list (`lesson_started`, `item_answered`, `pack_installed` …) | Free-text properties |
| Content ids, age band, language, platform, app version | Child name, photos, audio, typed answers |
| Durations and counts | Device identifiers beyond the random install id |
| Parent-visible learning reports computed server-side per child | Cross-app or advertising identifiers |

## 12. Reuse from Tame versus new

| Area | Reused as is | Adapted | New |
|---|---|---|---|
| Mobile shell | `App.tsx` providers, `ErrorBoundary`, `AppGate`, settings storage, secure storage, `useReducedMotion`, i18n loader, theme context, UI kit (`src/ui`) | Theme tokens replaced by the DADU palette; tab bar replaced by the Miniverse dock | All `src/dadu/*` modules, SQLite, Rive, audio engine, scenes |
| Backend | app, env, auth, RBAC, rate limits, validation, errors, audit, push, SMS, mailer, migrations, tests harness | `rbac.ts` gains DADU permissions; `users` gains parent fields | `backend/src/dadu/*`, pack builder, object storage client, sync |
| Admin | shell, login, proxy, UI primitives, chart | Navigation gains a DADU group | CMS pages, workflow UI, voice review, question-bank editor |
| Content | the plant catalogue (reused as garden species seed data), the picture library (public-garden tree and bird cards) | | Everything educational |
| Removed from the DADU build | Focus timer, jigsaws, balcony, museum, friends, group sessions, pokes, reports | | |

Tame screens stay in the repository until Phase 1 exit, then move to `legacy/` or are deleted on
the user's decision; nothing of Tame ships inside DADU.
