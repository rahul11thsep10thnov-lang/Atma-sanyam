# Migration plan: Studio → cinematic 2.5D production

Rule: extend what works, never fork it. Existing stories keep rendering
exactly as before (`productionMode = CLASSIC`); new stories default to
`CINEMATIC_25D`. Both modes share analysis, scripts, languages, voices,
audio mixing, subtitles, QC, approval and publishing.

## 1. Component decisions

### KEEP (unchanged)

| Component | Why |
|---|---|
| News ingestion (NewsAPI, RSS, mock), classification, dedup, scoring, `PipelineOrchestrator` | Upstream of the Studio; unaffected. |
| Article cleaning, fact extraction, timeline, character + location extraction (`studio/content/*`) | They feed the directors. |
| Master script + scene breakdown, duration planner | Scenes remain the narrative unit; shots subdivide them. |
| Language profiles, per-scene localisation, register lint, number parity | Language work is independent of visuals. |
| Voice catalog, voice routing, voice providers, TTS cache | Audio path unchanged. |
| Subtitles (SRT/VTT/ASS), audio timeline, mixing with ducking | Reused by the new per-language assembly. |
| Journalistic safety, scene safety, fact check | Still gate scripts; the planner consumes their output. |
| Storage abstraction, AI cache, versions table, audit log | Reused by assets, packages and renders. |
| Approval workflow + `publishStory` → `VideoAsset` | Same publishing path into the Android feed. |
| Android app | Plays any MP4. Portrait output fits its vertical feed. |

### MODIFY

| Component | Change |
|---|---|
| `GenerationJob` / `jobRunner.ts` | New job types and queues; `episodeId`, `shotId`, `assetId`, `queue`, `provider`, `model`, `gpuWorkerId`, `progress`, `cancelRequested`, `timeoutMs`, `durationMs`, `priority`; `CANCELLED` status; timeouts; cancellation; progress. |
| `studioWorkers.ts`, `runWorkers.ts` | Worker roles (`cpu`, `gpu`, explicit queue lists) and the GPU worker loop (registration, heartbeat, scheduling). |
| `StudioPipeline.ts` | Branches on `productionMode`: CINEMATIC_25D plans shots after the master script, generates layer assets after approval, renders shots, assembles a master visual, and assembles each language from it. |
| `qualityCheck.ts` / `buildQcReport` | Adds shot-level and render-probe checks and the `CAN_PUBLISH` gate with explicit reasons. |
| `config.ts` / env | Default output becomes portrait 1080×1920 @ 30 fps (render profiles). |
| `StudioService.ts`, admin routes | Episode/shot/layer/asset operations, overrides, model registry, GPU and job admin. |
| Admin Studio UI | Production tab (episode → scene → shot), Shot Inspector, Asset library, Model registry, GPU workers, Jobs. |

### EXTEND

| Component | Extension |
|---|---|
| `StudioStory` | `productionMode`. |
| `StudioScene` | `episodeId`, relation to shots. |
| `StudioCharacter` | Link to a reusable `CharacterReference` (face/hair/skin/wardrobe/expression/pose library). |
| Provider registry | Local AI providers resolved through the model registry. |
| `safeVisualLibrary.ts` | Substitutes become environment categories for the planner. |
| `rendering/ffmpegCommands.ts` | Shot encoding, concat to master visual, per-language overlay + mux, probe filters (blackdetect, freezedetect). |

### DEPRECATE (kept working, not used by new stories)

| Component | Replacement |
|---|---|
| Per-scene single image (`GENERATE_SCENE_VISUAL`, `SceneAsset`, `VisualPrompt`) | Shots + layers + assets. Still used by `CLASSIC` stories. |
| Ken Burns `zoompan` scene clips (`buildSceneClipArgs`) | 2.5D engine. Still used by `CLASSIC` stories. |
| `OpenAICompatibleImageProvider` (commercial image API) | `LocalImageProvider`. Stays pluggable for development only and is never required. |
| `HttpVideoProvider` (generic vendor I2V) | `LocalVideoProvider`. |
| "Illustration" label | Localized "Visual reconstruction" disclosure. |

### NEW

| Component | Location |
|---|---|
| Episode / Shot / ShotLayer / Asset / AssetVersion / ScenePackage / ShotRender / CharacterReference / LocationReference / PropReference / RenderProfile / AiModel / GpuWorker models | `prisma/schema.prisma` + migration |
| EpisodeDirector, ShotDirector, VisualCompositionPlanner, MotionRequirementAnalyzer | `studio/production/` |
| Environment library (32 Indian location categories), expression + pose libraries | `studio/production/library/` |
| AssetLibrary (reuse ▸ modify ▸ generate), continuity resolver, scene-package builder, shot QC | `studio/production/` |
| Local AI interfaces, ComfyUI + inference-API adapters, procedural providers, model registry/licence gate | `studio/providers/local/`, `studio/models/` |
| 2.5D engine (10 systems) + frame workers | `studio/engine25d/` |
| GPU worker, scheduler, heartbeat | `studio/jobs/gpu*.ts` |
| Reference inference server (Python) | `inference-server/` |
| Demo story script | `backend/scripts/demo25d.ts` |

## 2. Database changes (one additive migration)

New tables: `episodes`, `shots`, `shot_layers`, `assets`, `asset_versions`,
`scene_packages`, `shot_renders`, `character_references`,
`location_references`, `prop_references`, `render_profiles`, `ai_models`,
`gpu_workers`.

New columns, all nullable or defaulted, so nothing breaks:
* `stories.productionMode` (existing rows are set to `CLASSIC`)
* `scenes.episodeId`
* `characters.characterRefId`
* `generation_jobs`: `episodeId`, `shotId`, `assetId`, `queue`, `provider`, `model`, `gpuWorkerId`, `progress`, `cancelRequested`, `timeoutMs`, `durationMs`, `priority`

New enum values:
* `GenerationJobType`: `PLAN_SHOTS`, `GENERATE_LAYER_ASSET`, `GENERATE_MASK`, `GENERATE_DEPTH`, `INPAINT_ASSET`, `BUILD_SCENE_PACKAGE`, `RENDER_SHOT`, `RENDER_SHOT_I2V`, `ASSEMBLE_MASTER_VISUAL`, `SHOT_QC`
* `GenerationJobStatus`: `CANCELLED`

## 3. Phases

| Phase | Deliverable | Gate before moving on |
|---|---|---|
| 1 | This audit + target architecture + plan | — |
| 2 | Schema + migration + seed (render profiles, model registry, location library) | `prisma validate`, migrate, tests |
| 3 | Directors, composition planner, motion analyzer, libraries | unit tests |
| 4 | Local AI interfaces, adapters, procedural providers, licence gate | unit + mock-server tests |
| 5–6 | 2.5D engine (all systems) | unit tests + rendered frames inspected |
| 7–8 | Pipeline integration, FFmpeg assembly, optional I2V | integration test article → final video |
| 9–10 | Admin Studio, GPU workers, scheduling, observability | admin build + browser check |
| 11 | Railway-station demo, 1080×1920 @ 30 fps, 5 s | frames inspected |
| 12 | Hardening + docs + report | full test suite, typecheck, builds |

After each phase: type-check, tests, Prisma validation, backend and admin
builds, then a commit. The repo has no ESLint configuration, so the
strict TypeScript build is the lint step. The Android app is unaffected
and is not rebuilt.

## 4. Backwards compatibility

* `CLASSIC` stories keep the old job graph and renderer bit-for-bit.
* FFmpeg jobs (classic and cinematic) share the existing `studio-render`
  queue; the new queues are added alongside it.
* The API only adds routes. The admin UI keeps all existing pages.
