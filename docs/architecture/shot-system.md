# Shot system: Story → Episode → Scene → Shot → Layers

A cinematic story (`StudioStory.productionMode = CINEMATIC_25D`) keeps the
existing editorial pipeline: analysis, verified facts, safety, master script
and admin approval. On top of the approved master script it adds a
production layer.

```
StudioStory ─ MasterScript (scenes, narration, characters; unchanged)
   └─ StudioEpisode         EpisodeDirector: title, synopsis, emotional arc, render profile
        └─ StudioShot[]     ShotDirector per scene: 1–4 shots
             ├─ composition VisualCompositionPlanner: layers, camera, lights, environment, focus, effects
             ├─ ShotLayer[] one row per layer (asset link, reuse decision, depth, pose, expression)
             ├─ ScenePackage[]  versioned manifest + content hash
             └─ ShotRender[]    versioned shot_NNN.mp4 + QC report
```

## Directors (`production/`)

* **`episodeDirector.ts`** turns the scenes into an `EpisodePlan`.
  * An LLM provider is used when one is configured, with a deterministic
    rule-based fallback.
  * The result is validated, and nothing in it may add facts. Directors
    only choose *how* to show what the approved script already says.
* **`shotDirector.ts`** — `directScene(scene, ctx, position)` chooses:
  * **shot type** (ESTABLISHING, WIDE, MEDIUM, CLOSE_UP, EXTREME_CLOSE_UP,
    OVER_SHOULDER, POV, TRACKING, LOW_ANGLE, HIGH_ANGLE, TOP_DOWN, INSERT,
    CUTAWAY)
  * camera move and intensity
  * emotional purpose, and what the viewer sees
  * the duration share
  * character pose and expression
  * **Safety**:
    * RESTRICTED scenes get a substitute environment with no people.
    * SENSITIVE scenes draw people only as silhouettes.
    * Minors are never drawn.
* **`motionRequirementAnalyzer.ts`** — `analyzeMotion()` returns
  `STATIC_2_5D | ENVIRONMENT_2_5D | CHARACTER_2_5D | LOCAL_I2V_REQUIRED`,
  each with a reason, a confidence and the selected renderer.
  * I2V is chosen only for motion 2.5D cannot fake: collisions, falls,
    crowd clashes, water, vehicle accidents and chases.
  * Even then, I2V runs only when a licence-cleared local I2V model is enabled.
  * It is never chosen for SENSITIVE or RESTRICTED scenes.
* **`visualCompositionPlanner.ts`** — `planComposition()` builds the layers.
  * Layers: background plate, midground elements (e.g. a train), characters,
    props and foreground elements.
  * Each layer gets depth, placement, z-order and an asset request (prompt,
    size, reuse key).
  * It sets the acting beats (e.g. the character turns to watch the train
    pass).
  * It sets camera keyframes, lights (`cinematography.ts`), particles
    (`library/environments.ts`), focus and the grade.

The planner is deterministic. Each shot stores a `planHash`, and
re-planning keeps every shot whose plan did not change, along with its
assets and renders.

## Production state machine (`ProductionState`, shared by episodes and shots)

```
DRAFT → PLANNED → ASSETS_REQUIRED → GENERATING_ASSETS → ASSETS_READY → DEPTH_READY
      → SHOT_READY (scene package built) → RENDERING → QC_PENDING → RENDERED | QC_FAILED
      → APPROVED → PUBLISHED                          (FAILED on unrecoverable errors)
```

`advanceCinematic(storyId)` (`cinematicPipeline.ts`) moves every shot
forward by one step. It queues only the jobs that are missing, deduplicated
by key, so it is safe to call after every job, every admin action and every
check-in.

## Shot overrides (`shotOverrides.ts`)

Editors adjust a shot in the **Shot Inspector** without touching the plan.
They can change:

* camera move, intensity and focal length
* focus aperture and focus layer
* ambient light
* grain, vignette, bloom, saturation and contrast
* which particle types are disabled
* per-layer depth, extra blur, silhouette and placement
* the renderer (auto / engine25d / i2v)

Overrides are validated with zod and stored on the shot.

* They feed the scene package, so a change creates a new package hash and
  re-renders only that shot.
* **Preview** renders one 540×960 still with *unsaved* overrides.
* Every save is written to the audit log.

## Admin API (`/admin/production`, admin JWT)

| Method | Path | Purpose |
|---|---|---|
| GET | `stories/:storyId` | episode → scenes → shots tree with render + placeholder status |
| GET | `shots/:shotId` | shot detail: layers, assets, provenance, licence verdicts, package, manifest, timeline samples, renders, QC, jobs |
| PUT | `shots/:id/overrides` | save overrides (audited) |
| POST | `shots/:id/preview` | PNG still with unsaved overrides (max 2 concurrent per API process; 429 otherwise) |
| POST | `shots/:id/rerender` | force a re-render |
