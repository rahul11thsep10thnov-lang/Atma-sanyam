# Architecture

## Shape

A modular monolith in two layers:

```
 dashboard (React)  ──HTTP──▶  backend/  FastAPI · SQLAlchemy · PostgreSQL · job runner
                                   │  calls
                                   ▼
                               engine/   pure Python library: no web, no database
                                   │  one subprocess per scene
                                   ▼
                        Blender (bpy, Cycles)  ─▶ PNG frames ─▶ FFmpeg ─▶ MP4
```

`engine/` can be used on its own (`python -m engine.cli`). `backend/` adds users, persistence,
versioning, jobs and the HTTP API. Nothing in `engine/` knows a story by name.

## Engine modules

| Module | Responsibility |
|---|---|
| `schema/` | The three declarative formats: Story Definition (`story.py`), asset manifests and rigs (`assets.py`), animation clips (`animation.py`) |
| `story_intelligence/` | Hindi normalisation, language detection, segmentation, character/location/dialogue/emotion/action extraction, storyboard building; `LLMProvider` interface |
| `asset_manager/` | File-based library: manifests, checksums, immutable versions, search (exact id, then metadata) |
| `character_manager/` | Rig templates, rig validation, 2D forward kinematics, facial poses, continuity checks |
| `environment_manager/` | Layered environments, anchors, lighting/weather presets, layer motion |
| `animation/` | Clip catalogue, keyframe evaluation, character state machine, transitions, lip-sync and blink overlays |
| `camera/` | Presets, keyframes, perspective projection, clipping and visibility guards |
| `audio/` | `VoiceProvider` adapters, voice registry, cache, narration/dialogue services, analysis, mixer, synthesised music/SFX |
| `composition/` | Turns one scene of a story plus library assets into a `ScenePlan` |
| `rendering/` | Blender worker, FFmpeg wrapper, scene cache, `RenderService` |
| `quality_control/` | Pre-render and post-render checks, reports |

## The central idea: the ScenePlan

```
Story Definition (JSON) ─┐
asset library            ├─▶ composition ─▶ ScenePlan ─▶ Blender worker ─▶ frames
audio timings            ─┘                  (pure data)
```

A `ScenePlan` lists every sprite in a scene with, for every frame, its 2D affine transform, depth,
opacity and visibility, plus the camera for every frame. All animation maths (rig kinematics, clip
evaluation, lip-sync, layer motion, effects, camera) runs in ordinary Python before Blender starts.
Consequences:

- **Determinism.** The plan is a function of story data, asset checksums, audio and render settings.
  Its hash is the cache key of the scene render.
- **Testability.** Rigs, animations, cameras and compositions are verified numerically without
  Blender, and again with real renders.
- **Safety.** A story file is only ever data. Blender receives numbers and image paths.
- **Reusability.** The Blender worker has no idea what a monkey is.

## 2.5D model

- Stage space: 1920×1080 reference pixels, x right, y up.
- Characters and props live on the plane z = 0. Environment layers carry a `parallax` factor; a layer
  with parallax *p* is placed at distance D/p from the resting camera and scaled by 1/p, so it looks as
  authored at rest and shifts by *p*× the camera movement. Zoom is a dolly, so push-ins produce real
  depth parallax.
- The camera is a perspective camera (45 mm). `camera/guards.py` clamps every frame so the view stays inside the
  environment's `camera_bounds` and covering layers; the composer warns when a speaker is off screen.
- In Blender no two sprites share a plane: each is lifted 0.5 px towards the camera by its rank and scaled about the
  view axis by the matching ratio, so the projection is exactly the planned one and there is no depth fighting.
- Draw order inside a depth is an explicit `order` (characters default to 100; an environment layer with
  a higher order, such as the front of a river, draws over them).

## Characters

A character is a layered cutout rig: parts with pivots in a tree, each part with named image variants
(mouth shapes, eye states). Rig templates (`biped_chibi`, `quadruped_reptile`) define which parts
realise the standard components. Animation clips target templates, never characters, and declare the
parts, states and environment features they need. Identity (art, colours, proportions) lives in the
versioned asset; expressions and poses only select variants and joint values.

## Animation layering per character and frame

1. Base clip pose (idle unless an action is active), cross-faded at clip boundaries.
2. Additive clips (breathe, nod, reactions).
3. Expression (face variants, brows).
4. Blink (seeded, deterministic schedule).
5. Talk (mouth variant or jaw angle from the loudness envelope of that character's audio).
6. Root travel (`move_to`: linear or arc) and attachment (riding on another character's part).

## Audio

Speech is generated per line through a `VoiceProvider`, cached by content hash, measured, and laid out
on the shot timeline; a shot is extended when its speech needs more time. The mixer (numpy) places
narration, dialogue, effects and music, ducks music under speech, limits peaks, and reports clipping
and loudness.

## Rendering and reliability

- One subprocess per scene (`engine.rendering.blender_worker`): isolates crashes, enforces timeouts,
  can be killed for cancellation, reports progress on stdout.
- Frames are written to `renders/temporary/<job>/<scene>/`; a restarted scene resumes from the last
  complete frame. Temporary files are removed only after the scene video has been validated.
- Finished scene videos are stored under `renders/scenes/` keyed by plan hash and are never
  invalidated by another scene failing. Re-rendering a story only renders scenes whose hash changed.
- Final assembly: FFmpeg concat of scene videos (stream copy) + the mixed story soundtrack (AAC).

## Backend

- PostgreSQL holds metadata only. Media stays on disk; the API exposes it through opaque
  `/api/v1/media/...` URLs after a safe-path check.
- Story Definitions are immutable versions (`story_versions`); `scenes` and `shots` are projections of
  the current version with stable ids.
- The asset tables mirror the file library (`AssetSyncService`); the library on disk is the source of
  truth for binary assets, the database for approvals and audit.
- Jobs: `render_jobs` rows driven by an in-process worker thread. Jobs found `running` at start-up are
  marked `interrupted` and can be resumed; completed scenes are reused from the cache.
- Auth: bcrypt password hashes, HS256 JWT, roles `admin`, `producer`, `reviewer`, `viewer`.

## Approval gates

Automatic: validation, rendering, technical QC. Human: character/asset approval, scene approval and
publishing. Unapproved assets render (so designs can be reviewed) but a story cannot be published until
its assets and scenes are approved, unless an admin explicitly overrides.

## Trust boundaries

LLM output, story JSON and uploads are untrusted: validated by Pydantic, ids restricted to
`[a-z0-9_-]`, paths resolved under configured roots, uploads checked for size and real content type.
