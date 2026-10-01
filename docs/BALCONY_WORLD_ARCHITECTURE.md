# FOCUS — Balcony World: architecture

*Deliverables A–O requested before implementation. Written against the project as
it is today (inspected 2026-10-01), not against an imagined one.*

---

## 0. What exists today (STEP 1–2: inspection and current architecture)

| Area | What's there |
|---|---|
| Framework | Expo SDK 57 (managed workflow, `expo-dev-client` + EAS builds), React Native 0.86, React 19, TypeScript. Targets Android **and** iOS from one codebase. |
| Navigation | React Navigation 7: a native stack (`Tabs`, `ActiveSession`, `ContentBrowser`, `Auth`) over a bottom-tab navigator (`Home`, `History` → currently the SVG Balcony, `Settings`). |
| State | React contexts (`SettingsContext`, `RemoteConfigContext`, `AuthContext`). No Redux/Zustand. The SVG balcony uses a subscribe-able `BalconyEngine` class + a hook. |
| Persistence | AsyncStorage for settings/history/balcony state; SecureStore for auth tokens. Remote: `backend/` (Express 5 + Drizzle + PostgreSQL) with public `/v1` + admin `/admin/v1`, already deployed on Render. |
| Assets | `assets/` (icons, splash, `images/art/*.png`, wallpaper). Metro bundles everything referenced by `require()`. Remote content library (images) already streams from the API with a disk cache (`src/content/`). |
| Focus timer | `useFocusTimer` (running / grace / completed / failed) driven by `ActiveSessionScreen`; `handleComplete(outcome, failureReason, revealedFraction)` is the single completion point that saves `SessionRecord` and tracks analytics. **This is the one seam the Balcony World hooks into.** |
| Rewards / coins / store | **None yet.** The SVG balcony has a minute-threshold reward table, plant growth and a jigsaw puzzle (`src/balcony/engine/*`) — pure logic, reusable. No currency, no inventory, no store. |
| Localization | None (English strings inline; remote-config `texts` for a few). |
| Animation | RN `Animated` (native driver) + `react-native-svg`. `react-native-gesture-handler` is installed but unused beyond the root view — the camera and placement gestures will use its `Gesture` API. |
| Already installed for this feature | `expo-gl ~57.0.2`, `three ^0.186`, `expo-audio ~57.0.5`, `expo-asset ~57.0.17` (added in this wave; all SDK-57-pinned). |

---

## A. Product architecture

**The loop:** focus → earn coins + progress → acquire plants/decor → place them → the space fills → unlock the next environment. The balcony is a *visual record of focused time*: every object on it exists because of a session.

**Three progression systems feed one space:**

1. **Plants** grow across sessions (seed → sprout → small → mature → large); broken sessions wilt, future sessions revive. Emotional, per-object progress.
2. **Jigsaw artwork** reveals piece by piece across milestones; completed art becomes a framed wall object. Long-horizon collectible.
3. **Coins** (earned per completed minute, with bonuses) buy catalog items and, eventually, new environments. Open-ended choice.

**Spaces:** a user owns one *active* environment at a time and keeps every environment they've unlocked (switchable, each with its own placed objects). A newly unlocked space is **furnished but waiting for its owner**: sofa, table, lamp, rug, one planter, one wall piece — and ~60% of its placement zones free.

**Surfaces:** every environment exposes typed placement zones — `floor`, `wallLeft`, `wallRight`, `railing`, `ceiling` (hanging), `table` (small objects) — plus one designated **Personal Wall** slot for the user's own portrait (private, never synced without consent).

**UI philosophy:** the scene is the screen. One quiet action bar (Focus · Store · Edit · Sound · Camera-reset). No HUD text floating in the world. Store, inventory and inspection open as sheets over the scene, and "Try in balcony" places a ghost object into the live scene before purchase.

**Emotional target:** Forest → "I grew a forest." FOCUS → **"I built my own space."**

## B. Technical architecture

Ten modules under `src/balconyWorld/`, each with one job, none importing React except `ui/`:

```
                ┌──────────────── ui/ (screens, sheets, action bar) ───────────────┐
                │                                                                 │
   gestures ───►│  CameraController   PlacementController   AudioEngine            │
                │        │                    │                 │                 │
                │        ▼                    ▼                 ▼                 │
                │  ┌──────────────── BalconyEngine (three.js scene) ───────────┐  │
                │  │  EnvironmentLoader → geometry, lighting, sky, zones        │  │
                │  │  ObjectSystem      → place/move/remove, collision, LOD     │  │
                │  │  AssetCatalog      → id → GLB/texture/audio (+placeholders)│  │
                │  └────────────────────────────────────────────────────────────┘  │
                │                 ▲                                ▲              │
                └─────────────────┼────────────────────────────────┼──────────────┘
                     WorldRepository (save state)          RewardSystem · StoreSystem
                     AsyncStorage now, API later            (pure TS, reuse src/balcony/engine)
```

- **BalconyEngine** owns the three.js `Scene`, `Renderer`, render loop (render-on-demand), quality profile, and the registry of live objects. Framework-agnostic class; the screen only hands it a GL context and gestures.
- **EnvironmentLoader** turns an `environment.json` into geometry + materials + lights + sky + placement zones. Procedural shells (walls/floor/railing from parameters) *or* a GLB shell per environment — both paths produce the same `EnvironmentRuntime`.
- **ObjectSystem** instantiates catalog items into the scene, validates placements against zones, resolves collisions (AABB), applies scale/rotation limits, handles ghost (preview) objects.
- **AssetCatalog** maps `assetId → { glb | procedural, textures, thumbnail, audio, placement rules }`. Placeholders are first-class entries flagged `placeholder: true`, so the business logic never knows whether an asset is final art.
- **CameraController / PlacementController** translate gestures into camera orbit/pan/zoom or raycast placement. Pure math; testable without a device.
- **AudioEngine** layers looping emitters per environment (birds, wind, water, city, music) with per-layer volume and distance/angle attenuation computed from camera pose.
- **RewardSystem / StoreSystem** are pure TS (coins, inventory, unlocks, prices) — the existing `src/balcony/engine/{PlantGrowthManager,RewardManager,PuzzleManager}` move here unchanged.
- **WorldRepository** persists `UserEnvironment`/`UserPlacedObject` etc. locally first; the same shapes POST to the existing API when cloud sync is added (the schema below is designed to map 1:1 onto Drizzle tables).

## C. 3D vs 2.5D recommendation

**Recommendation: true 3D (three.js on expo-gl), with a 2.5D-style LOW quality profile of the same scene — not two codebases.**

Why 3D is practical here:

- **The exact behaviour you asked for comes free.** A perspective camera makes a plant placed at the far end of the floor smaller than one at the railing, a lantern hung on the far wall foreshortens correctly, and a dragged object's size follows its depth — no hand-tuned 2.5D scale curves that fall apart the moment the camera moves.
- **Placement is a raycast, not a guess.** Floor, two walls and railing are real planes; "object attaches to the wall plane" is literally a ray hit + normal, and "never passes through a wall" is a bounds test against the actual room.
- **Camera exploration (zoom/pan/orbit/double-tap-to-inspect) is the native vocabulary of a 3D scene.** In 2.5D every new camera move means re-authoring parallax layers.
- **Asset pipeline:** optimized GLB + compressed textures is what artists produce; 2.5D needs every object re-rendered as sprites per angle.
- **Cost on phones:** a balcony is a *small* scene — one room shell, a sky dome, <100 low-poly props, baked/ambient lighting. Budget: ≤150k triangles, ≤24 draw calls idle, textures ≤1024px, no real-time shadow maps on LOW/MEDIUM (contact "blob" shadows instead). This runs on 2018-era Android at 30–60 fps. `expo-gl` works in Expo Go and EAS builds without ejecting; it already ships in SDK 57.
- **Battery:** render **on demand** (a frame only when the camera/objects/animations are dirty), 30 fps cap for ambient motion, pause entirely when the tab is unfocused or the app is backgrounded.

What "near-photorealistic" actually depends on: **assets and lighting, not the engine.** Baked lightmaps / vertex AO on the shell, PBR materials with real albedo+roughness textures, an HDRI-derived sky gradient per environment. The engine built now renders those as soon as they exist; today's procedural shell and props are explicit placeholders (section K).

Rejected: **react-native-filament** (higher fidelity, but needs the New Architecture and a less mature Expo story; revisit if Expo Go support lands); **Unity/Unreal embed** (APK +30–80 MB, two build systems, not "lightweight"); **pure 2.5D (Skia layers)** — good for the wallpaper, wrong for an explorable, placeable room.

## D. Camera system

Orbit camera around a **target point inside the balcony**, with everything clamped:

| Parameter | Default | Limits | Gesture |
|---|---|---|---|
| `yaw` (around vertical) | 0° (facing the railing) | −35° … +35° | one-finger drag (horizontal) |
| `pitch` | 8° (slightly above eye line) | −4° … +28° | one-finger drag (vertical) |
| `distance` (zoom) | 4.6 m | 2.2 … 6.5 m | pinch |
| `target` | balcony centre, 1.0 m up | within the room's inner box (padded) | two-finger drag |

- **Inertia:** velocity from the last gesture frame decays with exponential damping (`0.88/frame`), stopped by the clamps — never bounces off a wall.
- **Double-tap:** raycast to an object → animate `target` to its centre and `distance` to ~1.6× its bounding radius (ease-out, 450 ms). Double-tap on nothing → reset.
- **Reset button:** returns to the environment's `camera.default` with the same easing.
- **No see-through:** near plane 0.1 m; walls have backfaces culled *and* the distance clamp keeps the eye inside the shell; the ceiling overhang hides the top edge at max pitch.
- **Field of view:** 50° portrait, 42° landscape; the environment file can override.
- `CameraState` is persisted per environment so the user's last view is restored.

Low-end profile: inertia on, but the render loop drops to 30 fps and object animations pause during gestures.

## E. Object placement system

**Zones** come from the environment file as rectangles on a named plane:

```json
{ "id": "floor-main", "surface": "floor", "origin": [0,0,0], "normal": [0,1,0],
  "size": [3.6, 2.2], "maxObjects": 24 }
```

**Flow:** select (inventory/store) → ghost object follows the finger → raycast against *only* the zones compatible with the item's `placementType` → snap: floor items sit on y=0 with yaw-only rotation; wall items align to the wall normal, flush, with pitch locked; railing items clamp to the rail line; hanging items attach to the ceiling plane. Haptic tick on a valid position, red tint on invalid.

**Validation (pure function, unit-testable):** inside zone rect → no AABB overlap with other objects (tolerance 2 cm; wall and floor objects don't collide with each other) → scale within catalog `scaleLimits` → zone object count < `maxObjects` → environment total < profile limit. On failure: show why, offer "place anyway?" never — invalid is invalid; nudge to the nearest valid spot if within 15 cm.

**Edit mode:** tap to select (outline), drag to move, two-finger twist to rotate, pinch to scale (if allowed), trash / duplicate (if owned ×n). Positions save on gesture end (debounced 300 ms). "Rearrange" is non-destructive; nothing is lost on cancel.

**Crowding warning** at 80% of the environment limit: "Your balcony is getting full — unlock a new space?" shown once per threshold.

## F. Audio system

- `expo-audio` players, one per **layer**: `birds`, `wind`, `water`, `city`, `insects`, `music`, each a seamless loop (loops authored with equal-power crossfade tails; files ≥ 45 s to avoid audible repetition; two variants per layer alternated at random on each loop).
- Mixer: master × layer × environment-defined base gain. Per-layer mute. Settings persist.
- **Spatialization (V1, mobile-safe):** each emitter has a 3D position (`fountain` on the left wall, `birds` outside at +3 m past the railing, `city` far back). Gain is attenuated by distance to the camera; stereo bias is derived from the angle between the camera's forward vector and the emitter and applied as a *left/right volume split* using two mono players per positional layer (expo-audio exposes volume but no pan). Wind is non-positional. Future: a small native pan module or `react-native-track-player` for true per-player panning.
- Ducking: music drops 6 dB while a session is active; birds/wind fade to 70% so nothing is attention-grabbing over 2 hours.
- Lifecycle: start on scene mount, fade out on blur/background within 600 ms, respect the OS silent switch on iOS, honour the app's existing sound setting.

## G. Data model

Local-first shapes, designed to map 1:1 onto Drizzle tables when cloud sync is added. Asset binaries never go in the DB — only references.

```ts
Environment        { id, name, style, price: { coins?, product? }, thumbnail, shell: { kind: 'procedural'|'glb', ref }, lighting, sky, zones: PlacementZone[], defaultObjects: DefaultObject[], audio: AudioLayer[], camera: CameraPreset, limits: { maxObjects } }
UserEnvironment    { id, userId, environmentId, unlockedAt, active, customizationData: { wallColor?, railingStyle? } }
UserPlacedObject   { id, userEnvironmentId, assetId, position: [x,y,z], rotation: [x,y,z], scale, placementSurface, zoneId, growth?: PlantGrowthState, artworkId?, createdAt, updatedAt }
Asset              { id, name, category, kind: 'glb'|'procedural'|'sprite', uri, thumbnail, placementType: 'floor'|'wall'|'railing'|'ceiling'|'table', footprint: [w,d,h], scaleLimits: [min,max], rotationAllowed, audio?, animation?, placeholder: boolean }
StoreItem          { id, assetId, priceCoins?, priceProductId?, rarity, unlockRequirement?, environmentCompatibility: string[]|'all', limitedUntil?, featured }
UserInventory      { userId, assetId, quantity, acquiredVia: 'coins'|'reward'|'event'|'purchase', acquiredAt }
UserCurrency       { userId, coins, lifetimeEarned, lifetimeSpent, updatedAt }
Achievement        { id, title, condition, rewardCoins?, rewardAssetId?, rewardArtworkId? }
FocusSession       = existing SessionRecord + { coinsEarned, growthApplied }
PlantGrowthState   { stage, health, focusMinutes, lastSessionAt }         // = src/balcony/types Plant
ArtworkPuzzleState { artworkId, piecesRevealed, totalPieces, revealOrder, status }  // = existing PuzzleState
AudioEnvironment   { environmentId, layers: { layerId, gain, position? }[] }
WallDecoration     { placedObjectId, frameId, imageSource: { kind: 'bundled'|'user'; uri }, lighting?: boolean, isPrivate: true }
CameraState        { userEnvironmentId, yaw, pitch, distance, target }
```

Private images (`WallDecoration.imageSource.kind = 'user'`) stay in the app's sandboxed storage; the sync payload carries only a flag, never the bytes, until the user explicitly shares.

## H. Store system

Catalog-driven: `assets/catalog/*.json` (bundled starter set) + the same shape served by the API (`/v1/store`) later — the app merges both, remote wins. Sections: My items · New · Plants · Furniture · Wall art · Lighting · Water · Decor · Premium · Environments.

Each card: thumbnail, name, one-line description, price with a coin/₹ indicator, rarity, compatible environments. **Try in balcony** opens edit mode with a ghost object (section E) → *Buy & place* or *Cancel*.

Purchase paths all end in one `grantAsset(assetId, via)`: coins (local debit, server-authoritative later), achievement reward, event, or real money (`expo-in-app-purchases`/RevenueCat later — the store never knows which). Receipts verify server-side before `grantAsset` when IAP ships; nothing in the client is trusted for paid items.

## I. Coin / reward system

- **Earning:** `coins = floor(minutes × 2)` for a completed session, +25% for sessions ≥ 60 min, +10 per 7-day streak day. Broken sessions earn 0 (and wilt the active plant — no coin penalty; motivation, not punishment).
- **Spending:** catalog prices in a 50–5000 coin band; environments 2500–8000. Tuned so a daily 50-minute focuser unlocks something small every 2–3 days and a new environment every ~6 weeks.
- **Rewards beyond coins:** the existing minute-threshold table (10/25/45/…/500) keeps granting *free* starter items so a new user's balcony changes within their first week regardless of coins.
- All constants live in `rewardConfig.ts` / remote config, never in logic.

## J. Environment system

`assets/environments/<id>/environment.json` (+ shell GLB, lightmaps, thumbnail, audio refs). Adding an environment = adding a folder; `EnvironmentRegistry` discovers it at build time (bundled) or from `/v1/environments` (remote). Nothing in the engine references an environment by name.

Minimal example (the prototype's):

```json
{
  "id": "terrace_modern_01",
  "name": "Modern Terrace",
  "price": { "coins": 0 },
  "shell": { "kind": "procedural", "params": { "width": 5.2, "balconyDepth": 2.6, "roomDepth": 3.0, "height": 2.9,
             "features": { "glassDoors": "left", "greenWall": "right", "downlights": 3 } } },
  "sky": { "topColor": "#6f82a8", "horizonColor": "#f2b47f", "sunColor": "#ffd3a0", "sunAzimuth": 24, "sunElevation": 7 },
  "lighting": { "sunIntensity": 1.7, "sunColor": "#ffb97f", "ambient": 0.32, "hemisphereSky": "#e6ecf5", "hemisphereGround": "#5a5048" },
  "fog": { "color": "#e9b48e", "near": 24, "far": 150 },
  "zones": [ { "id": "floor-main", "surface": "floor", "center": [0, 0, -1.3], "size": [4.9, 2.4], "maxObjects": 24 },
             { "id": "wall-right", "surface": "wallRight", "center": [2.6, 1.5, 1.2], "size": [1.6, 1.4], "maxObjects": 6 },
             { "id": "rail", "surface": "railing", "center": [0, 1.11, -2.54], "size": [5.0, 0.3], "maxObjects": 6 } ],
  "defaultObjects": [ { "assetId": "sofa_sectional_white_01", "position": [-2.05, 0, -1.35], "rotationY": -1.5708 },
                      { "assetId": "table_coffee_low_01", "position": [-1.05, 0, -1.35], "rotationY": 1.5708 },
                      { "assetId": "planter_trough_hedge_01", "position": [0.9, 0, -2.25] } ],
  "audio": [ { "layer": "birds", "clip": "ambient_placeholder", "gain": 0.7 } ],
  "camera": { "target": [-0.9, 0.9, -1.5], "default": { "yaw": 0.38, "pitch": 0.12, "distance": 3.2 }, "zoom": [1.6, 4.0] },
  "limits": { "maxObjects": 40 }
}
```

Later fields (`materials`, `personalWall`, positional audio, `variants`) extend this shape; `shell.params.features` is how one procedural shell serves several looks (which side carries the glass doors, the living wall, how many downlights) until GLB shells land. Sun azimuth 0 is straight ahead over the railing, 90 is to the right.

Time-of-day and weather are no longer static data on this block: `FocusEnvironmentEngine` (see `docs/FOCUS_ENVIRONMENT_ENGINE.md`) computes a continuous `LightingFrame` from the clock, the weather and the focus session, and `LightingRig` applies it over the environment's base sky/lighting every tick. The values here are the environment's resting look and the shader defaults.

## K. Asset pipeline

| Asset type | Format | Budget | Notes |
|---|---|---|---|
| Props (furniture, plants, decor) | **GLB** (glTF 2.0 binary), Y-up, metres, origin at the base centre for floor items / back centre for wall items | ≤ 8k tris, ≤ 2 materials, 1 texture set | Draco optional later (adds a WASM decoder; skip until size matters). Plants ship one GLB per growth stage. |
| Textures | WebP (albedo), WebP (roughness/AO packed), ≤ 1024², power-of-two | ≤ 300 KB each | KTX2/Basis when `expo-gl` exposes the extension reliably. |
| Environment shells | GLB with baked lightmap (second UV set) | ≤ 40k tris | Procedural shells (prototype) are parameterised and need no file. |
| Sky | Gradient params (V1) → equirect WebP 2048×1024 (V2) | — | HDRI-derived but exported LDR. |
| Audio | AAC `.m4a` 96 kbps mono, ≥ 45 s loops, equal-power tails | ≤ 600 KB | Two variants per layer. |
| Thumbnails | WebP 256² | — | For store cards and inventory. |
| Metadata | `asset.json` per asset (Asset shape above) | — | Validated by a script in CI. |

**Delivery:** the starter environment and its default objects are bundled (`assets/`); everything else streams from the existing API's object storage (same Render/Neon stack — an `assets` table with CDN URLs), cached on disk by the existing `src/content/cache.ts` pattern. **Placeholders:** every entry in the catalog can point at `kind: 'procedural'`; the engine builds a clean low-poly stand-in from the asset's declared footprint and flags it `PLACEHOLDER` in dev builds — swapping to the real GLB is a one-line catalog change.

## L. Performance strategy

- Render-on-demand; 30 fps cap for ambient animation; 0 fps when unfocused/backgrounded.
- Quality profiles (auto-detected from `Device.totalMemory` + GPU string, user-overridable):
  - **LOW** — pixel ratio 1.0, no shadows (blob shadows only), ≤ 24 objects, static sky, no particles, plant sway off.
  - **MEDIUM** — pixel ratio ≤ 1.5, blob shadows, ≤ 40 objects, cloud drift, sway on.
  - **HIGH** — pixel ratio ≤ 2.0, 1024² shadow map from the sun, ≤ 60 objects, particles (dust/fireflies), leaf detail.
- Progressive load: shell + sky first (first frame < 400 ms from assets in cache), then default objects, then the user's objects by distance from camera. Store assets download on demand and are evicted LRU.
- Geometry/material sharing: one `Material` per catalog material, `InstancedMesh` for repeated props (cushions, tiles), merged static geometry for the shell.
- Memory ceiling per profile (textures + geometry): 48 / 96 / 160 MB.
- Battery saver mode = LOW profile + audio off + 20 fps cap.

## M. Initial 10 environment specifications

Shared across all: left/right walls with placement zones, floor zone, railing zone, ceiling/overhang hanging points, one Personal Wall slot, sofa + small table + lamp + one planter + one wall piece + rug as defaults (styled per environment), ~60% of zone capacity left free.

| # | Environment | Architecture · floor · walls · railing | Sky / outside | Default set (styled) | Lighting | Audio | Signature feature |
|---|---|---|---|---|---|---|---|
| 1 | **Modern Terrace** *(starter, free)* | Wide luxury terrace: timber deck, white render, dark flat overhang with recessed downlights; frameless glass railing with a slim dark cap; floor-to-ceiling sliding glass doors on the left; living-wall panel on the right | Sunset over a dense high-rise skyline, warm haze on the horizon | Low white sectional with sand/olive/grey pillows, low walnut coffee table, hedge trough along the railing, tall broad-leaf plant, arc floor lamp, candle lantern, flat-weave rug | Low sun ahead-right, cool sky fill, warm horizon | birds, light wind, distant city | Skyline and downlights that light up at dusk |
| 2 | **Luxury Urban Balcony** | Wide glass-fronted terrace; large-format grey stone floor; dark micro-cement walls; frameless glass railing | Blue hour over a dense high-rise skyline with lit windows | Low linen sofa, marble coffee table, sculptural arc lamp, olive in a concrete pot, abstract canvas | Cool sky light + warm interior spill | city hum, wind, faint jazz (music layer, off by default) | Edge-lit glass railing glow at night |
| 3 | **Traditional Indian Balcony** | Carved wooden pillars, stone floor with inlaid border, lime-washed ochre walls, cusped arch overhang; jaali screen on one side | Warm afternoon, temple domes and trees beyond | Low wooden diwan with bolsters, brass tray table, hanging brass diya lamp, tulsi planter on a stand, block-print rug | Dappled light through the jaali | birds, wind, distant bells (very low) | Jaali screen casting patterned shadows that move with the hour |
| 4 | **Mediterranean Balcony** | Whitewashed walls, terracotta-tiled floor, wrought-iron railing, blue shutters on the door | Bright blue sky, sea and terracotta rooftops | Wicker loveseat, mosaic table, iron lantern, bougainvillea on the railing, lemon tree in a clay pot | High noon, hard light, cool shadows | gulls, wind, waves (far) | Bougainvillea that spreads along the railing as it grows |
| 5 | **Rustic Village Balcony** | Timber-framed porch, wide plank floor, rough stone wall, wooden balustrade | Morning mist over fields and a hill | Rope-woven daybed, log stool, oil lantern, herb box, jute rug | Low diffuse morning light | roosters/birds, wind in grass, distant cattle bell | Timber beams with hanging hooks for lanterns/planters |
| 6 | **Japanese Calm Balcony** | Engawa-style deck, cedar floor, shoji screen wall, low bamboo rail | Soft overcast over a maple garden | Floor cushions + low table, paper lantern, bonsai, moss bowl, tatami runner | Even, shadowless light | water trickle, wind chime (rare), birds | Stone basin with a bamboo water spout (tsukubai) |
| 7 | **Colonial Balcony** | Deep verandah with white columns, black-and-white chequered tile, pale green walls, turned-wood railing | Late-afternoon sun, palms and a lawn | Planter's chair, cane side table, brass hurricane lamp, fern on a stand, ceiling fan | Long warm shadows | fan whir (low), birds, crickets at dusk | Slow-turning ceiling fan |
| 8 | **Tropical Green Balcony** | Open timber balcony, dark stained deck, living-wall panel on one side, rope-and-bamboo railing | Humid bright sky, dense canopy | Hammock chair, driftwood table, rattan lantern, monstera, areca palm, woven rug | Filtered green light | birds, insects, leaves, light rain (variant) | Living wall that fills in as plants are placed |
| 9 | **Sandstone Heritage Balcony** | Jharokha-style balcony, pink sandstone floor and carved brackets, chhajja overhang, stone lattice rail | Dusty golden light over a walled old city | Stone bench with cushions, brass urn, carved niche lamp, marigold planter, dhurrie | Warm bounced light | wind, pigeons, distant market murmur | Carved stone niche that becomes a lit display shelf |
| 10 | **Sunset City Balcony** | Minimal concrete balcony, polished concrete floor, charcoal walls, horizontal cable railing | Dramatic shifting sunset over a bay-side skyline | Modular sofa, black side table, globe lamp, grasses in a tall planter, long rug | Sun on the horizon, orange→violet gradient | wind, distant traffic, gulls | A sky that transitions through the sunset over ~10 minutes |

Each will be a folder with `environment.json`, a shell GLB (or procedural params), lightmaps, thumbnail and audio refs — none require engine changes.

## N. Folder structure

```
src/balconyWorld/
  engine/
    BalconyEngine.ts        scene, renderer, render-on-demand loop, quality profile
    Renderer.ts             expo-gl ⇄ three.js bridge (endFrameEXP, pixel ratio)
    EnvironmentLoader.ts    environment.json → shell, lights, sky, zones
    ProceduralShell.ts      parametric walls/floor/railing/overhang (placeholder shells)
    Sky.ts                  gradient dome (V1) / equirect (V2)
    ObjectSystem.ts         instantiate, move, remove, collision, limits, ghosts
    CameraController.ts     orbit/pan/zoom with clamps, inertia, focus animation
    PlacementController.ts  raycast → zone validation → snap
    AudioEngine.ts          layered loops, mixer, attenuation
    QualityProfile.ts       LOW / MEDIUM / HIGH detection + settings
  catalog/
    AssetCatalog.ts         id → asset metadata (+ remote merge)
    procedural/             placeholder builders: sectional, coffee table, hedge trough, tall plant, arc lamp, lantern, rug…
    assets.json             bundled starter catalog
  environments/
    EnvironmentRegistry.ts
    terrace_modern_01/environment.json
  state/
    types.ts                data model (section G)
    WorldRepository.ts      AsyncStorage now, API later
    RewardSystem.ts         coins + existing growth/puzzle managers (moved from src/balcony/engine)
    StoreSystem.ts          catalog, prices, purchase paths, inventory
  ui/
    BalconyWorldScreen.tsx  GLView + gestures + action bar
    sheets/                 Store, Inventory, Inspect, Settings(audio/quality)
    components/             ActionBar, CoinBadge, PlacementHint
assets/balconyWorld/
  audio/                    ambient loops (placeholder loop today)
  environments/<id>/        thumbnails, shell GLB, lightmaps (none yet — procedural)
  catalog/<assetId>/        glb + thumbnail (none yet — procedural)
docs/BALCONY_WORLD_ARCHITECTURE.md   this document
```

## O. Development roadmap (= your STEP 6 → 15)

| Step | Scope | Exit criteria |
|---|---|---|
| **6 — prototype** *(this wave)* | Starter environment (procedural shell, sky, outside), orbit/pinch/pan camera with clamps + reset, placeholder sofa/table/lamp/planter/lantern, one draggable floor object via raycast, position persisted, ambient loop with sound toggle | Runs in an EAS preview build; 30+ fps on a mid-range Android; `tsc` clean |
| 7 — run on device | Fix anything the GL context/driver surprises us with; iOS check | Same build on both platforms |
| 8 — performance | Render-on-demand, quality profiles, pixel-ratio cap, memory ceiling, frame-time overlay in dev | LOW profile ≥ 30 fps on a 2018 Android |
| 9 — placement | Full zone validation, wall/railing/ceiling surfaces, rotate/scale, collision, crowding warning, haptics | Every object type places correctly on every surface |
| 10 — persistence | `WorldRepository` for all state shapes, camera state, migration versioning | Kill/relaunch restores the balcony exactly |
| 11 — plants | Growth stages as GLB-per-stage (procedural first), wilt/revive, growth animation | Existing `PlantGrowthManager` drives the 3D plants |
| 12 — focus integration | Hook `ActiveSessionScreen.handleComplete` → coins + growth + artwork; post-session "Your jasmine grew" moment; camera eases to the active plant | Completing a real session visibly changes the balcony |
| 13 — store | Catalog, inventory, Try-in-balcony ghost, coin purchases, remote catalog merge | Buy → place → persisted; prices from config |
| 14 — environments | `EnvironmentRegistry`, switching with per-environment state, environments 2–10 as data (shells may still be procedural) | Add a folder → it appears |
| 15 — monetization | IAP products for premium environments/items, server-side receipt verification via existing API, personal wall uploads (private) | Paid flow end-to-end on test accounts; nothing paid trusted client-side |

Shipped since: real-time day/night, weather and the focus "sunlight reward" (`FocusEnvironmentEngine` + `LightingRig`), and the 100-plant image library (`docs/PLANT_LIBRARY.md`). Not in V1 (architected for): social sharing, true stereo panning, forecast-driven weather.
