# FOCUS Plant Library — 100 Indian balcony plants

100 separate image files, one plant each, all shot on the same template, so the
collection reads as "one photographer, one balcony, one afternoon, 100 plants".

```
assets/plants/FOCUS_PLANT_LIBRARY/
  001_rose.png … 100_norfolk_island_pine.png   one file per plant, never a collage
  plant_manifest.json                           id, name, filename, category, indoor/outdoor,
                                                growth form, root type, colours, placeholder flag
assets/plants/FOCUS_100_INDIAN_PLANTS_LIBRARY.zip   built by `npm run plants:zip` (git-ignored)
```

## What is on disk right now

The 100 files committed today are **placeholders**: procedural illustrations
drawn by `scripts/generatePlantPlaceholders.mjs` on the exact final template
(same soil line, root cutaway, sunbeam, pool of light, dark balcony atmosphere),
each with the silhouette, colours and root morphology of its species. They are
512×512 so the app bundle stays small while the real renders are produced. The
manifest marks every one `"placeholder": true`.

The photorealistic renders are produced by the pipeline below, which overwrites
each file under the same name at 2048×2048 and flips its flag to `false`. Nothing
in the app changes when that happens.

## The template (the "same studio" rule)

Every image, placeholder or final:

| Element | Rule |
|---|---|
| Frame | Square. 2048×2048 for finals (placeholders 512). |
| Camera | Eye-level botanical product photography, ~50–70 mm equivalent, centred, symmetrical, no wide-angle distortion. |
| Plant | Exactly one specimen, 65–75 % of the above-ground frame, sharp. |
| Soil line | At exactly **80 %** of the image height, in every file. |
| Root zone | The bottom **20 %** is a horizontal soil cross-section showing that species' own root system (fine branching for a rose, thick fibrous for aloe, rhizomes for snake plant, a taproot for coriander, a compact pad for bonsai…). Roots never glow, never white. |
| Soil | Rich dark brown, slightly moist, granular, tiny organic particles. Sunlit at the surface, darker with depth. |
| Light | The **FOCUS sunlight signature**: a darker, peaceful, softly blurred Indian balcony in green-teal tones; a warm, hazy, volumetric shaft of sunlight from the **upper left**; a soft elliptical pool of golden-white light around the base; gentle falloff to darker corners; a few barely visible dust motes in the beam; optional extremely subtle dappled light. Never a spotlight, laser or god rays. |
| Colour | Warm, premium, natural. Sunlight is golden cream, never orange or neon. The plant's own colours stay true. |
| Background | No other plants, no pot, no planter, no text, labels, numbers, logos or watermarks. |

The reference image's look — dark green surroundings, one subject in a pool of
warm light, dust in the beam — is reproduced as lighting and atmosphere only;
the plants are photoreal, never illustrated.

## Species list

`scripts/plantLibrary/species.mjs` is the source of truth. Run
`npm run plants:manifest` after editing it. Categories: 001–030 flowering,
031–060 foliage, 061–070 succulents/cacti, 071–085 herbs/edibles, 086–100
specialty/showpiece. One change from the original brief: entry 080 was a
duplicate of 075 (Lemongrass), so 080 is now **Fenugreek / Methi**, a plant on
practically every Indian balcony.

Each row carries a `growthForm` (shrub, bushy, vine, trailing, rosette, blades,
grass, broadleaf, palm, tree, bonsai, fern, cactusPad, cactusSegment, caudex,
feather, cane, conifer) and a `rootType` (fine-branching, fibrous, taproot,
woody, adventitious, rhizome, shallow, compact, tuberous, fleshy, bulb). The
placeholder renderer draws from them, the master prompt describes them, and
`src/plants/plantLibrary.ts` exposes them to the app together with each
form's light response (sway, glossiness, translucency, shadow pattern) for the
environment engine.

## Producing the real 100 files

Every plant is a **separate generation job** with the same master prompt and
only `[PLANT_SPECIES]` swapped (`scripts/plantLibrary/prompt.mjs`), plus the
negative prompt. The pipeline is resumable and writes the manifest after every
accepted file.

```bash
# see exactly what job 34 sends
node scripts/generatePlantLibrary.mjs --print-prompt 34

# generate everything still marked placeholder (OpenAI gpt-image-1)
OPENAI_API_KEY=… ANTHROPIC_API_KEY=… node scripts/generatePlantLibrary.mjs --provider openai

# or Stability (honours the negative prompt natively)
STABILITY_API_KEY=… ANTHROPIC_API_KEY=… node scripts/generatePlantLibrary.mjs --provider stability

# specific jobs, more retries, re-do finished ones
node scripts/generatePlantLibrary.mjs --provider openai --only 1,4,34 --retries 3 --force

# QC pass over what is on disk, then package
node scripts/generatePlantLibrary.mjs --qc
npm run plants:zip        # → assets/plants/FOCUS_100_INDIAN_PLANTS_LIBRARY.zip
```

**Quality control (brief §24).** With `ANTHROPIC_API_KEY` set, every generated
image is inspected by Claude vision against the reject criteria — one plant
only, root cutaway present and ~20 %, species recognisable, photoreal, no pot,
no text, not a collage, the FOCUS sunlight look. A rejected image is saved as
`NNN_name.rejectedK.png` (git-ignored) and the job is retried. `--no-qc` skips
it. Adding another image provider is one entry in `PROVIDERS`.

**Output validation (brief §27)** runs at the end of every pipeline run and in
CI (`npm run plants:check`): 100 files, 100 unique names, every file a square
PNG, all the same size, manifest in step with `species.mjs`. The ZIP is only
written when all 100 are non-placeholders (or explicitly with `--zip`).

## Delivery in the app

`src/plants/plantImages.ts` (generated by `plants:check`) holds the hundred
`require()`s Metro needs; `plantLibrary.ts` looks them up by id. Bundling the
512 px placeholders costs ~15 MB. The 2048 px finals should not be bundled:
publish them through the existing content API and disk cache
(`src/content/cache.ts`) and keep a 512 px thumbnail set in the bundle — the
manifest and this module are already the shape that needs.

Inside the 3D balcony the plant itself is still a procedural stand-in (plants
ship as GLB per growth stage, architecture doc §K). These portraits are the
collection, store and inspection imagery, and the reference for the 3D
assets' lighting. Because the composition is fixed, each plant can later be
masked out of its background for 2.5D card use without re-rendering.
