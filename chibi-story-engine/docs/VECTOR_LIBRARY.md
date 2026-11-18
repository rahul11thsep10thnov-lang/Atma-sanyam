# Vector library: character, background and component expansion

This extends the existing asset library; it adds no second asset database, renderer or animation system. New assets are ordinary
`character`, `environment` and `component` assets registered through `AssetLibrary` (checksums, immutable versions, approval status).

## Format

- **Master**: an SVG per rig part / background layer / component, written by `tools/asset_forge`.
- **Runtime**: a transparent PNG rasterised *from that same SVG* with CairoSVG. The SVG is cropped to the PNG's box, so the viewBox origin and size equal the manifest origin and size (verified by `verify_ext`). Rig pivots and part origins are those of the original `biped_chibi` rig.
- **Manifests**: unchanged JSON plus optional fields `catalog_code`, `category`, `subcategory`, `related_stories`, layer `svg`, layer `scare`, part variant `svg`, and a new `component` asset type.
- **IDs**: `env-for-0001`, `char-hum-0001`, plus a human-readable `catalog_code` (`ENV-FOR-0001`). Existing ids are unchanged.

## Design system (`tools/asset_forge/kit.py`)

Every filled shape has an outline that is its fill darkened 55 %; one soft radial highlight per object; rounded forms; vegetation uses palette keys so seasons swap colours without redrawing; backgrounds are authored on a 2720 x 1480 canvas in stage coordinates; a human is about 430 px tall.

## What was built

Counts are in `docs/generated/PROGRESS_REGISTER.md` (generated from the files). Modules:

| Module | Purpose |
|---|---|
| `components_nature.py`, `components_built.py` | 227 reusable components |
| `env_kit.py`, `scene_lib.py`, `scenes_*.py` | background DSL and the 171 background designs |
| `characters_ext.py`, `figures.py` | extended biped figures and the roster of 110 |
| `build_ext.py`, `build_figs.py` | draw, rasterise, register |
| `verify_ext.py` | independent verification from the files |
| `tools/catalogue/` | master story catalogue and coverage report |

Commands (from the project root, venv active):

```
python -m tools.asset_forge.build_ext --only components,environments [--force] [--ids id,id]
python -m tools.asset_forge.build_figs [--force] [--only id,id]
python -m tools.asset_forge.verify_ext
python -m tools.catalogue.build_catalogue
python -m tools.asset_forge.progress_register
```

## Variations through the existing engine

- Lighting, weather (`clear cloudy rain fog storm snow`) and season (`spring summer monsoon autumn winter`) are grading presets in `engine/environment_manager/lighting.py`; scenes choose them with `time_of_day`, `weather`, `season`. Foliage layers carry `tint_group: foliage` so seasons recolour leaves without redrawing.
- Haunted backgrounds have layers with `scare` 1 or 2; a scene's `scare_level` (default 2, so older scenes are unchanged) hides layers above it.

## Story-to-asset mapping

`engine/story_intelligence/asset_report.py` uses the same matching as `StoryboardBuilder` and reports, per story, the matched and missing characters, backgrounds (with ranked alternatives), props, expressions and animations. `POST /stories/{id}/generate-storyboard` accepts `environment_overrides` beside `character_overrides`.

## API additions

`GET /components`, `GET /library/stats`, `GET /environments/{id}/preview?lighting=&weather=&season=&scare=`, `GET /stories/{id}/asset-report`; asset and environment payloads gain the catalogue fields.

## Legacy gap closure (second specification)

- **Views.** `CharacterManifest.views` holds extra rigs (`side`, `three_quarter`, `back`) that reuse the front rig's part ids, so every existing clip drives them; `CharacterPlacement.view` chooses one (omitted = the character's `compatibility.primary_view`, `front` for people and animals, `side` for reptiles). A missing view is a composer error, never a silent substitute. Side and back are drawn per angle (`tools/asset_forge/characters_views.py`); three-quarter is the front art turned about the vertical axis (near half kept, far half foreshortened).
- **Versioned upgrades.** `tools/asset_forge/upgrade_originals.py` re-runs the original drawing code, refuses to proceed unless every front part matches version 1 pixel for pixel, then registers version 2 through `AssetLibrary.update`; version 1 stays in `versions/v1` with its checksums and stories pinned to it keep using it. `build_reptiles.py` does the same for the crocodiles (rest pose compared with v1).
- **Reptile rigs.** `quadruped_reptile` (extended, optional chest / neck / three tail segments; version 1 still loads), `chelonian` (shell, neck that retracts behind a shell lip) and `serpentine_reptile` (chain of segments, tongue); templates may declare `optional_components` (a snake has no limbs). 20 new clips. `tests/acceptance/test_species_rigs.py` checks validity, runs the clips through the composer and checks that parts stay attached.
- **Compositions.** `env_kit.recompose` builds medium and close-up variants (`env-xxx-0001-medium`, `-closeup`, `composition_group` = the wide id): far layers thinned or dropped, mid-ground limited to a focal window and redrawn larger with fewer elements, anchors pulled together and scaled up. Sky, wall and ground are shared across compositions (they are the place's identity). Built for the 45 backgrounds the tracked stories resolve to plus the three most general of each category.
- **Research.** `python -m tools.catalogue.research` fetches real contents pages and indexes, parses them and writes `stories/research/` (sources with sha256, records, register) and `docs/generated/STORY_RESEARCH_REGISTER.md`. Evidence levels and verification statuses are defined in the script's docstring; a Wikipedia mention alone never verifies a story.
- **Completion register.** `engine/asset_manager/completion.py`, `GET /library/completion` and the dashboard card count what is registered and validated.

## Honest limits

See "Known gaps" in the progress register. In short: front views only; no wide/medium/close-up variants; original characters were not redrawn; a story catalogue seed, not a complete or verified one; every new asset is `pending` and needs human review. Several background designs reuse the same component vocabulary (the interiors especially); they differ in composition, not in a hand-drawn way.

## Tests

`tests/acceptance/test_vector_library.py` (counts, alignment, uniqueness, pending status, scare/season/weather, pipeline with new assets, report, catalogue), `tests/integration/test_library_api.py` (API), and the browser test `frontend/e2e/production.e2e.mjs`.
