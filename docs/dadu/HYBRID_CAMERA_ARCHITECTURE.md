# DADU – Hybrid camera architecture

Implemented in `src/dadu/render/`. Two camera perspectives, one world model, one set of
character rigs. The isometric 2.5D view is the primary world view (villa, rooms, gardens,
Animalia, town, map); the side-view 2D scene is the activity view (gardening, cooking, animal
care, music, art, learning, excursions).

## 1. Rendering stack and why

| Layer | Choice | Reason |
|---|---|---|
| Vector drawing | `react-native-svg` 15 (already a dependency) | Works in Expo Go, on Android, iOS and react-native-web with one code path; crisp at every zoom on budget phones; no texture memory. |
| Animation | A shared 10 fps clock (`AnimationClock` context, `src/dadu/render/clock.tsx`) that every rig reads; limb angles and expressions are pure functions of `t`. `Animated` is used only for the camera transition (opacity and scale on views). | One timer per scene instead of one per sprite; deterministic frames that can be unit tested; animated SVG props through `Animated.createAnimatedComponent` are unreliable on web and cost a bridge update per frame on the JS driver. |
| Rive / Lottie | Not used yet | `rive-react-native` needs a native module (not in Expo Go) and a new dependency; Lottie files would duplicate the rigs. The rigs are structured as named limb groups so they can be ported to Rive state machines in a later native build without changing the scene API. |
| three.js | Not used | A 3D engine adds memory and start-up cost with no benefit for 2:1 isometric billboards. |

Everything typechecks under `strict` and avoids platform-only props.

## 2. World units and camera coordinates

- **World unit (wu)**: one tile. `1 wu = 64 × 32 screen px` at zoom 1 (`TILE_W`, `TILE_H` in `iso/isoMath.ts`).
- **Projection**: 2:1 dimetric. `tileToScreen(x, y, z)` → `sx = (x − y)·32`, `sy = (x + y)·16 − z`. `x` grows to the south-east, `y` to the south-west, `z` is height in px above the floor.
- **Inverse**: `screenToTile(sx, sy)` (fractional) and `screenToTileRounded` for taps on empty floor.
- **Scene dimensions**: each `LocationSpec.size` (w × d tiles) gives the floor; `sceneBounds(w, d, wallHeight)` returns screen bounds including walls (150 px for interiors, 90 px of headroom for exteriors). `fitZoom` and `centreOffset` fit a scene into any viewport, clamped to 0.45–2.0; `clampOffset` keeps panning within 35 percent slack.
- **Character scaling**: `DADAJI_PX = TILE_H × 3.4` (≈109 px at zoom 1) is Dadaji's height in the isometric view; every other character is `DADAJI_PX × HEIGHT_CHART[key]`, where `HEIGHT_CHART` derives from `heightWu` in `core/characters.ts` (Chintu 0.57, Gauri 0.76, Buddy 0.38, Nandu 0.43, Chikki 0.29, Mitthu 0.19). Side view: Dadaji 150 scene units tall, same chart.

## 3. Depth sorting and layer order

Inside the camera transform (`IsoSceneContent`), in this order:

1. Walls (`roomStyles.ts`: two back walls with windows for interiors; nothing for exteriors, whose sky, sun or moon and hills are drawn outside the transform).
2. Floor tiles (checkerboard; each tile is a pressable polygon).
3. Entities, sorted by `depthKey(x, y, zBias) = (x + y)·10 + zBias`:
   - flat props (rugs, mats, rangoli, paths, water, fences) use `zBias −5` so characters always stand on them;
   - solid props `+1`, anchored on the far edge of their footprint (`FOOTPRINTS` in `iso/tiles/index.ts`) so a 2 × 1 bed draws before the character in front of it;
   - characters `+3`.
4. Glow rings and labels for interactive objects (drawn with the object; `little` mode draws larger rings and no text).

Outside the transform: weather overlay (rain lines, fog, clouds, storm flash, exteriors only), then the time-of-day tint (`timeTint` in `palette.ts`, halved indoors).

Side view (`SideScene`): background → parallax layers (each shifted by `cameraX × parallax`) → props marked `behind` → characters and front props sorted by ground y → weather → tint. ViewBox 360 × 220 with the ground line at y = 190; `preserveAspectRatio="xMidYMax slice"` keeps the ground anchored on any phone.

## 4. Interaction zones and collision

- Interactive objects carry `interactive: true`; `decorative: true` objects never receive taps or glow.
- `objectTiles(object)` returns the tiles a prop covers; screens use it as the blocked set for `walkPath(from, to, blocked)` (straight-line path with side-steps) and for "close enough" checks with `tileDistance`.
- Tap order: object `onPress` (SVG hit test) → character `onPress` → floor tile → background (`onTapTile` with the rounded tile under the finger, corrected for the camera offset and zoom).
- Panning starts only after the finger moves more than 8 px, so taps still reach objects; zoom is two buttons plus "fit", never a pinch, for budget phones and small hands.

## 5. Transitions

`useCamera(locationId)` holds `{ kind, locationId, activity, objectId }` with `enterActivity`, `exitActivity`, `toggle`, `goTo`. `CameraTransition` cross-fades and scales between the two views in 400 ms (ease-out cubic); with reduced motion it cuts instantly. Flow: isometric exploration → tap object → `enterActivity(location, activityKey, objectId)` → side view opens on `backgroundForLocation(location)` → activity completes → `exitActivity()` → isometric view with the updated world state (the screen re-renders the same `WorldState`, so flags, plant stages and positions are already current).

## 6. Shared world model

Neither view owns state. Screens pass `WorldState` slices in: `objects` (layout from `DEFAULT_LAYOUTS` merged with `world.objects[id].flags` and plant stages), `characters` (`world.positions` with pose from `ACTIVITY_POSE[activity]`), `time`, `weather`, `season`. A change in one view is visible in the other on the next render.

## 7. Fallbacks and performance

- `animate={false}` or OS reduced motion stops the clock: every sprite renders its still frame, weather stays static, the camera cuts.
- Unknown sprite names draw a placeholder crate (`spriteFor`), never an error.
- Scenes render one `Svg`; the clock re-renders the scene at 10 fps only while a scene is visible. Props are small vector compositions (no bitmaps), so memory is flat across locations.
- Recommended next steps for weaker devices: cap `fps` to 6 on devices reporting low memory; memoise static prop groups per location when profiling on a 2 GB Android device shows frame drops (not measured in this session).

## 8. File map

| Path | Content |
|---|---|
| `render/types.ts`, `render/palette.ts`, `render/clock.tsx` | Contracts, colour tokens, animation clock |
| `render/characters/*.tsx` | Seven rigs, `CharacterSprite`, `CharacterFace`, `HEIGHT_CHART` |
| `render/iso/isoMath.ts` | Pure projection, bounds, zoom, paths (unit tested) |
| `render/iso/tiles/*` | Box/plane/billboard helpers and 100+ prop sprites |
| `render/iso/villa/VillaExterior.tsx` | The modern villa |
| `render/iso/IsoScene.tsx`, `roomStyles.ts`, `defaultLayouts.ts` | The world view, room backdrops, default props per location |
| `render/side/backgrounds.tsx`, `SideScene.tsx` | 26 side-view backgrounds and the activity scene |
| `render/camera/*` | `useCamera`, `CameraTransition` |
| `render/RenderPlayground.tsx` | Manual verification screen |
