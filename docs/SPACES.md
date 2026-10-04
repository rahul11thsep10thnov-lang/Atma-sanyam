# The spaces: balcony, garden, museum

FOCUS has three places that grow with focused time, each its own tab:

| Tab | What it is | How it is drawn |
| --- | --- | --- |
| **Balcony** | a photographed balcony where the peace lily grows | offline Cycles renders, stacked on the phone (`src/spaces/`) |
| **Garden** | a 70 × 70 m lawn in front of a mansion, with room for 500 planters and more on stands | a real-time three.js scene on expo-gl; every plant is a photographed sprite (`src/garden/`) |
| **Museum** | a ring gallery where every finished jigsaw hangs as a framed artwork | a real-time three.js scene (`src/museum/`) |

They share one store catalogue, one coin balance and one **collection**
(`src/collection/`): the framed jigsaws a completed session earns.

The test for every change: **hide all the controls — does it still look
like a real, beautiful place?**

## Jigsaws and the collection

A picture session (a library photograph or the person's own photo) reveals
the picture tile by tile. Completed sessions of thirty minutes or more keep
it as a framed jigsaw; there are exactly six sizes (`src/collection/model.ts`):

| Completed minutes | Size | Pieces |
| --- | --- | --- |
| under 30 | none | the picture still reveals, nothing is kept |
| 30–59 | 1 | 3 × 4 |
| 60–89 | 2 | 4 × 5 |
| 90–119 | 3 | 5 × 6 |
| 120–149 | 4 | 6 × 8 |
| 150–179 | 5 | 8 × 10 |
| 180 and more | 6 | 9 × 12 |

Every artwork is a permanent record (`ArtworkRecord`: title, category,
source, size, the session's minutes, date, frame, home). When a session
ends the person is asked **where it should hang**: the museum, the balcony
wall, the garden easel, the collection, or the bin. The collection sheet in
each place lists every artwork with where it hangs; an artwork is never
deleted for lack of wall space.

A growable plant that just reached full growth earns a **new one**: the
person chooses the garden floor, a planter stand (if one with a free level
is owned), the inventory, or the bin.

## The garden (`src/garden/`)

- **Scene** (`scene/GardenView.tsx`): a 70 m lawn with the mansion's facade
  along the north edge, hedges on the other three sides, trees beyond, a
  sandstone terrace; sky gradient, fog, sun and hemisphere light per
  lighting state; rain as particles; lamps glow at night; blob shadows.
- **Gestures**: one finger slides over the lawn, two fingers turn and tilt
  (like a map), pinch zooms, plus +/−/recentre buttons. In Customize a
  finger carries any object like a cursor; dropping it on the dustbin
  throws it away, on a planter stand puts it on the next free level.
- **Model** (`model.ts`): items stand at free metre positions. Ground
  capacity is 500 planters; each **planter stand** adds six levels. Growth,
  wilting, penalties, inventory, dustbin and easel follow the same rules as
  before. The old photographed garden's state migrates on first launch.
- **Sprites** (`sprites.generated.ts`, from `assets/garden3d/sprites.json`):
  every plant, tree, lamp and object rendered once (and once lit, for
  lamps) at a 22° elevation on a transparent background, with its size in
  metres and its ground pivot; growable plants have five stages, healthy
  and wilted. The scene draws each as a cylindrical billboard that turns to
  face the camera. Textures (`textures.json`) are seamless tiles (grass,
  paving, marble, plaster, wood) and front sprites (hedge runs, mansion).
- **Plants**: the original marigold, hibiscus, rose, jasmine and
  bougainvillea plus 26 more (`focusbalcony/garden_plants_extra.py`): ten
  growables (sunflower, dahlia, chrysanthemum, petunia, zinnia, cosmos,
  periwinkle, ixora, lantana, geranium) and sixteen singles (oleander,
  hydrangea, canna, bird of paradise, bamboo, papaya, guava, pomegranate,
  curry leaf, mint, aloe, cactus bed, fern, elephant ear, peepal, jamun).

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

| Space | Focus plant | Stages |
| --- | --- | --- |
| Balcony | peace lily | seedling 0 → small 25 → growing 45 → mature 60 → flowering 90 min |
| Garden | Kachnar (orchid tree) | seed 0 → seedling 5 h → young 20 h → mature 50 h → large 100 h → flowering 250 h → grand 500 h |

The focus plant grows only from completed sessions in that space.
Abandoning a session (after the ten-second grace) makes it droop and
leaves two **penalty objects**: a wilted sapling and a broken picture.
They cannot be put away or thrown in the bin; each clears only for
`PENALTY_REMOVAL_COINS` (40) coins.

Growable garden plants go seed → sprout → young → mature → flowering at
0 / 25 / 60 / 120 / 240 focused minutes while placed, with a wilted sprite
below 60 % health.

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
- **Grow plants**: the balcony's and the garden's plants, pictured; picking
  one starts the session in that space.
- **Reveal jigsaws**: *Your photo* (the phone's library, kept as the app's
  own copy) and the library's Heritage / Nature / Wildlife / Spirituality
  collections.

## Code map

| | |
| --- | --- |
| `src/collection/` | `model.ts` sizes and records · `repository.ts` persistence (migrates the old art wall) · `photos.ts` the phone photo picker · `ui/CollectionSheet.tsx` |
| `src/garden/` | `model.ts` · `repository.ts` · `scene/GardenView.tsx` · `ui/GardenScreen.tsx`, `GardenSession.tsx`, `GardenStoreSheet.tsx`, `GardenInventorySheet.tsx` · `sprites.generated.ts` |
| `src/museum/` | `model.ts` · `store.ts` · `repository.ts` · `scene/MuseumView.tsx` · `ui/MuseumScreen.tsx`, `MuseumStoreSheet.tsx` |
| `src/gl/` | `useThree.ts` the renderer on expo-gl · `textures.ts` texture loading (bundled, on disk, generated) |
| `src/spaces/` | the balcony's pack, model, store catalogue (`catalog.ts`, shared), rewards, `focusEngine.ts` (what a session does to every place), `scene/SpaceScene.tsx`, `ui/SpaceScreen.tsx` |
| `src/components/session/PlacementSheet.tsx` | the "where should it go" sheet after a session |

## Rendering

```bash
cd tools/balcony-render
python render_space.py --space balcony --state morning   # the balcony's plates and objects
python gen_space_pack.py balcony
python render_sprites.py --group all                     # every garden sprite (day, night, scenery)
python render_textures.py                                # tiles, hedge runs, the mansion
python gen_sprites_pack.py                               # → src/garden/sprites.generated.ts
```

`render_sprites.py --only marigold,rose_bush` renders a few; finished
sprites are skipped on a rerun unless `--fresh` is given. A full sprite set
is about 230 renders of roughly a minute each on 4 CPU cores.

## What would gain most from artist or photographic assets

Everything is generated. The garden would gain most from a photographic
grass plate and tree sprites; the museum from real marble and plaster
tiles and a modelled column capital; the balcony as before. Swap any file
in `assets/` for a better image of the same size and alignment; the
manifests position it.
