# Focus Balcony — asset specification

Everything the balcony currently draws is vector art (`react-native-svg`), built
to the exact composition and positions below. Nothing here is a placeholder
rectangle — it's a real, if simple, illustration — but every one of these can
be swapped for a professionally produced PNG/WebP (or a Lottie/Rive animation
for anything already listed as animated) without touching `BalconyEngine`,
the layers, or any state logic. The asset key in each table is exactly the
`asset` / `type` string the code already switches on
(`BalconyObjectView.tsx`, `PlantView.tsx`) — dropping in a real file only
means adding a case there that returns an `<Image>` (or a Lottie player)
instead of the vector shapes, keyed by the same string.

All dimensions are the *design* size at 3x density (@3x), matching how the
rest of the app ships bitmap assets. Perspective is a gentle 3/4 front view
(the same "looking at a shelf" angle used across the mock-ups), not a
straight elevation and not an isometric game-asset angle — it should read as
photographed on this balcony, not dropped in from a different render engine.

## Global requirements (every asset below)

- **Format:** WebP with alpha, or PNG-24 with alpha if WebP tooling isn't
  available. No JPEG (no alpha, and this is all foreground/prop art).
- **Transparent background:** required on everything except the two
  full-bleed backdrops (sky, artwork canvas), which are opaque by nature.
- **Lighting:** lit as if by soft, warm, slightly-off-camera-left daylight —
  gentle occlusion shadow at the base where it touches the floor/wall, no
  hard cast shadows, nothing that fights the environment tinting the code
  already applies on top (`environmentConfig.ts`'s `architectureTint`).
- **Style:** flat-shaded to lightly painterly, warm and muted (terracotta,
  aged wood, brushed brass, dusty green) — see `config/palette.ts` for the
  exact hex values already in use; match them so a mixed vector+bitmap scene
  during a gradual rollout doesn't clash.
- **Not:** photoreal, neon/saturated, cartoon-outlined, or cel-shaded anime
  style.

---

## Plants (`PlantView.tsx`, `type` key)

Each plant needs **one asset per growth stage** (SEED, SPROUT, YOUNG,
MATURE, FLOWERING, WILTED) — REVIVING can reuse YOUNG/MATURE with a
sparkle overlay (see Effects, below) rather than needing its own frame.

| type key | Size (px @3x) | Anchor | Stages needed | Notes |
|---|---|---|---|---|
| `basil-small` | 220×330 | bottom-center | 6 | Small potted herb; terracotta pot ~40% of frame height, foliage the rest. |
| `marigold` | 220×330 | bottom-center | 6 | Potted flowering annual; FLOWERING stage shows 3-5 orange/rust blooms. |
| `frangipani-tree` | 420×540 | bottom-center | 6 | Small ornamental tree, not a full-size shade tree — should still fit next to a person-height railing. FLOWERING adds pale blossom clusters. |

**Animation (if delivered as Lottie/Rive instead of static WebP):** a loop,
2-4s, rotating the whole plant ±2-3° about its base — matches the code's own
sway. Keep amplitude small; this is ambient, not attention-grabbing.

## Non-plant objects (`BalconyObjectView.tsx`, `asset` key)

| asset key | Size (px @3x) | Anchor | Animated? | Notes |
|---|---|---|---|---|
| `terracotta-pot` | 170×230 | bottom-center | no | Empty pot, no plant — a reward on its own before something is potted in it. |
| `hanging-planter` | 210×330 | top-center | **yes — sway** | Pot + trailing foliage, hung by a visible rope/chain from the top of the frame. Sway = the whole object rotating ±3° about the hang point. |
| `wood-chair` | 200×290 | bottom-center | no | Simple single chair, 3/4 front view, aged wood tone. |
| `brass-wall-plate` | 190×190 | center | no | Round decorative wall medallion — geometric/pressed-brass pattern, not a literal object (matches the abstract-motif direction of the artwork below). |
| `hanging-lantern` | 170×270 | top-center | **yes — glow** | Metal-and-glass lantern on a bracket/chain. Glow = the light source's brightness animating between ~55%-100% opacity on a slow 3-4s loop. If delivered as a bitmap, ship the lit-glass glow as a *separate* additive-blend layer above the base lantern art so the code can animate just that layer's opacity. |

## Artwork (`ArtworkVector.tsx`)

| asset key | Size (px @3x) | Notes |
|---|---|---|
| `lotus-medallion` (canvas) | 600×600 | The finished, "mounted" artwork — a square canvas, no frame (the frame is drawn separately by `JigsawArtwork.tsx` so it can stay consistent across multiple future artworks). Abstract geometric lotus/mandala motif in the balcony's own palette — explicitly **not** a literal, stock "Indian art" cliché (no elephants, no Taj Mahal silhouette, no paisley border). Think: what a contemporary Indian textile or jaali-screen designer would produce. |

The jigsaw reveal itself (cover pieces flipping away) is pure code
(`JigsawArtwork.tsx`, reusing `PuzzleGrid`'s mechanic) and needs no asset —
only the finished canvas image above.

## Environment backdrops (`SkyLayer.tsx`, `CityscapeLayer.tsx`)

These are currently gradients + simple shapes, deliberately — a photo sky
would fight the SVG parallax layers and the environment-tinting system.
**If** these move to bitmap/Lottie later:

| Layer | Size (px @3x) | Notes |
|---|---|---|
| Sky backdrop, per environment (×6: morning/afternoon/sunset/evening/night/rain) | 1080×1920 | Full-bleed gradient/photo sky. Keep a plain, unbroken gradient — no sun/moon baked in (that stays a separate animated glow element so it can be repositioned/tinted independently). |
| Distant skyline silhouette | 1080×480, transparent | A calm, low-detail cityscape silhouette (not literal recognizable buildings) — one asset, tinted by the environment's `architectureTint` at render time exactly as the vector version is now. |

## Effects (particles, glow — currently pure code, no assets needed)

Stars, fireflies and rain are drawn procedurally (`AtmosphereLayer.tsx`) and
should **stay** procedural even after a bitmap upgrade — they're cheap this
way and a bitmap particle system would cost far more for no visible gain at
this screen size. The one exception: if a designer wants a specific firefly
"glow" look, a small 24×24 radial-glow sprite (warm yellow, soft falloff) can
replace the plain circle in `AtmosphereLayer.tsx`'s `Firefly` component — additive
blend, tileable at any of the 5 firefly positions.

## Wiring a real asset in (once art exists)

1. Drop the file in `assets/images/balcony/<key>.webp`.
2. In the matching component (`PlantView.tsx` / `BalconyObjectView.tsx` /
   `ArtworkVector.tsx`), add a case that returns
   `<Image source={require('...')} style={{ width, height }} />` instead of
   the vector shapes for that key — leave every other key on vector art so
   the rollout can happen one asset at a time.
3. Nothing in `BalconyEngine`, the config files, or the layer components
   needs to change — they only ever pass a `width`/`height`/`asset` key down;
   they never care how that key is actually painted.
