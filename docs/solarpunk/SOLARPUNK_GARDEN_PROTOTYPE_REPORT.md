# Solarpunk Botanical Conservatory — Visual Prototype Report (Phase 2)

An isolated, working, interactive prototype. It does **not** replace the existing Garden and
does **not** touch the focus timer, rewards, coins or any saved data. Phase 3 has **not** been started.

Companion document: [`SOLARPUNK_GARDEN_TECHNICAL_AUDIT.md`](./SOLARPUNK_GARDEN_TECHNICAL_AUDIT.md).

## 1. How to open it

The prototype is hidden unless a build flag is set, so a normal build contains none of it.

```powershell
# in C:\dev\focus-app
$env:EXPO_PUBLIC_SOLARPUNK_PROTOTYPE = "1"
npx expo start
```

Then: **Settings → About → "Solarpunk garden prototype"**. (The flag-off check is in section 8.)
To remove the prototype completely, delete `src/prototype/` and the four small flag-gated edits listed in section 6.

## 2. What was built

Scenes (switch with the tabs at the top):

| Scene | Contents |
|---|---|
| **Conservatory** | Curved glass geodesic dome, stone paths, ponds with moving water, solarpunk lanterns and solar-trees, sunlight shafts, shadows, 302 planting positions |
| **Arboretum** (Northern) | Glass dome, **Grand Banyan** with aerial and pillar roots, circular stone path, reflecting pond, lotus, lilies, koi, bridges, mossy rocks, 461 positions |
| **Collection** | A shelf of all 18 species in the selection UI, each with its actual model and a growth-stage strip |

Content:

- **10 plants:** Rose, Jasmine, Marigold, Hibiscus, Orchid, Lotus, Lavender, Sunflower, Monstera, Fern.
- **8 trees:** Banyan, Peepal, Neem, Mango, Coconut, Gulmohar, Cherry Blossom, Japanese Maple.
- **Growth stages:** every species has real, different geometry at **7 stages** (the app's seven sizes), not just 3.
- **Four Living Landscape states** of the same arboretum: Beginning, Early, Developing, Flourishing (0 / 34 / 90 / 190 specimens). The banyan's mesh is the same object in all four (verified: identical object id across states).
- **Three lighting looks:** day, golden hour, dusk.

Interaction (verified with real touch events in a browser):

- two-finger pan, pinch zoom, **Overview** and **Close-up** camera buttons, plus a Landscape camera for the arboretum;
- tap a plant → inspect card (name, Hindi name, stage, simulated "grow one stage");
- tap the banyan → landmark card ("permanent landmark"); it has no move / delete / replace action;
- **Plant something** → pick a species → all free positions light up → tap one to place (simulated, in memory);
- the Collection tab selects any of the 18 species and shows its seven growth stages.

## 3. Screenshots

All taken from the real React Native screen (web export) in headless Chromium with software GL.
Colours and softness will differ on a phone GPU.

| # | File | Shows |
|---|---|---|
| 01 | `screenshots/01_conservatory_overview.jpg` | Central Conservatory, overview |
| 02 | `screenshots/02_conservatory_closeup.jpg` | Conservatory close-up |
| 03 | `screenshots/03_conservatory_golden.jpg` | Golden-hour light |
| 04 | `screenshots/04_conservatory_dusk.jpg` | Dusk light |
| 05 | `screenshots/05_arboretum_overview.jpg` | Northern Arboretum, whole dome |
| 06 | `screenshots/06_banyan_landmark_card.jpg` | Tapping the Grand Banyan |
| 07 | `screenshots/07_banyan_closeup.jpg` | Banyan close-up |
| 08–11 | `screenshots/08…11_landscape_state*.jpg` | Four Living Landscape states |
| 12 | `screenshots/12_collection_all18.jpg` | Selection UI with 18 models |
| 13–15 | `screenshots/13…15_collection_growth_*.jpg` | Growth stages: Rose, Banyan, Monstera |
| 16 | `screenshots/16_placement_free_positions_lit.jpg` | Placement demo: free positions |
| 17 | `screenshots/17_placed_plant_inspect_card.jpg` | Placed plant + inspect card |
| 18 | `screenshots/18_grown_to_stage4_simulated.jpg` | Simulated growth |

## 4. Architecture

All code is under `src/prototype/solarpunk/` (about 4,650 lines across 14 files); nothing else imports it except the flag-gated route.

| File | Role |
|---|---|
| `SolarpunkPrototypeScreen.tsx` | The RN screen: `GLView`, gesture layer, themed UI, scene tabs, cards. Exposes `globalThis.__solarpunk` for testing. |
| `engine.ts` | `Engine`: renderer, camera (isometric-style, 26° FOV), lighting looks, picking/tap, placement mode, LOD update, render loop, stats. |
| `scenes.ts` | `createConservatory`, `createArboretum`, `createCollection`, `LANDSCAPE_STATES`, per-scene camera views. |
| `diorama.ts` | `Diorama(cfg)`: builds terrain, stone, lanterns, dome, water, grass, lily pads, sun shafts, pollen, koi from a config. Wings = more configs. |
| `garden.ts` | `Slot` (fixed position), `Specimen` (species at a stage), `Garden`: add/remove/setStage, markers, nearest-marker picking, LOD. |
| `catalog.ts` | 18 species, `specimenGeometry(species, stage, variant, lod)` with caching. |
| `plants.ts`, `trees.ts` | Procedural builders for the 10 plants and 8 trees (7 stages each). |
| `banyan.ts` | `buildGrandBanyan()`: ~135k triangles, one draw call; trunk, 8 limbs, canopy, aerial and pillar roots. |
| `geo.ts` | `GeoBuilder`: merged vertex-coloured geometry, leaf-thinning LOD, wind attribute. |
| `materials.ts` | PBR plant/rock/metal materials, glass, procedural textures, sky dome. |
| `water.ts` | `Water`: planar reflection and animated surface. |
| `structures.ts` | Terrain, plinth, flagstones, rocks, bridges, lanterns, solar-trees, geodesic dome. |
| `rng.ts` | Seeded random and noise. |

Design decisions that matter for production:

- **Slots vs. specimens:** a `Slot` is a fixed position; a `Specimen` occupies a slot at a stage. This mirrors the app's `PlantInstance.slot` and `size`.
- **Banyan is not a specimen.** It is a separate mesh with no slot, no setter and no UI path to delete or move it.
- **One merged geometry per specimen** (one draw call each), cached by species × stage × variant × LOD.
- **Isolation:** no AsyncStorage use, no imports from `src/paradise`, `src/hooks`, or the timer.

## 5. Rendering technology and assets

- **Renderer:** three.js 0.166.1 on expo-gl 57.0.2 — **both already installed; no new dependency was added.**
- **Materials:** `MeshStandardMaterial` (PBR metalness/roughness), ACES tone mapping, sRGB output; hemisphere light plus one shadow-casting directional sun with PCF-soft shadows; an optional PMREM environment map used only when the device supports it.
- **Water:** planar reflection (scene re-rendered mirrored, every 2nd frame) with an animated shader surface.
- **Glass:** Fresnel-shaded transparent panels with a fake sky reflection. Not true refraction.
- **Foliage movement:** a vertex-shader sway driven by a per-vertex wind attribute (patched into the standard material with `onBeforeCompile`), plus swimming koi and drifting pollen.
- **Assets:** **none were created or reused as files.** Every plant, tree, rock, bridge and the banyan is generated procedurally in code at runtime; textures are procedural noise. So there is no asset licensing question for the prototype, and also no authored art.
- **Level of detail:** leaf-thinning LOD (full / 40% / 20% of leaves) chosen by on-screen height.

## 6. What changed in existing files (flag-gated)

| File | Change |
|---|---|
| `src/config/features.ts` | `SOLARPUNK_PROTOTYPE` = `EXPO_PUBLIC_SOLARPUNK_PROTOTYPE === '1'` |
| `src/navigation/types.ts` | adds the `SolarpunkPrototype` route type |
| `src/navigation/RootNavigator.tsx` | route registered (and the screen `require`d) only when the flag is on |
| `src/screens/SettingsScreen.tsx` | a link under "About", only when the flag is on |

No change to the garden, timer, rewards, persistence or any asset.

## 7. Performance observations

**Honest scope:** no phone was available. The only renderer here is software GL (SwiftShader) in headless Chromium, so **frame rates are not reported** — they would be meaningless. What is reliable is how much work the scene asks of a GPU (triangles, draw calls) and memory.

| Scene | Positions | Draw calls | Triangles |
|---|---|---|---|
| Conservatory | 302 | 199 | 638k |
| Arboretum, Beginning | 461 | 57 | 443k |
| Arboretum, Early | 461 | 122 | 484k |
| Arboretum, Developing | 461 | 218 | 701k |
| Arboretum, Flourishing | 461 | 397 | **1.54M** |
| Collection (18 shown) | – | 75 | 485k |

(Counts include the reflection pass. Geometry memory 11–27 MB. Scene build about 0.8–1.4 s on a server CPU.)

Interpretation:

- Beginning/Early states are plausible for a modern mid-range phone **(estimate, unverified)**.
- **Flourishing is too heavy for mid-range phones as it stands** (1.5M triangles; I plan for roughly 300–500k).
- This is with only ~190 specimens. Hundreds more is not feasible without instancing, stronger LOD and billboard impostors (audit §6).
- The prototype renders continuously; production should render on demand.

## 8. Verification done

- `tsc --noEmit` passes.
- Web export of the real screen with the flag on renders and responds to touch (real CDP touch events for pan/pinch; tap on plant and banyan).
- The banyan's object identity is identical in all four landscape states.
- **Flag-off build** (`expo export --platform android` without the flag): succeeds. The prototype's code is **not** in the bundle (searches for `Grand Banyan`, `buildGrandBanyan` and `__solarpunk` find nothing). Two harmless strings remain, the settings-link label and the route name, because the link is gated by a `false` constant rather than removed; the link is never shown.

Not verified:

- **Anything on a physical device** (Android or iOS), including expo-gl native context creation, shader compilation, PMREM support, shadow quality, battery and heat.
- Behaviour on low-end GPUs or with the GL context being lost and restored.
- Accessibility (screen readers) for the 3D canvas — the surrounding UI has labels, the canvas itself does not.

## 9. Limitations (not hidden)

1. **Not photoreal.** Procedural geometry with vertex colours looks stylised-naturalistic. Photoreal needs authored models and baked textures.
2. **Weaker species:** Peepal, Neem and Coconut still look sparse; plants look small relative to the dome in the overview.
3. **Glass is faked** (no refraction); **water reflection hides plants and grass** to save cost, so reflections are partial.
4. **Shadows** are one sun, one shadow map; fine contact shadows under small plants are limited.
5. **A pinch test showed a slight camera-target drift** (probably a quirk of simulated touch); not investigated on a real device.
6. **Software-GL only** — see section 8.
7. **Picking** uses simple proxies for the banyan (trunk + canopy), and nearest-marker for placement, not pixel-exact.
8. **Simulated, not real:** growth-by-tapping, planting, the landscape states, the specimen counts, and every "inspect" card. None of it reads or writes real garden data.

## 10. Implemented vs. simulated

| Real in the prototype | Simulated / not implemented |
|---|---|
| 3D rendering of all scenes, lighting, shadows, water, wind | Connection to focus sessions, coins, rewards |
| 18 species × 7 growth-stage models | The other 20 plants and 7 trees; all other greenhouse wings |
| Gesture camera, picking, placement flow | Saving anything; migration of the real garden |
| Banyan permanence in the data model | Banyan rules versus the existing collectable `banyan` species |
| Four landscape states | Rules for when a state applies |

## 11a. Gap to the owner's reference collage

After the prototype was built, the owner supplied a 40-scene photorealistic reference collage (and a prompt to generate it). I **cannot generate images** (no image-generation tool is available to me), so that collage has not been produced by me and is not part of this repository.

Comparing that reference with the prototype, honestly:

- The reference is photographic: real bark and leaf textures, global illumination, true glass refraction, hundreds of distinct flowers per bed, a many-trunked banyan with hundreds of golden aerial roots. The prototype is procedural, vertex-coloured geometry with simple lighting: recognisably the same layout ideas (glass dome, circular path, banyan with roots, lotus pond) but **clearly stylised and much sparser**.
- Reaching the reference look in an *interactive* phone app needs authored/baked assets (photoscanned or hand-modelled textures, baked lighting, impostors), not more procedural code. The reference images are best used as the **art-direction target for a 3D artist or an asset pipeline**, and as concept art; they are 2D pictures and cannot by themselves become interactive 3D.
- Zones in the reference that the prototype does **not** have: waterfalls and streams, elevated glass walkways, Japanese/zen garden, bamboo, desert, vertical garden, orchard, vegetable and herb gardens, hydrangea, olive/cypress. Those would be future wings.

## 11. Recommended next steps (only after approval)

1. Decide the open questions in the audit §10 (banyan species conflict, replace vs. alongside, device floor, asset source).
2. Test the prototype on real devices (one low, one mid, one high Android; one iPhone) and record frame time, memory and heat.
3. Build the LOD/impostor/instancing layer and re-measure at 500, 1,000 and 3,000 specimens.
4. Define the asset pipeline (glTF, texture sizes, triangle budgets per LOD) and commission or buy assets with clear licences; replace the procedural plants for the hero species first.
5. Design the additive data layer and migration (audit §7) with tests before any production write.
6. Only then plan Phase 3.

Phase 3 is **not** started. Waiting for your approval.
