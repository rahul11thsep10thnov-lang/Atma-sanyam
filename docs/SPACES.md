# The spaces: balcony, garden, museum

FOCUS has three places that grow with focused time, each its own tab:

| Tab | What it is | How it is drawn |
| --- | --- | --- |
| **Balcony** | a photographed balcony where the peace lily grows | offline Cycles renders, stacked on the phone (`src/spaces/`) |
| **Garden** | the Paradise Garden: a painted panorama in five segments, where every plant grown in a focus session takes a permanent place | a layered 2D scene: the plate plus Blender-rendered plant sprites (`src/paradise/`, see `docs/PARADISE_GARDEN.md`) |
| **Museum** | a ring gallery where every finished jigsaw hangs as a framed artwork | a real-time three.js scene (`src/museum/`) |

They share one store catalogue, one coin balance and one **collection**
(`src/collection/`): the framed jigsaws a completed session earns.

The test for every change: **hide all the controls — does it still look
like a real, beautiful place?**

## Jigsaws and the collection

A picture session (a library photograph or the person's own photo) reveals
the picture tile by tile. Completed sessions of fifteen minutes or more keep
it as a framed jigsaw. Its size is the session's **growth size**, the same
seven sizes a plant reaches (`src/growth/size.ts`, the single table):

| Completed minutes | Size | Pieces |
| --- | --- | --- |
| under 15 | none | the picture still reveals, nothing is kept |
| 15–29 | 1 | 3 × 3 |
| 30–59 | 2 | 3 × 4 |
| 60–89 | 3 | 4 × 5 |
| 90–119 | 4 | 5 × 6 |
| 120–149 | 5 | 6 × 8 |
| 150–179 | 6 | 8 × 10 |
| 180 and more | 7 | 9 × 12 |

Every artwork is a permanent record (`ArtworkRecord`: title, category,
source, size, the session's minutes, date, frame, home). When a session
ends the person is asked **where it should hang**: the museum, the balcony
wall, the collection, or the bin. The collection sheet in each place lists
every artwork with where it hangs; an artwork is never deleted for lack of
wall space. Artworks that hung in the old 3D garden return to the
collection.

## The garden (`src/paradise/`)

The Paradise Garden has its own document: `docs/PARADISE_GARDEN.md`. In
short: two views (the whole garden, a segment up close), five segments
(Flowers, Trees, Indoor / Ornamental, Fruits & Vegetables, Herbs &
Medicinal), 84 species, 150+ places per segment chosen by a natural
scatter, a shuffle that only moves plants, plants that are inspected but
never regrown, and a focus session that plants a seed and grows it in
front of the person, ending in one of seven sizes.

## The museum (`src/museum/`)

- **Geometry** (`model.ts`): a ring; the viewer stands inside it and the
  artworks hang on the curved outer wall. Each **section** is one eighth of
  the ring (an 11.8 m wall, 5.2 m high, a 6 m floor band, a column at each
  edge). Only the current section and its neighbours are built; the
  neighbours are darker and curve away. Swiping walks to the next section
  with an eased camera move; one finger looks around, two fingers walk,
  pinch zooms. A full wall opens the next section automatically.
- **Placement**: every object is a record (`MuseumObject`: item, section,
  surface, position along the wall or depth on the floor, height,
  rotation, scale, frame, light on/off and intensity, display status).
  Surfaces: `MUSEUM_WALL`, `MUSEUM_FLOOR`, `DISPLAY_PEDESTAL`,
  `DISPLAY_CASE`, `TABLETOP`, `SHELF`. `snapToWall` keeps a wall object
  inside the wall, at hanging height and clear of its neighbours;
  `snapToFloor` keeps floor objects on the floor band; small objects rest
  on a carrier and move with it.
- **Artworks**: width by jigsaw size (0.62 m for size 1 to 2 m for size 6),
  height by the picture's aspect, a frame in the chosen style. A spotlight
  near an artwork brightens it (a real SpotLight on the Lambert wall and
  picture plus a light pool); wall washes and skylights lift a whole wall.
  Tap an artwork for its story: title, collection, size, the focus that
  earned it, date, frame.
- **Edit museum**: tap an object, drag it, turn it, make it smaller or
  bigger, change an artwork's frame (among owned frame styles), switch a
  light on, off, dimmer or brighter, or put it away.
- **Themes**: contemporary (white plaster, grey marble) and Indian
  heritage (sandstone, warm marble, teak trim).
- **Store** (`store.ts`): 63 curated items, never more than 100, across
  Artwork & frames, Lighting, Exhibition, Furniture, Architecture,
  Decoration, Heritage, Information, Security & realism, Premium. Each
  carries an evaluation record (utility, placement, visible consequence,
  interaction, performance cost, purchase value) shown in the store, and a
  rarity (basic, premium, rare, epic, legendary) that follows its coin
  price. Buying places the object in the current section at once.

## The balcony (`src/spaces/`)

Unchanged in how it is built: every surface, plant and object is
path-traced offline in Blender Cycles (`tools/balcony-render/`, fully
procedural) and the phone stacks the pictures. Objects are rendered in
each place they can stand, so moving one swaps to its photograph there.
In Customize the dragged object follows the finger and settles on the
nearest spot it fits when let go. Its wall frame shows an artwork from the
collection.

## What grows

| Where | What grows | Stages |
| --- | --- | --- |
| Balcony | peace lily | seedling 0 → small 25 → growing 45 → mature 60 → flowering 90 min |
| Garden | the plant chosen for the session | seed → sizes 1–7 by the session's completed minutes (15, 30, 60, 90, 120, 150, 180) |

The balcony's focus plant grows only from completed balcony sessions.
Abandoning one (after the ten-second grace) makes it droop and leaves two
**penalty objects**: a wilted sapling and a broken picture. Abandoning a
garden session leaves a wilted sapling in that segment. Penalties cannot
be put away or thrown in the bin; each clears only for
`PENALTY_REMOVAL_COINS` (40) coins.

## Coins, ads, membership

- One coin per focused minute of a completed session; nothing for an
  abandoned one; milestone bonuses.
- Leaving within the first **10 seconds** of a session is free.
- **Rewarded ads** (`src/ads/rewardedAds.ts`): a 30-second ad pays 30
  coins, decaying by 0.6 for every ad in the last three hours. No ad
  network is wired; the bundled provider plays a placeholder countdown.
- **Membership** (`src/membership/membership.ts`): ₹30 a month, ad-free;
  no billing library is wired yet.

## Home

- A handwritten greeting (Caveat), then two separate peach chips in Bebas
  Neue: **Grow plants** and **Reveal jigsaws**. The spaces themselves live
  in their tabs.
- **Grow plants**: the balcony's peace lily and the Paradise Garden's
  species, pictured; picking a garden species opens its preview, where the
  focus length decides the size it will reach.
- **Reveal jigsaws**: *Your photo* (the phone's library, kept as the app's
  own copy) and the library's Heritage / Nature / Wildlife / Spirituality
  collections.

## Code map

| | |
| --- | --- |
| `src/collection/` | `model.ts` sizes and records · `repository.ts` persistence (migrates the old art wall) · `photos.ts` the phone photo picker · `ui/CollectionSheet.tsx` |
| `src/growth/` | `size.ts`: the seven growth sizes, the single source of truth |
| `src/paradise/` | `catalog.ts` species · `layout.ts` beds and slots · `model.ts` plants, placement, shuffle · `repository.ts` · `scene/ParadiseScene.tsx`, `GrowthScene.tsx`, `Ambience.tsx` · `ui/ParadiseScreen.tsx`, `PlantCatalogSheet.tsx`, `PlantPreviewSheet.tsx` · `sprites.generated.ts` |
| `src/museum/` | `model.ts` · `store.ts` · `repository.ts` · `scene/MuseumView.tsx` · `ui/MuseumScreen.tsx`, `MuseumStoreSheet.tsx` |
| `src/gl/` | `useThree.ts` the renderer on expo-gl · `textures.ts` texture loading (bundled, on disk, generated) |
| `src/spaces/` | the balcony's pack, model, store catalogue (`catalog.ts`, shared), rewards, `focusEngine.ts` (what a session does to every place), `scene/SpaceScene.tsx`, `ui/SpaceScreen.tsx` |
| `src/components/session/PlacementSheet.tsx` | the "where should it go" sheet after a session |

## Rendering

```bash
cd tools/balcony-render
python render_space.py --space balcony --state morning   # the balcony's plates and objects
python gen_space_pack.py balcony
python render_paradise.py --samples 16 --px 768         # every Paradise Garden species, seed and seven sizes
python gen_paradise_pack.py                              # → src/paradise/sprites.generated.ts
```

`render_paradise.py --only lily,rose` renders a few; finished sprites are
skipped on a rerun unless `--fresh` is given. The museum's textures
(marble, plaster, wood) stay in `assets/garden3d/textures/`.

## What would gain most from artist or photographic assets

The garden's plate is the reference painting; its plants are generated.
The garden would gain most from hand-painted or photographed plant sprites
in the plate's style; the museum from real marble and plaster
tiles and a modelled column capital; the balcony as before. Swap any file
in `assets/` for a better image of the same size and alignment; the
manifests position it.
