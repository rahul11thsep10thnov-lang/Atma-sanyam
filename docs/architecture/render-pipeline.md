# Render pipeline: shots → master visual → languages → publish

```
PLAN_SHOTS ──▶ per layer: GENERATE_LAYER_ASSET ─▶ GENERATE_MASK ─▶ GENERATE_DEPTH      (GPU, or procedural)
           ──▶ per shot:  BUILD_SCENE_PACKAGE ─▶ RENDER_SHOT | RENDER_SHOT_I2V ─▶ SHOT_QC
           ──▶ episode:   ASSEMBLE_MASTER_VISUAL                                    (FFmpeg concat)
           ──▶ language:  RENDER_LANGUAGE ×N (audio mix + subtitles + disclosure)   (FFmpeg)
           ──▶ FINAL_QC ─▶ CAN_PUBLISH gate ─▶ admin approval ─▶ publish
```

`advanceCinematic()` drives this fan-out and fan-in. It runs after every
job and queues only what is missing, with dedupe keys:

* `asset:<id>:v<versions>`
* `package:<shotId>:<hash>`
* `render:<shotId>:<hash>`
* …

## Shot durations

The audio plan decides how long each scene lasts:

1. The scene's floor is the longest narration or dialogue among all
   requested languages.
2. Shots split the scene in proportion to their planned durations.
3. Durations are rounded to whole frames.

No language's voice is ever sped up to fit the visuals.

## Scene package (`scenePackage.ts`)

`buildManifest()` combines:

* the composition plan
* the layer assets (image or rig, mask, depth)
* the render profile
* the shot's overrides

It produces the engine manifest and validates it.

* `packageHash` = hash of the manifest plus each asset version's content
  hash plus `ENGINE_VERSION`. The placeholder flag is excluded.
* A package cannot be built while a required asset is missing
  (`IncompletePackageError`).

## Shot render and cache

* RENDER_SHOT first looks for an existing READY render with the same
  `inputsHash` (= package hash), from any shot. If one exists, it is linked
  with `renderMs = 0` and no frame is rendered.
* Otherwise it renders `shot_NNN.mp4` and a thumbnail with the 2.5D engine.
* A forced re-render (Shot Inspector) bypasses the cache.

## Shot QC (`shotQc.ts`)

It probes the rendered file and checks the shot.

* **BLOCKING**:
  * codec (h264)
  * resolution and fps match the profile
  * frame count and duration
  * no black frames
  * the file is readable
  * the manifest carries the visual-reconstruction disclosure (the overlay is
    burned in at the language stage)
  * RESTRICTED or SENSITIVE rules respected
  * no minors drawn
  * every layer from a licence-cleared model
* **WARNING**:
  * placeholder assets (they block publishing, not QC)
  * too little motion
  * a layer drawn above its source resolution

## Master visual and languages

* **ASSEMBLE_MASTER_VISUAL** concatenates the current shot renders into one
  `master_visual.mp4` per episode, with no re-encode of shot content
  between shots. It also records per-scene clip boundaries.
* **RENDER_LANGUAGE** (per language) reuses that master visual and adds:
  * narration and dialogue voices, ambience and music (ducked)
  * burned-in subtitles (libass with complex text shaping for Indic scripts)
  * the localized **"Visual reconstruction"** disclosure (`disclosure.ts`;
    12 languages), drawn as an ASS overlay
* Visuals are never re-rendered per language. A language-only change (e.g.
  a corrected Hindi line) re-runs only that language's mix.

## Publish gate (`cinematicPublishGate`)

A cinematic story can be published only when every one of these holds:

* every shot has a current render that passed shot QC with no BLOCKING issue;
* no layer uses an **unresolved placeholder** (`isPlaceholder` and not APPROVED);
* no layer comes from a model that is not licence-cleared, unless it was
  explicitly overridden by an admin;
* the master visual exists and matches the current shot renders;
* plus the existing story rules: fact and safety checks, per-language QC,
  and **admin approval**. Sensitive stories are never auto-published.

Publishing marks the episode's shots `PUBLISHED` and creates the app's
`VideoAsset` rows (one per language).

## Render profiles (`engine25d/profiles.ts`)

| Key | Size | fps | Use |
|---|---|---|---|
| `portrait-1080x1920-30` | 1080×1920 | 30 | **default** |
| `portrait-1080x1920-24` | 1080×1920 | 24 | film look |
| `preview-540x960-30` | 540×960 | 30 | previews |
| `draft-270x480-15` | 270×480 | 15 | fast editorial drafts, tests |
| `landscape-1920x1080-25` | 1920×1080 | 25 | legacy classic stories |
