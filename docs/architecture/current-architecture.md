# Current architecture (audit, before the 2.5D upgrade)

This audit records what exists in the repository at commit `2e6245c` (the
state before the cinematic 2.5D work started). Every later document and
change refers back to these components by file path.

## 1. Repository layout

| Area | Location | Stack | Size (approx.) |
|---|---|---|---|
| Backend API + workers | `backend/` | Node 22, TypeScript, Express, Prisma 5 (PostgreSQL), BullMQ 5 (Redis), zod, pino, vitest | ~9,000 lines |
| Admin console | `admin-dashboard/` | React 18, Vite 5, react-router 6 (no UI framework) | ~2,500 lines |
| Android app | `android/` | Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit, Room, Media3 | 39 Kotlin files |
| Docs | `ARCHITECTURE.md`, `docs/*.md` | Markdown | — |

## 2. Backend components

### 2.1 Automated news pipeline (`backend/src/modules`, `backend/src/pipeline`)

| Component | Files | Role |
|---|---|---|
| News ingestion | `modules/news-ingestion/*` (`NewsSourceProvider`, `NewsApiOrgProvider`, `RssFeedProvider`, `MockProvider`, `registry.ts`, `IngestionService.ts`) | Pulls articles from NewsAPI / RSS / mock into `RawArticle`. |
| Classification | `modules/classification/*` (`RuleBasedClassifier`, `AnthropicClassifier`, `CompositeClassifier`) | Family-relevance score + category. |
| Extraction | `modules/extraction/*` | Structured story fields from an article. |
| Dedup | `modules/dedup/*` | Merges near-duplicates into one `MasterStory`. |
| Scoring | `modules/scoring/*` | Suitability (≥ 2 min story) and quality scores. |
| Script / translation / TTS / subtitles / video | `modules/script-generation`, `translation`, `tts`, `subtitles`, `video-rendering` | Section-based script → template video (text cards). |
| Safety | `modules/safety/JournalisticSafetyService.ts`, `ContentModerationService.ts` | Allegation hedging, PII/minor moderation. |
| Orchestration | `pipeline/PipelineOrchestrator.ts`, `queue/*` | BullMQ queues `ingestion`, `classify-article`, `extract-dedup-score`, `generate-script`, `publish-language`. |

### 2.2 Video Studio (`backend/src/studio`)

The Studio is the editor-driven production line built in the previous
round. It is the part the 2.5D upgrade extends.

| Layer | Files | What it does today |
|---|---|---|
| Content | `content/articleCleaner.ts`, `factExtractor.ts`, `timelineBuilder.ts`, `characterExtractor.ts`, `locationExtractor.ts`, `articleAnalyzer.ts`, `masterScriptGenerator.ts`, `durationPlanner.ts` | Cleaning, fact extraction with verification status, timeline, characters (with minor/survivor protection), location + settings, structured master script with scenes (5–20 s each), fact-preserving compression. |
| Language | `language/languageProfiles.ts`, `languageScriptGenerator.ts`, `registerLint.ts`, `factConsistency.ts` | 12 languages, per-scene localisation with reuse, slang/abuse lint, cross-language number parity. |
| Safety | `safety/sceneSafety.ts`, `safeVisualLibrary.ts`, `factCheck.ts` | SAFE / SENSITIVE / RESTRICTED per scene, safe substitute visuals, quote verification, hallucinated-number check. |
| Media | `media/voiceCatalog.ts`, `voiceAssignment.ts`, `visualPromptBuilder.ts`, `png.ts` | 8 base voices, voice assignment, style bible + one prompt per scene, PNG encoder. |
| Rendering | `rendering/audioTimeline.ts`, `subtitles.ts`, `ffmpegCommands.ts`, `ffmpegRunner.ts` | Audio timeline (common floors for multi-audio), SRT/VTT/ASS, deterministic FFmpeg argument builders, scene-clip render with **Ken Burns zoompan on one still per scene**, track mixing with ducking, mux. |
| QC | `qc/qualityCheck.ts` | 10 checks → PASSED / NEEDS_REVIEW. |
| Providers | `providers/*` + `providers/registry.ts` | LLM (Anthropic + cache), translation (LLM/Google/passthrough), voice (ElevenLabs/Chatterbox/Google/mock + router), image (OpenAI-compatible **commercial API** / placeholder PNG), video (Ken Burns inline / generic HTTP I2V), music (library), storage (local disk). |
| Jobs | `jobs/jobRunner.ts`, `jobs/studioWorkers.ts` | `GenerationJob` rows mirrored to BullMQ queues `studio` and `studio-render`; inline mode; retries; dedupe keys; logs. |
| Orchestration | `StudioPipeline.ts` (stage per job type), `StudioService.ts` (admin operations) | ANALYZE → MASTER_SCRIPT → LANGUAGE_SCRIPT × N → AI_REVIEW → (approve) → SCENE_VISUAL × scenes + VOICE × languages → RENDER_LANGUAGE (+ PACKAGE) → FINAL_QC → PUBLISH. |
| API | `api/routes/admin/studio.ts`, `voices.ts`, `providers.ts` | `/api/v1/admin/studio/*`, `/admin/voices`, `/admin/providers`. |

### 2.3 Database (`backend/prisma/schema.prisma`)

* News pipeline: `NewsSource`, `RawArticle`, `MasterStory`, `StorySource`,
  `StoryScript`, `StoryTranslation`, `AudioAsset`, `SubtitleAsset`,
  `VideoAsset` (what the Android feed reads), users/engagement, admin.
* Studio (mapped to snake_case tables): `stories` (`StudioStory`),
  `articles`, `facts`, `characters`, `voices`, `voice_assignments`, `scripts`,
  `scenes`, `visual_prompts`, `scene_assets`, `audio_files`,
  `audio_segments`, `subtitles`, `video_projects`, `video_renders`,
  `content_safety`, `music`, `sound_effects`, `versions`,
  `generation_jobs`, `generation_logs`, `provider_configs`, `ai_cache`.

### 2.4 Storage, auth, deployment

* Storage: `lib/storage.ts` (local disk under `backend/storage`, served at
  `/media`) wrapped by `StorageProvider` (`put/url/exists/materialize/read`).
* Auth: user JWT; admin JWT with `EDITOR` / `SUPER_ADMIN`.
* Processes: API (`npm run dev`), workers (`npm run worker`) — one worker
  process runs the news queues and both Studio queues.
* FFmpeg + Noto fonts on the worker host.

## 3. Admin console (`admin-dashboard/src`)

Login, dashboard, news stories review, sources, config, and the Studio:
story list, new story form, story workspace (overview/QC, facts,
characters & voices, master-script scenes, per-language scripts & audio,
renders, jobs, versions), Voices, Providers (+ music/SFX library).

## 4. Android app (`android/`)

Feed of per-language MP4s from `VideoAsset`, language and State → District
filters, player. It is not tied to any rendering detail; it plays whatever
MP4 the backend publishes.

## 5. How a Studio video is made today

```
article ─▶ analysis ─▶ master script (scenes) ─▶ language scripts ─▶ review/approve
        ─▶ ONE still image per scene (placeholder or commercial image API)
        ─▶ Ken Burns zoom/pan per scene (FFmpeg zoompan)
        ─▶ per-language audio + subtitles ─▶ MP4 ─▶ QC ─▶ publish
```

## 6. Gaps against the cinematic 2.5D brief

| Brief requirement | Status before this upgrade |
|---|---|
| Story → Episode → Scene → **Shot** → Layer → Asset hierarchy | Stops at scene; one visual per scene. |
| Visual composition (background / midground / characters / props / foreground) | None — a scene is one flat image. |
| Local image / depth / segmentation / inpainting / I2V | Image provider is a commercial API or a flat placeholder; no depth, masks or inpainting; I2V is a generic HTTP stub. |
| 2.5D engine (parallax, camera, character motion, particles, lighting, shadows, focus, effects) | Only FFmpeg `zoompan` on a single still — a slideshow. |
| Character / location / prop references for continuity | Per-story character rows with a text "appearance"; no reusable visual references. |
| Model registry with licence gating | None (providers configured by env only). |
| GPU workers, queues per workload, scheduling, cancellation, progress | Two queues (`studio`, `studio-render`), no GPU awareness, no cancel/progress/timeouts. |
| Portrait 1080×1920 @ 30 fps default | Default was 1920×1080 @ 25 fps landscape. |
| Shot-level QC (masks, depth, black/frozen frames, licences, disclosure) and a CAN_PUBLISH gate | Story-level QC only. |
| Visual-reconstruction disclosure | A small English "Illustration" label. |

The migration plan (`migration-plan.md`) maps each gap to KEEP / MODIFY /
EXTEND / DEPRECATE / NEW.
