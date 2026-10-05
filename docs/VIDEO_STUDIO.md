# Atma Sanyam Video Studio: multilingual animated story video generation

This document is the design deliverable for the "Multilingual Animated
News/Story Video Generation System" master prompt. It explains how the
system fits into the existing Atma Sanyam codebase, then covers the
architecture, schema, APIs, provider interfaces, pipelines, job queue, admin
console, environment variables and the implementation plan. The code lives in
`backend/src/studio/`, `backend/src/api/routes/admin/studio*.ts` and
`admin-dashboard/src/pages/studio/`.

---

## 0. Inspection of the existing project (what we reuse)

| Area | What already exists | How the Studio uses it |
|---|---|---|
| Frontend (user) | Native Android app (Kotlin/Compose) that plays per-language MP4s from `VideoAsset` rows | Unchanged. Publishing a Studio story upserts `VideoAsset` rows, so Studio videos appear in the app feed with no Android changes. |
| Frontend (admin) | React + Vite admin dashboard (login, stories review, sources, config) | New **Studio**, **Voices** and **Providers** sections are added to the same app, behind the same admin login. |
| Backend | Express + TypeScript API (`/api/v1`), zod validation, pino logging | New routes are mounted under `/api/v1/admin/studio`, `/admin/voices` and `/admin/providers`. |
| Database | PostgreSQL via Prisma (`MasterStory`, `StoryScript`, `VideoAsset`, `Language`, `AdminUser`…) | New Studio tables are added to the same schema. `Language`, `AdminUser`, `MasterStory` and `VideoAsset` are reused. |
| Auth | JWT for app users; separate admin JWT with `EDITOR`/`SUPER_ADMIN` roles | All Studio routes require admin auth. Provider and voice configuration require `SUPER_ADMIN`. |
| Queue | Redis + BullMQ workers (`npm run worker`) | Two new queues: `studio` (AI/voice/visual work) and `studio-render` (FFmpeg), started by the same worker process. |
| Storage | `lib/storage.ts` local-disk storage served at `/media`, with a swap point for S3 | Wrapped by a `StorageProvider` interface. All Studio media goes through it. |
| AI | `callClaudeForJson` (Anthropic), rule-based fallbacks everywhere | Wrapped by an `LLMProvider` interface with an offline rule-based fallback. |
| TTS / video | `TextToSpeechProvider` (Google/mock) and an FFmpeg template renderer | Replaced for Studio by a `VoiceProvider` router (ElevenLabs / Chatterbox / Google / mock) and a new deterministic FFmpeg renderer. The old news pipeline keeps working unchanged. |
| Safety | `JournalisticSafetyService` (allegation hedging), `ContentModerationService` (PII, minors) | Reused in the Studio safety and QC layers. |
| Deployment | `npm run dev` (API), `npm run worker` (workers), Postgres + Redis, ffmpeg on the worker host | Same processes. Render workers can be scaled out separately via `STUDIO_WORKER_ROLES=render`. |

The Studio is a separate production line next to the automated news
pipeline. It can take pasted articles, or it can import an existing
`MasterStory` ("Send to Studio"). It publishes into the same app feed.

---

## 1. Architecture

```
                         ┌──────────────────── Admin console (React) ───────────────────┐
                         │ Studio list · New story · Story workspace (facts, characters, │
                         │ scenes, languages, renders, jobs, versions) · Voices · Providers│
                         └───────────────────────────────┬──────────────────────────────┘
                                                         │ REST + admin JWT
┌────────────────────────────────────────────────────────▼─────────────────────────────────┐
│ API layer  /api/v1/admin/studio/*   /admin/voices   /admin/providers                     │
│  └─ StudioService (create/edit/approve/regenerate/publish; never blocks on AI work)      │
└───────────────┬───────────────────────────────────────────────┬──────────────────────────┘
                │ enqueue GenerationJob                         │ read/write
                ▼                                               ▼
     Redis + BullMQ                                        PostgreSQL
  ┌──────────────┬─────────────────┐              (stories, facts, characters, scripts,
  │ queue:studio │ queue:studio-   │               scenes, assets, audio, renders, jobs,
  │ (AI, voice,  │ render (FFmpeg) │               logs, versions, ai_cache …)
  │  visuals)    │                 │                        ▲
  └──────┬───────┴────────┬────────┘                        │
         ▼                ▼                                 │
  Studio workers    Render workers ─────────────────────────┘
         │                │
         ▼                ▼
┌──────────────── Layers (backend/src/studio) ─────────────────────────────────────────────┐
│ CONTENT   cleaning · facts · timeline · characters · locations · master script · scenes  │
│ LANGUAGE  12 language profiles · per-scene localisation · register lint · fact parity    │
│ SAFETY    scene SAFE/SENSITIVE/RESTRICTED · safe visual substitution · fact check        │
│ MEDIA     8 base voices · voice assignment · voice synthesis · visual prompts · music/SFX │
│ RENDERING audio timeline · track mixing + ducking · FFmpeg · subtitles · packaging       │
│ QC        final quality check → PASSED / NEEDS_REVIEW                                    │
└──────────────────────────────────────┬───────────────────────────────────────────────────┘
                                       ▼
                 Provider interfaces (swappable; offline fallbacks)
   LLMProvider · TranslationProvider · VoiceProvider · ImageProvider · VideoProvider ·
   MusicProvider · StorageProvider
                                       ▼
                    Object storage (local disk → S3/R2 + CDN)
```

---

## 2. Folder structure

```
backend/src/studio/
├── types.ts                    shared domain types (facts, characters, scenes, lines…)
├── config.ts                   studio settings from env (duration limits, fps, resolution…)
├── hashing.ts                  stable content hashes (cache keys)
├── cache.ts                    ai_cache helpers (LLM analysis/translation cache)
├── versioning.ts               snapshot → versions table
├── providers/
│   ├── llm/                    LLMProvider, AnthropicLLMProvider
│   ├── translation/            TranslationProvider, LLM / Google / Passthrough
│   ├── voice/                  VoiceProvider, ElevenLabs / Chatterbox / Google / Mock, VoiceRouter
│   ├── image/                  ImageProvider, OpenAI-compatible / Placeholder (PNG)
│   ├── video/                  VideoProvider, KenBurns (local FFmpeg) / generic HTTP
│   ├── music/                  MusicProvider, library-based
│   ├── storage/                StorageProvider, local disk
│   └── registry.ts             resolves providers from env + provider_configs; status report
├── content/                    CONTENT LAYER
│   ├── articleCleaner.ts
│   ├── factExtractor.ts        rule-based + LLM fact extraction with verification status
│   ├── timelineBuilder.ts
│   ├── characterExtractor.ts
│   ├── locationExtractor.ts
│   ├── masterScriptGenerator.ts  template + LLM master script and scene breakdown
│   └── durationPlanner.ts      speech-rate estimates, fact-preserving compression
├── language/                   LANGUAGE LAYER
│   ├── languageProfiles.ts     12 languages: script, digits, speech rate, ISO-639-2
│   ├── registerLint.ts         slang / abuse / sensationalism detection
│   ├── factConsistency.ts      native-digit normalisation, cross-language fact parity
│   └── languageScriptGenerator.ts
├── safety/                     SAFETY LAYER
│   ├── sceneSafety.ts          SAFE / SENSITIVE / RESTRICTED classification
│   ├── safeVisualLibrary.ts    contextual substitute visuals
│   └── factCheck.ts            quote verification, hallucinated number/name detection
├── media/                      MEDIA LAYER
│   ├── voiceCatalog.ts         VOICE_01…VOICE_08 definitions
│   ├── voiceAssignment.ts      character → voice mapping rules
│   ├── visualPromptBuilder.ts  style bible + consistent per-scene prompts
│   └── png.ts                  dependency-free PNG encoder (placeholder art)
├── rendering/                  RENDERING LAYER
│   ├── audioTimeline.ts        segment layout, scene-duration sync
│   ├── subtitles.ts            SRT/WebVTT from exact approved script + real timings
│   ├── ffmpegCommands.ts       pure, unit-tested FFmpeg argument builders
│   └── ffmpegRunner.ts
├── qc/qualityCheck.ts          final QC
├── jobs/
│   ├── jobTypes.ts
│   ├── jobRunner.ts            GenerationJob bookkeeping + BullMQ / inline execution
│   └── studioWorkers.ts
├── StudioPipeline.ts           stage implementations (one method per job type)
└── StudioService.ts            admin-facing operations used by the API

backend/src/api/routes/admin/{studio.ts, voices.ts, providers.ts}
admin-dashboard/src/api/studio.ts
admin-dashboard/src/pages/studio/{StudioListPage, NewStudioStoryPage, StudioStoryPage,
                                  VoicesPage, ProvidersPage}.tsx
```

---

## 3. Database schema (Prisma, mapped to the table names in the brief)

| Table (`@@map`) | Model | Purpose |
|---|---|---|
| `users`, `admins` | existing `User`, `AdminUser` | reused |
| `languages` | existing `Language` | reused and extended to 12 languages |
| `stories` | `StudioStory` | one video story: status, format, target duration, languages, style bible, narrator, sensitivity, QC result, optional link to news `MasterStory` |
| `articles` | `StudioArticle` | raw + cleaned input text, title, source, uploaded images, character/scene/pronunciation notes, content warnings (versioned) |
| `facts` | `StudioFact` | names, dates, locations, numbers, organisations, quotes, claims, allegations, official statements, with `VERIFIED/UNVERIFIED/REPORTED/ALLEGED/UNKNOWN` and statement type |
| `characters` | `StudioCharacter` | extracted characters: role, gender, age group, minor/official/real-person flags, fixed appearance, pronunciations |
| `voices` | `Voice` | the 7–8 reusable base voices and their provider voice IDs |
| `voice_assignments` | `VoiceAssignment` | persistent speaker → voice mapping per story (narrator + characters) |
| `scripts` | `StudioScript` | versioned MASTER script and per-language scripts (per-scene lines as JSON) |
| `scenes` | `StudioScene` | structured master scenes (all fields from §12 of the brief) and safety level |
| `visual_prompts` | `VisualPrompt` | prompt, negative prompt, substitute flag/reason, hash |
| `scene_assets` | `SceneAsset` | generated images/clips per scene, cached by prompt hash |
| `audio_files` | `AudioFile` | per-language tracks: narration, dialogue, ambient, music, final mix |
| `audio_segments` | `AudioSegment` | one synthesised line: speaker, voice, text, duration, timeline position, cache hash |
| `subtitles` | `StudioSubtitle` | SRT/WebVTT per language, with cues |
| `video_projects` | `VideoProject` | master visual timeline and output settings |
| `video_renders` | `VideoRender` | per-language MP4s and multi-audio packages, with an inputs hash for reuse |
| `content_safety` | `ContentSafetyReview` | per-scene and story-level safety results and admin overrides |
| `music` | `MusicTrack` | licensed background music library, by mood |
| `sound_effects` | `SoundEffect` | licensed SFX library, by tag |
| `versions` | `ContentVersion` | immutable snapshots of scripts, scenes and renders |
| `generation_jobs` | `GenerationJob` | every unit of work, `PENDING/PROCESSING/COMPLETED/FAILED/RETRYING` |
| `generation_logs` | `GenerationLog` | per-job log lines |
| `provider_configs` | `ProviderConfig` | non-secret provider settings (enabled, priority, model, languages) |
| `ai_cache` | `AiCache` | cached LLM analysis and translations, keyed by content hash |

Secrets are never stored in the database. `provider_configs` only says which
provider to prefer and how to use it. The keys come from env vars.

---

## 4. API structure (all under `/api/v1/admin`, admin JWT required)

```
GET    /studio/stories                         list (filter by status)
POST   /studio/stories                         create from pasted/uploaded article → queues ANALYZE
POST   /studio/stories/from-master/:masterId   import an existing news MasterStory
GET    /studio/stories/:id                     full workspace payload
PUT    /studio/stories/:id                     edit settings (languages, format, style, narrator…)
POST   /studio/stories/:id/analyze             re-run analysis (after article edit)
PUT    /studio/stories/:id/article             edit article → new article version
PUT    /studio/stories/:id/facts/:factId       change verification status / value
PUT    /studio/stories/:id/characters/:charId  edit character (name, gender, age, appearance…)
PUT    /studio/stories/:id/voices              assign voices to narrator / characters
POST   /studio/stories/:id/master-script       (re)generate the master script → new version
PUT    /studio/stories/:id/scenes/:sceneId     edit one scene (new script version, only that scene invalidated)
POST   /studio/stories/:id/scenes/:sceneId/regenerate-visual
POST   /studio/stories/:id/languages/:lang/script      regenerate one language script
PUT    /studio/stories/:id/languages/:lang/scenes/:n   edit one scene's lines in one language
POST   /studio/stories/:id/languages/:lang/voice       regenerate audio for one language
POST   /studio/stories/:id/languages/:lang/render      re-render one language
POST   /studio/stories/:id/submit-review       AI review → ADMIN_REVIEW
POST   /studio/stories/:id/approve             ADMIN_REVIEW → APPROVED → media generation + render
POST   /studio/stories/:id/reject
POST   /studio/stories/:id/publish             RENDERED → PUBLISHED (needs QC pass or override note)
GET    /studio/stories/:id/jobs                jobs + logs
POST   /studio/jobs/:jobId/retry               retry only that job
GET    /studio/stories/:id/versions
GET    /studio/stories/:id/download/:lang      redirect to the MP4 / SRT

GET/PUT /voices, /voices/:id                   manage base voices + provider voice IDs
POST   /voices/:id/preview                     synthesise a sample line in a chosen language
GET    /providers                              provider status (configured? languages? priority)
PUT    /providers/:kind/:key                   enable/disable, priority, non-secret settings
GET/POST /studio/music, /studio/sound-effects  library management
```

---

## 5. Provider interfaces

```ts
interface LLMProvider { key; isConfigured(); completeJson<T>(req: {system, prompt, maxTokens, cacheKey?}): Promise<T> }
interface TranslationProvider { key; supports(lang); localize(req: {sourceLang, targetLang, items[], glossary}): Promise<string[]> }
interface VoiceProvider { key; supportsLanguage(lang); synthesize({text, languageCode, providerVoiceId, style}): Promise<{audio: Buffer, format, durationSeconds}> }
interface ImageProvider { key; generate({prompt, negativePrompt, width, height, seed}): Promise<{image: Buffer, format}> }
interface VideoProvider { key; animate({imagePath, durationSeconds, motion, width, height, fps}): Promise<{video: Buffer}> }
interface MusicProvider { key; pick({mood, minDurationSeconds}): Promise<{storageKey, durationSeconds} | null> }
interface StorageProvider { key; put(key, data, contentType); url(key); localPath(key); exists(key) }
```

Each interface has a real adapter and an offline fallback, so the full
pipeline runs locally with no API keys. Output made by a fallback is marked
as such, and QC flags it:

| Kind | Real adapters | Offline fallback |
|---|---|---|
| LLM | Anthropic Claude | deterministic rule-based analysis/templates |
| Translation | LLM localisation (Claude), Google Cloud Translation | passthrough (marked `UNTRANSLATED`, QC → NEEDS_REVIEW) |
| Voice | ElevenLabs, Chatterbox (self-hosted, OpenAI-compatible `/v1/audio/speech`), Google Cloud TTS | silent WAV with realistic duration |
| Image | any OpenAI-compatible images API | generated PNG placeholder art with a consistent palette per location and time of day |
| Video | local Ken Burns animation (FFmpeg, default), generic HTTP image-to-video adapter | Ken Burns |
| Music | licensed library (`music` table) | none (music track omitted) |
| Storage | local disk (`/media`) with an S3 swap point | local disk |

Language support is never assumed. Each voice/translation provider declares
its supported languages (configurable), and the router picks the first
provider, in priority order, that supports the language and has a voice ID
for that base voice.

---

## 6. Voice architecture

* **8 base voices**, created by the seed: `VOICE_01` adult male, `VOICE_02`
  adult female, `VOICE_03` elderly male, `VOICE_04` elderly female,
  `VOICE_05` young male, `VOICE_06` young female, `VOICE_07` authoritative
  male (officials, police), `VOICE_08` authoritative female (default
  narrator).
* Each voice stores provider voice IDs: `{ elevenlabs: "<voice_id>",
  chatterbox: "<voice name or reference>", google: { hi: "hi-IN-…", en:
  "en-IN-…" } }`. ElevenLabs multilingual models and Chatterbox voice
  cloning use **one** voice ID for every language, so a voice keeps the same
  identity in Hindi, Tamil or English. Google only offers per-language
  voices, so the closest match per language is configured instead.
* The **narrator** is a story setting (default `VOICE_08`). The narrator's
  voice is never assigned to a character.
* **Assignment rules** (`voiceAssignment.ts`): officials → authoritative
  voice of the matching gender. Otherwise gender and age group → closest
  base voice. When two characters in a scene would share a voice, the next
  best voice is used. Minors get the young voice, and their names are never
  spoken. Assignments are stored in `voice_assignments` and stay fixed for
  the story until an admin changes them.
* **Narration vs dialogue**: the narrator speaks all narration and all
  reported statements. A character speaks only (a) verbatim direct quotes
  found in the article (`DIRECT_QUOTE`, checked against the article text by
  QC), or (b) reconstructed dialogue when the admin has enabled "dramatised
  reconstruction". Reconstructed dialogue is labelled on screen and is never
  attributed to a named real person.
* Synthesis is cached per `(provider, providerVoiceId, language, text,
  settings)` hash, so re-rendering or editing one line only synthesises that
  line.

---

## 7. Video generation pipeline (job graph)

```
ARTICLE INPUT
  └─ [ANALYZE_ARTICLE]  cleaning → fact extraction → factual timeline → character extraction
                        → location extraction → content safety analysis
  └─ [GENERATE_MASTER_SCRIPT] master story script → scene breakdown → scene safety
                        → visual prompt generation → safe visual replacement → voice assignment
  └─ [GENERATE_LANGUAGE_SCRIPT × N languages]  natural per-language scripts (per-scene cache)
  └─ [AI_REVIEW]        register lint · fact parity · fact check · duration → status ADMIN_REVIEW
        ── admin previews/edits/approves ──►  APPROVED
  └─ [GENERATE_SCENE_VISUAL × scenes]   image → animation (Ken Burns / video provider)   ┐ parallel
  └─ [GENERATE_VOICE × languages]       voice generation → audio timeline                ┘
  └─ [RENDER_LANGUAGE × languages]  (queue studio-render) music/SFX/ambient tracks, ducking,
                        audio/video sync, subtitles (SRT/VTT, optional burn-in), MP4 encode
  └─ [RENDER_PACKAGE]   optional multi-audio MP4 (one video stream + one AAC track per language)
  └─ [FINAL_QC]         → RENDERED + qcStatus PASSED / NEEDS_REVIEW
        ── admin publishes (sensitive stories are never auto-published) ──► PUBLISHED
```

**One master visual timeline.** Scene order, visual assets and transitions
are shared by every language. Languages differ only in narration, dialogue,
subtitles and on-screen text. Speech length varies between languages, so each
language's render sets each scene's duration to `max(planned duration,
spoken audio + pauses)` and stretches the same animation over it. Voices are
never sped up. If the total goes over the 5-minute limit, the language
script is condensed (key facts are kept) before synthesis.

**Duration rules.** Short = 60–180 s, long = 180–300 s, never over 300 s.
Speech-rate estimates come from each language profile. When a script is too
long, `durationPlanner` drops low-priority sentences first (context and
colour). It never drops a sentence that carries a key fact. If the script
still doesn't fit, the story is flagged NEEDS_REVIEW rather than cut blindly.

---

## 8. Safety pipeline

1. **Story-level analysis** (ANALYZE): sensitive topics (suicide,
   sexual violence, death, violence, minors, domestic abuse) → story
   `isSensitive`. Existing PII/minor moderation is reused.
2. **Scene classification**: every scene is classified `SAFE`, `SENSITIVE`
   or `RESTRICTED` from its narration and visual description.
3. **Safe visual replacement**: `RESTRICTED` scenes get a substitute visual
   from `safeVisualLibrary` (window, hallway, building exterior, police
   vehicle, ambulance, silhouettes, courthouse, closed door, empty chair…),
   chosen by topic. Suicide scenes never show a method (WHO media
   guidelines), and a helpline card (Tele-MANAS 14416) is added. The
   narration is never removed because a visual was replaced.
4. **Prompt guardrails**: every visual prompt carries a negative prompt (no
   gore, blood, nudity, sexual content, weapons in use, identifiable real
   faces, text or logos). Real people are always drawn as stylised,
   non-identifiable figures.
5. **Fact check**: facts are tagged `VERIFIED / UNVERIFIED / REPORTED /
   ALLEGED / UNKNOWN`. The QC fails on direct quotes not found in the
   article, numbers or dates missing from the facts, and unhedged
   allegations.
6. **Approval gate**: sensitive stories always need an explicit admin
   publish. Other stories can be auto-published only if
   `STUDIO_AUTO_PUBLISH_NON_SENSITIVE=true` and QC passed.

---

## 9. Job queue architecture

* `generation_jobs` is the source of truth for status, which the admin
  console shows: `PENDING → PROCESSING → COMPLETED | RETRYING → FAILED`.
  Every job writes `generation_logs`.
* BullMQ queue `studio` runs text/voice/visual jobs
  (`STUDIO_WORKER_CONCURRENCY`, default 4). Queue `studio-render` runs FFmpeg
  (`STUDIO_RENDER_CONCURRENCY`, default 1 per host). The BullMQ job ID is the
  `generation_jobs` ID. Up to 3 attempts with exponential backoff.
* **Granular jobs.** One job per language script, per scene visual, per
  language voice and per language render. A failure retries only that unit.
  A failed render reuses all stored images and audio.
* **Fan-in.** When a visual or voice job completes, the pipeline checks
  whether a language is ready to render. It then enqueues that language's
  render once, deduplicated by `inputsHash`.
* `STUDIO_INLINE_JOBS=true` runs jobs in-process (useful without Redis,
  and in tests).
* **Scale path**: 10 videos/day runs on one API + one worker. 100/day: raise
  concurrency, move storage to S3/R2, and run render workers separately
  (`STUDIO_WORKER_ROLES=render`). 1,000/day: several render hosts, per-provider
  rate limits (BullMQ limiter), a Postgres read replica for the dashboard,
  and a CDN for media.

---

## 10. Admin console

* **Studio list**: stories by status, with language/render progress.
* **New story**: paste or upload an article (.txt), set title, source,
  state/district, languages (12), format (short/long), animation style,
  narrator voice, content warnings, character notes, scene notes,
  pronunciations, and a dramatised-reconstruction toggle.
* **Story workspace** tabs:
  * *Overview*: status and workflow buttons (submit, approve, reject,
    publish), QC report, safety summary.
  * *Facts*: extracted facts with verification-status editing.
  * *Characters & voices*: character sheets and voice assignment
    dropdowns.
  * *Master script*: scene cards with all fields, editing, safety level,
    substitute visual, preview image, and "regenerate visual".
  * *Languages*: per-language scene lines, editing, lint flags,
    "regenerate script / audio / render" for one language.
  * *Renders*: video players per language, SRT/VTT/MP4 downloads,
    multi-audio package.
  * *Jobs*: every job with status, logs and retry.
  * *Versions*: script/scene/render history.
* **Voices**: the base voices, provider voice IDs, sample preview.
* **Providers**: each provider's configured/not-configured state (from env,
  secrets never displayed), priority, enabled flag, model and supported
  languages.

---

## 11. Environment variables (backend `.env`)

| Variable | Needed for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` (existing) | LLM analysis, master script, localisation | console.anthropic.com → API keys |
| `STUDIO_LLM_MODEL` | model for Studio text work (default `claude-sonnet-5`) | — |
| `ELEVENLABS_API_KEY` | ElevenLabs voices | elevenlabs.io → Profile → API key |
| `ELEVENLABS_MODEL_ID` | default `eleven_multilingual_v2` | — |
| `ELEVENLABS_LANGUAGES` | languages you've verified on your ElevenLabs plan/model (default `en,hi,ta`) | — |
| `CHATTERBOX_BASE_URL` | self-hosted Chatterbox TTS server (OpenAI-compatible) | your own GPU server |
| `CHATTERBOX_API_KEY` | optional bearer token for that server | — |
| `CHATTERBOX_LANGUAGES` | default `en,hi` | — |
| `GOOGLE_TTS_API_KEY` (existing) | Google Cloud TTS fallback voices | Google Cloud console → APIs → Text-to-Speech |
| `GOOGLE_TRANSLATE_API_KEY` | optional Google translation provider | Google Cloud console → Cloud Translation API |
| `VOICE_PROVIDER_PRIORITY` | e.g. `elevenlabs,chatterbox,google,mock` | — |
| `TRANSLATION_PROVIDER` | `llm` (default), `google` or `passthrough` | — |
| `IMAGE_PROVIDER` | `openai-compatible` or `placeholder` (default) | — |
| `IMAGE_PROVIDER_API_KEY`, `IMAGE_PROVIDER_BASE_URL`, `IMAGE_PROVIDER_MODEL` | image generation | your image API vendor |
| `VIDEO_PROVIDER` | `kenburns` (default, local) or `http` | — |
| `VIDEO_PROVIDER_API_KEY`, `VIDEO_PROVIDER_BASE_URL` | optional image-to-video vendor | your video API vendor |
| `MUSIC_PROVIDER` | `library` (default) | — |
| `STORAGE_*` (existing) | S3-compatible storage in production | Cloudflare R2 / AWS S3 |
| `STUDIO_DEFAULT_RESOLUTION` | `1080p` (default) or `720p` | — |
| `STUDIO_DEFAULT_FPS` | `25` (default), `24` or `30` | — |
| `STUDIO_ORIENTATION` | `landscape` (default 16:9) or `portrait` (9:16) | — |
| `STUDIO_WORKER_CONCURRENCY`, `STUDIO_RENDER_CONCURRENCY` | worker scaling | — |
| `STUDIO_WORKER_ROLES` | `all` (default), `studio` or `render` | — |
| `STUDIO_INLINE_JOBS` | `true` to run jobs without Redis | — |
| `STUDIO_AUTO_PUBLISH_NON_SENSITIVE` | default `false` | — |
| `STUDIO_FONT_DIR` | folder with Noto fonts for burned-in Indic subtitles | install `fonts-noto` |

The brief's generic names map onto these: `LLM_API_KEY` → `ANTHROPIC_API_KEY`,
`VOICE_PROVIDER_API_KEY` → `ELEVENLABS_API_KEY` / `CHATTERBOX_API_KEY` /
`GOOGLE_TTS_API_KEY`, `IMAGE_PROVIDER_API_KEY`, `VIDEO_PROVIDER_API_KEY`,
`MUSIC_PROVIDER_API_KEY` (not needed with a licensed library),
`STORAGE_API_KEY` → `STORAGE_ACCESS_KEY_ID` + `STORAGE_SECRET_ACCESS_KEY`.

---

## 12. Implementation plan (module by module)

1. Schema + migration + seed (12 languages, 8 base voices, provider defaults).
2. Provider interfaces + adapters + registry.
3. Content layer (cleaning, facts, timeline, characters, locations, master script, duration).
4. Language layer (profiles, localisation with per-scene caching, lint, fact parity).
5. Safety layer (scene safety, substitutes, fact check).
6. Media layer (voice catalogue/assignment/synthesis, visual prompts, placeholder art, Ken Burns).
7. Rendering layer (audio timeline, track mixing with ducking, subtitles, FFmpeg MP4 + multi-audio).
8. QC.
9. Job queue (GenerationJob, BullMQ queues, workers, inline mode, retries, fan-in).
10. StudioService + admin API.
11. Admin console pages.
12. Tests + end-to-end smoke run (inline jobs, placeholder providers, FFmpeg).

## 13. Known limits (honest status)

* With no provider keys, the output is a real, correctly timed and mixed
  MP4, but it uses **silent placeholder voices and placeholder art**. Real
  voices and illustrations need the keys in §11.
* Assamese, Odia and Punjabi voice coverage depends on your provider/plan.
  Configure `*_LANGUAGES` only for languages you've verified. Otherwise QC
  reports "no real voice for <language>".
* Subtitle timing uses each synthesised line's real duration, split across
  cues by characters within a line. This is more accurate than proportional
  timing across the whole script, but it is not word-level forced alignment.
* Burned-in subtitles and on-screen captions are rendered with libass using
  complex (HarfBuzz) shaping and fontconfig fallback, so matras, conjuncts
  and mixed-script text (e.g. Tamil with "FIR") render correctly. The render
  host needs FFmpeg built with libass and the Noto fonts for each script.
  SRT/VTT sidecar files and soft MP4 subtitle tracks always work.
* The app feed shows the story's master-language title in every language.
  Localised titles are stored in the language scripts, but the news
  pipeline's `StoryTranslation` table is not yet populated for Studio
  stories.
* With the template (no-LLM) master-script writer, narration reuses the
  article's own sentences, which QC notes. For third-party copyrighted
  articles, enable the LLM writer or rewrite the lines before publishing.

## 14. Cinematic 2.5D mode

Stories can be created with `productionMode: "CINEMATIC_25D"` (admin:
**New story → Cinematic 2.5D**). They keep everything above:

* facts, safety, master script, approval
* languages, voices, subtitles, QC

The single still per scene is replaced by directed shots rendered with the
2.5D engine. One master visual is shared by every language. Classic
stories are unchanged.

| Topic | Document |
|---|---|
| Overview and flow | `docs/architecture/2.5d-target-architecture.md` |
| Episodes, shots, overrides, state machine | `docs/architecture/shot-system.md` |
| Assets, reuse, placeholders, storage | `docs/architecture/asset-system.md` |
| Characters and locations across shots | `docs/architecture/character-continuity.md` |
| The engine | `docs/architecture/2.5d-engine.md` |
| Local AI providers and security | `docs/architecture/local-ai.md` |
| Queues, workers, GPU hosts, capacity | `docs/architecture/gpu-workers.md` |
| Shots → master visual → languages → publish gate | `docs/architecture/render-pipeline.md` |
| Model registry and licences | `docs/operations/model-registry.md` |
| Deployment and environment variables | `docs/operations/gpu-deployment.md` |
| Troubleshooting | `docs/operations/troubleshooting.md` |

Commands (in `backend/`):

```bash
npm run demo:railway -- --out ./demo-output [--preview] [--stills-only]   # engine demo, no DB needed
npm run worker:render                                                      # 2.5D + FFmpeg + QC worker
npm run worker:gpu                                                         # GPU worker (next to ComfyUI / inference-server)
ADMIN_PASSWORD='…' npm run create-admin -- --email you@example.com --role SUPER_ADMIN
npm run lint && npm run typecheck && npm test
```
