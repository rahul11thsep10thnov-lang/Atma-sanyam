# Solarpunk Botanical Conservatory — Technical Audit (Phase 1)

Scope: an audit of the repository as it stands, to decide whether a photorealistic isometric
Solarpunk Conservatory (Central Conservatory + Northern Arboretum + a permanent Grand Banyan)
can be built on the existing app. Nothing in the production app was changed for this audit.

Everything below cites real files in this repository. Where a number comes from my own
measurement it says so; where it is an estimate it says **estimate**. No test was run on a
physical phone (none was available to me), so every on-device statement is a prediction, not a result.

**Verdict in one line:** no blocker was found. The app already contains the pieces needed
(three.js, expo-gl, a safe-storage layer, a seven-size growth model). The vision is feasible,
but not by scaling up today's rendering approach, and not without a real asset and performance
budget. Details and the honest caveats are in sections 5, 6 and 10.

---

## 1. Existing architecture

| Layer | What it is | Where |
|---|---|---|
| Framework | Expo SDK 57 (`expo ~57.0.22`), React Native 0.86.3, React 19.2.3, TypeScript, Hermes, New Architecture | `package.json`, `app.json` |
| Builds | EAS; the `production` profile builds an Android App Bundle | `eas.json` |
| Navigation | react-navigation native stack plus bottom tabs | `src/navigation/RootNavigator.tsx`, `src/navigation/types.ts` |
| Persistence | AsyncStorage, wrapped by a "never overwrite what you could not read" layer | `src/storage/safeStore.ts` |
| Focus timer | A timer hook and a focus engine; a completed session earns minutes | `src/hooks/useFocusTimer.ts`, `src/spaces/focusEngine.ts`, `src/screens/ActiveSessionScreen.tsx` |
| Growth rule | Completed minutes → one of seven sizes (15, 30, 60, 90, 120, 150, 180 min) | `src/growth/size.ts` (`SIZE_MINUTES`, `sizeForMinutes`, `growthProgress`) |
| Garden ("Paradise Garden") | Painted panorama plus pre-rendered sprites | `src/paradise/**` (see section 3) |
| 3D | `three@^0.166.1` and `expo-gl@^57.0.2` are **already dependencies** and are used by the earlier garden in git history (`git show 43e2d32:src/gl/useThree.ts`, `src/gl/textures.ts`, `src/garden/scene/GardenView.tsx`) | `package.json` |
| Gestures | `react-native-gesture-handler` present; the current garden uses RN `PanResponder` and `Animated` | `src/paradise/scene/ParadiseScene.tsx` |

The app is **offline-only in v1** (no accounts, no server). All user data lives on the device.

## 2. Relevant source files

Production garden (read-only for this audit):

- `docs/PARADISE_GARDEN.md` — the design document of the current garden.
- `src/paradise/model.ts` — `PlantInstance`, `ParadiseState`, `chooseSlot`, `rehome`, `fromOldGarden`.
- `src/paradise/layout.ts` — `BEDS`, `slotsFor(segment, seed)`, Poisson-disc slot generation, `PLATE_W = 3840`, `PLATE_H = 983`.
- `src/paradise/catalog.ts` (+ `catalog.hi.ts`) — the species list (84 species, habits `tree`, `water`, `pot`…), including `banyan`.
- `src/paradise/sprites.generated.ts` and `assets/paradise/*` — the sprite pack (`plate_full.webp`, `plate_thumb.webp`, 672 pre-rendered plant images, `sprites.json`). `assets/paradise` is **45 MB**.
- `src/paradise/repository.ts` — `loadParadise`, `saveParadise`, `updateParadise`; key `focus.paradise.v1`; legacy key `focus.garden3d.v1`.
- `src/paradise/scene/ParadiseScene.tsx`, `GrowthScene.tsx`, `Ambience.tsx` — the renderer.
- `src/paradise/ui/ParadiseScreen.tsx`, `PlantCatalogSheet.tsx`, `PlantPreviewSheet.tsx` — the UI.
- `src/storage/safeStore.ts` — `readJson`, `writeJson`, `preserveUnreadable`, `isHeld`.

Prototype (new, isolated): `src/prototype/solarpunk/*` (section 9 and the prototype report).

## 3. Current garden implementation

- **It is 2.5D, not 3D.** One painted 3840×983 plate (`plate_full.webp`) is the world. Plants are
  pre-rendered Blender images, one per species and growth stage: 84 species × (seed + 7 sizes) = 672 sprites.
- **Scene graph:** one transformed `Animated.View` ("the world"); each plant is an `Animated.View` containing an `Image`
  (`ParadiseScene.tsx`). There is no depth buffer, lighting or shadow computation at runtime.
- **Camera:** exactly two states (full width, or zoomed on one segment) with sideways pan (`cameraFor`, `bounds`, `apply` in `ParadiseScene.tsx`). No rotation, no free zoom, no free pan in depth.
- **Level of detail:** a 256 px thumbnail is used when the plant is under 120 px on screen (`useThumb` in `ParadiseScene.tsx`).
- **Positions ("slots"):** `slotsFor(segment, seed)` in `layout.ts` generates a deterministic Poisson-disc scatter inside authored `BEDS`
  (rectangles on the plate). My count is about 1,350–1,400 slots across the five segments.
- **Placement:** `chooseSlot` in `model.ts` picks a free slot of the preferred depth band. If none is free the plant becomes
  **homeless (`slot: -1`)**, is kept in the data, and is not drawn.
- **Data model:** a `PlantInstance` is a permanent record of one completed focus session: `speciesId`, `segment`, `size` (1–7),
  `focusMinutes`, `plantedAt`, `sessionId`, `slot`, optional `place` (`garden` | `balcony`), plus cosmetic `rotation`, `scale`, `flip`.
  `ParadiseState` is `schemaVersion: 1`.
- **Growth during a session** is continuous (`growthProgress` in `size.ts`) and shown by `GrowthScene.tsx`; only the completed plant is saved, once per session.
- **Banyan today:** `banyan` is an ordinary, collectable species in `catalog.ts` (rarity "rare"). That conflicts with a *permanent* landmark banyan — see section 10.

## 4. Rendering capabilities

What the stack can do today:

| Need | Status in this repo |
|---|---|
| 3D vegetation | **Possible.** `three` and `expo-gl` are installed. The older 3D garden (commit `43e2d32`, `src/gl/useThree.ts`) ran three.js on expo-gl in this app. |
| PBR materials | `MeshStandardMaterial` works in three.js 0.166 on WebGL2 / GLES3. Texture maps are optional; I used vertex colours and procedural noise. |
| Soft shadows | `DirectionalLight` + `PCFSoftShadowMap` (prototype). Real shadows need a depth-capable context; expo-gl provides WebGL2 on Android and iOS. |
| Isometric camera | Perspective camera with a narrow field of view (26°) placed far away is visually isometric and keeps depth precision; a true `OrthographicCamera` also works. Implemented in `engine.ts`. |
| Zoom / pan | Implemented with a gesture layer in `SolarpunkPrototypeScreen.tsx` (two-finger pan, pinch, camera presets). |
| Glass | Alpha-blended `MeshPhysicalMaterial`-style glass was avoided (transmission is expensive and unreliable on GLES); the prototype uses a Fresnel-shaded transparent material (`materials.ts: makeGlassMaterial`). |
| Water | Planar reflection plus animated normal-style shader (`water.ts`). Costs a second scene pass. |
| Seven growth stages | Data model already supports 1–7 (`size.ts`). The prototype generates each stage procedurally (`catalog.ts: specimenGeometry`). |
| 300+ positions | Trivial in data. Cost is in drawing, not storing (section 6). |
| Expandable wings | A scene-per-wing model with its own slot table fits; the existing `segment` concept is the analogue. |
| Northern Arboretum + permanent Grand Banyan | The banyan can be a single separate, non-slotted mesh (prototype: `banyan.ts`), so it cannot be moved, deleted or replaced by any garden operation. |
| Thousands of specimens | **Not by drawing each as a mesh.** Requires instancing, strict LOD and impostor billboards (section 6). |

## 5. Technical limitations

1. **No photoreal assets exist.** The repo has painted/rendered 2D sprites, not 3D models or textures. Photoreal 3D needs authored glTF models with baked textures (or a very large procedural effort). My prototype is procedural and reads as *stylised-naturalistic*, not photographic.
2. **Mobile GL constraints.** expo-gl exposes the device's GLES driver. Float render targets, half-float PMREM environments, shadow-map precision and anisotropic filtering vary by GPU. The prototype guards those paths, but the guards are **untested on real devices**.
3. **JS-thread cost.** three.js scene management runs on the JS thread under Hermes. Thousands of separate `Mesh` objects cost CPU even before the GPU. Instancing is required.
4. **Memory.** Unique per-specimen geometry is large (prototype: about 11–27 MB for ~200 unique specimens plus the banyan). Thousands of unique meshes would not fit; shared geometry per species × stage × LOD is required.
5. **No post-processing** is practical on mid-range phones (bloom, SSAO, DOF); lighting must be baked or faked.
6. **Alpha-blended glass and water** over many overlapping layers cause overdraw; keep transparent surfaces few and simple.
7. **Build size.** `assets/paradise` is already 45 MB. Authored 3D models and textures must be budgeted against the Play App Bundle limits and download size.
8. **Accessibility / low-end devices.** A 3D scene needs a fallback (the existing 2D garden) for devices without usable WebGL2.

## 6. Performance risks

### Measured (my numbers, software GL)

Measured with headless Chromium on **SwiftShader (CPU-emulated GL)** through the web export of the real screen. **Frame times from this setup are meaningless for phones.** Triangle and draw-call counts from `renderer.info` are valid and are the useful output. Counts include both the main pass and the water-reflection pass.

| Scene | Positions | Draw calls | Triangles |
|---|---|---|---|
| Conservatory (default population) | 302 | 199 | 638k |
| Arboretum, Landscape 1 "Beginning" | 461 | 57 | 443k |
| Arboretum, Landscape 2 "Early" | 461 | 122 | 484k |
| Arboretum, Landscape 3 "Developing" | 461 | 218 | 701k |
| Arboretum, Landscape 4 "Flourishing" (~190 specimens) | 461 | 397 | **1.54M** |
| Collection shelf (18 species) | – | 75 | 485k |

The Grand Banyan alone is about **135k triangles in one draw call**. Scene build is roughly 0.8–1.4 s on the server CPU (a phone will be slower — **untested**).

### Extrapolation (estimate, not measured)

From the table, the Flourishing scene costs roughly 5–6k triangles per specimen *with the current leaf-thinning LOD*. Scaling that linearly:

| Specimens drawn | Estimated triangles per frame | Assessment (estimate) |
|---|---|---|
| ~300 | ~1.8M + landmark | Too heavy for mid-range phones; fine on high-end. |
| ~500 | ~3M | Too heavy without impostors. |
| ~1,000 | ~6M | Not viable as meshes. |
| several thousand | 20M+ | Not viable; needs a different representation. |

Working targets I would plan for, **also estimates**: about 300–500k triangles and under ~150 draw calls per frame on a mid-range Android phone, 30 fps. Hitting them with 1,000+ specimens requires:

- **LOD tiers**: full mesh near the camera, reduced mesh mid-range, **billboard impostors** (pre-rendered like the existing sprites) far away.
- **Instancing** (`InstancedMesh`) for repeated species × stage.
- **View culling** — only specimens in the current view are drawn; wings off-screen cost nothing.
- **Baked/shared geometry**, not per-specimen procedural build.
- **Water reflection** at reduced resolution and update rate (prototype already renders it every 2nd frame).
- Capping the Flourishing landscape state by quality tier.

Other risks: JS-thread stalls while building geometry (prototype hides this behind a loading overlay), memory pressure on 3–4 GB phones, battery/thermal drain from continuous rendering (render on demand when nothing is moving), and shader-compile hitches on first use.

## 7. Data preservation strategy

Principles: the Solarpunk garden must never be able to lose or alter a user's existing garden.

1. **Do not touch `focus.paradise.v1` or `focus.garden3d.v1`.** The prototype writes nothing to AsyncStorage at all (everything is in memory).
2. **Additive, versioned storage for production:** a *new* key (e.g. `focus.conservatory.v1`) holding a derived layout (slot assignments), with `schemaVersion`. Plant *records* stay in `ParadiseState`; the new layout is a pure function of those records plus a stored seed, so it can be regenerated.
3. **Reuse `safeStore`** (`readJson`/`writeJson`/`preserveUnreadable`/`isHeld`) so an unreadable value is held and copied to `<key>.unreadable` instead of being overwritten.
4. **Migration = read-only mapping.** `PlantInstance.size` (1–7) maps one-to-one to the seven growth stages; `speciesId` maps to the new catalogue. Species with no new model fall back to the existing 2D sprite. The migration runs in memory first and only writes the *new* key.
5. **Backup before first write:** copy `focus.paradise.v1` to `focus.paradise.v1.backup-<date>` once before the new system's first save; never delete it automatically.
6. **Rollback:** a feature flag (the prototype already uses `EXPO_PUBLIC_SOLARPUNK_PROTOTYPE`; production would use a runtime setting) selects the renderer. Turning it off returns to the existing garden with no data change, because the old data was never modified.
7. **Homeless plants:** today plants beyond the slot count get `slot: -1`. A larger or expandable conservatory should allocate slots deterministically and keep the "never lost" rule from `model.ts`.
8. **Banyan permanence** is structural: it has no slot and no `PlantInstance`, so no data operation can move or remove it. If the existing collectable `banyan` species is kept, it needs a different name or rarity treatment (section 10).
9. **Tests to write before any production change:** round-trip of an old state through the migration; migration with corrupt JSON; migration with `slot: -1` plants; idempotence (running it twice changes nothing).

## 8. Recommended implementation architecture

```
 PlantInstance (existing, unchanged)  ──►  ConservatoryLayout (new, derived, versioned)
        focus.paradise.v1                        focus.conservatory.v1  (new key)
                                                       │
                                  ┌────────────────────┴───────────────┐
                                  ▼                                    ▼
                           Wing / Scene definition              Slot allocator
                      (terrain, structures, lights,        (deterministic, seed-based,
                       water, banyan landmark)              never loses a plant)
                                  │
                                  ▼
                          Renderer (three.js on expo-gl)
             ┌─────────────┬───────────────┬──────────────────┐
             ▼             ▼               ▼                  ▼
        Specimen LOD    Instancing      Water / glass     Camera & input
        mesh→mesh→      per species     (reflection at    (isometric,
        impostor        × stage × LOD   reduced rate)     pinch/pan, picking)
```

- **Scenes as data:** a wing is a config (terrain, structures, slot rules, lighting) so wings can be added without engine changes (prototype: `DioramaCfg` in `diorama.ts`).
- **Specimens are views of records:** a `Specimen` is (species, stage, slot); geometry is looked up by `specimenGeometry(species, stage, variant, lod)` — in production, loaded from baked glTF instead of procedural.
- **Landmarks are separate from specimens:** the Grand Banyan is a unique permanent mesh.
- **Fallback path:** keep the current 2D garden as the default and the fallback for unsupported devices.
- **Process:** asset pipeline first (model/texture/LOD budget), then renderer, then data migration, then UI — in that order, with device testing at each step.

## 9. Prototype technology recommendation

**three.js on expo-gl**, which is what the prototype uses.

- *Pros:* already installed (no new dependency); proven in this app's history; full PBR, shadows, instancing and custom shaders; large ecosystem; glTF loading available for the production asset pipeline.
- *Cons:* JS-thread driven; no built-in LOD/impostor system (must be built); mobile GPU variance; bundle growth.

Alternatives considered:

| Option | Verdict |
|---|---|
| Keep 2D pre-rendered sprites on an isometric plate | Cheapest and most robust for thousands of items, but not interactive 3D (no free camera, no real water or glass motion). Good as the **far-LOD** and as the fallback. |
| `react-native-skia` | Excellent 2D; not a 3D engine. Would require a new dependency. Not recommended for this goal. |
| `react-three-fiber` | Convenience layer over three.js; adds a dependency and overhead without solving mobile performance. Not needed. |
| Unity/Unreal embedded | Out of scope for an Expo app; very large binaries. Not recommended. |
| Hybrid (3D near, pre-rendered impostors far) | **Recommended production direction.** |

## 10. Risks and unresolved questions

Risks:

1. **Photorealism vs. performance** is the central tension. Photoreal on mid-range phones needs authored, baked assets; procedural geometry will not get there (shown by the prototype).
2. **Asset production cost:** 30 plants + 15 trees × 7 stages × LODs is a large art task (hundreds of models/textures).
3. **Unverified on real devices:** native expo-gl behaviour, shader compilation, PMREM, shadow quality and frame rate are all unknown until tested on at least a low, a mid and a high Android phone and an iPhone.
4. **App size:** authored assets plus the existing 45 MB must stay within Play size expectations.
5. **Scope creep into gameplay:** rewards, timer and persistence must remain untouched until approved.

Unresolved questions for the owner:

1. The existing catalogue has a collectable `banyan`. Should it be removed, renamed, or kept as a normal plant distinct from the permanent landmark?
2. Is the Conservatory meant to **replace** the current garden, or live **alongside** it (a new tab / wing)?
3. Which devices must be supported (minimum Android API / RAM)? This sets the triangle budget.
4. Are the pre-rendered 2D sprites acceptable as far-distance impostors?
5. Who produces the 3D assets (commissioned artist, purchased pack with licence, or generated)? Licensing must be settled before any asset is bundled.
6. Do users who already hold ~1,000+ plants need all of them visible at once, or is a per-wing view acceptable?
7. The owner has supplied a 40-image photoreal reference collage. Who will produce or generate and license the final reference library and the 3D assets that match it? (An image generator can make concept art, but it does not produce runtime 3D models.)
8. How should the four Living Landscape states relate to progress (focus minutes, calendar time, or manual)? The prototype only lets you switch them.

No major technical blocker was found, so work continued to Phase 2.
