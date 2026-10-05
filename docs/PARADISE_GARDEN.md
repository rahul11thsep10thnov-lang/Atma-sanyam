# The Paradise Garden

The Garden tab is a painted paradise: terraces, a gazebo with its statue,
waterfalls, a lotus pond with bridges and lanterns, a treehouse, an
orchard, pergolas of wisteria, and the mountains beyond. Every plant a
person grows in a focus session takes a permanent place in it. It replaces
the earlier real-time 3D garden.

## Two views, one garden

| View | What it shows | Camera |
| --- | --- | --- |
| **Full garden** | the whole panorama under a minimap, five segment chips | zoom 1, sideways pan, a slow cinematic drift |
| **Segment** | one segment up close, its plants at full detail | zoom = screen height / plate height, centred on the segment, pan limited to it |

Both views are one transformed "world" view (`ParadiseScene.tsx`): the
plate and every plant inside it are moved by one `translateX/Y + scale`
on the native driver, so the move between views is a 900 ms eased
camera travel and costs nothing per plant. There is no third view.

## Five segments

| # | Segment | Species | Where on the plate |
| --- | --- | --- | --- |
| 1 | Flowers | 20 | the arches, the rose beds, the beds by the small gazebo |
| 2 | Trees | 17 | the lawn round the treehouse, the beds by the path |
| 3 | Indoor / Ornamental | 15 | the terraces either side of the gazebo, and the lotus pond, where pots stand on sandstone plinths |
| 4 | Fruits & Vegetables | 18 | the orchard, the vegetable beds, the planters along the path |
| 5 | Herbs & Medicinal | 14 | under the pergola, the raised beds, the front border |

Species live in `src/paradise/catalog.ts` (name, scientific name, segment,
rarity, habit, description, how it progresses). Rarity opens as a segment
fills: common at once, uncommon after 3 plants there, rare after 10.

## Growth sizes: the single source of truth

`src/growth/size.ts` is the only place that maps minutes to sizes. The
timer, the growth animation, the garden, the plant card, coins, jigsaw
sizes, saved records and the checks all read it.

| Completed minutes | Size | Jigsaw pieces |
| --- | --- | --- |
| under 15 | no plant, no jigsaw | |
| 15–29 | 1 | 3 × 3 |
| 30–59 | 2 | 3 × 4 |
| 60–89 | 3 | 4 × 5 |
| 90–119 | 4 | 5 × 6 |
| 120–149 | 5 | 6 × 8 |
| 150–179 | 6 | 8 × 10 |
| 180 and more | 7 | 9 × 12 |

Each size is a separately built plant, not a scaled copy: more stems and
leaves, then buds, then more and more open flowers, fruit from size 5 on
fruiting plants, a thicker trunk and more branch levels on trees.

## The plant data model (`src/paradise/model.ts`)

```ts
interface PlantInstance {
  id: string;            // its own id: two Pink Lilies are two plants
  speciesId: string;
  segment: SegmentId;
  size: PlantGrowthSize; // 1..7, from the completed minutes
  focusMinutes: number;
  plantedAt: number;
  sessionId: string;     // one plant per session, ever
  slot: number;          // index into the segment's slots; -1 while homeless
  rotation: number; scale: number; flip: boolean; // a little variety
}
interface ParadiseState {
  schemaVersion: 1; version: number;
  plants: PlantInstance[];
  penalties: Penalty[];                  // wilted saplings from abandoned sessions
  layoutSeed: Record<SegmentId, number>; // the shuffle seed per segment
  lastSegment: SegmentId | null;
}
```

## Placement (`src/paradise/layout.ts`)

- **Beds** are rectangles authored over the plate per segment, each in a
  depth band (back, mid, front). Paths, bridges, lanterns, waterfalls, the
  gazebo and the glowing lotuses are `KEEP_CLEAR` areas.
- **Slots**: a deterministic Poisson-disc scatter over the beds for a
  seed. Spacing grows toward the front where plants look bigger, so the
  result is never a row or a grid. Every segment holds at least 167 slots
  (the requirement is 150); `tools/checks/paradise_layout.mjs` proves it.
- **Choosing a slot**: tall plants (trees at size 4+, any plant at size
  6+) prefer the back band, small plants the front. Among free slots in
  the preferred band, the one farthest from its neighbours wins, so the
  garden fills evenly.
- **Shuffle** changes only the segment's seed. The same plants, with the
  same sizes and ids, are re-placed biggest first. On screen each plant
  glides with a small hop to its new place (1.1 s; instant with motion off).
- **Plinths**: pots placed in the pond stand on a sandstone plinth sprite
  drawn under them.
- Plants without a slot (a full bed, or carried over from the old garden)
  are homed on the next load by `rehome`.

## The flow

1. Garden → a segment → **Grow a plant in …** opens the catalog for that
   segment (thumbnails of each species at size 7, rarity, locked states).
2. A species opens its **preview**: the plant large, name, scientific name,
   description, how it grows, the seven sizes with their minutes, and the
   focus length picker that says which size it will reach.
3. **Start focus** opens the growth scene: the timer at the top, a soft
   sunset garden behind, real soil along the bottom tenth of the screen.
   The seed falls and the soil closes over it, roots reach down, the shoot
   comes up, and the plant passes through its stages, cross-fading so the
   growth is continuous. Growth follows the timer (`growthProgress`), so
   after leaving and coming back it shows exactly where it should be.
4. On completion the plant is created once (idempotent by session id),
   placed automatically, and the app travels to its segment, where the
   plant settles in with a glow and the label "Pink Lily · Size 3".
5. Tapping a plant only **inspects** it: name, scientific name, size,
   the focus that grew it, date, description, **Grow another** (which
   opens the preview for a new session). Nothing ever regrows or
   duplicates an existing plant.

Abandoning a plant session after the 10-second grace leaves a wilted
sapling in that segment; it clears for 40 coins. Sessions under 15
minutes earn coins but no plant.

## Rendering the plants

Every species is built procedurally in Blender and rendered once per
stage (the seed and the seven sizes) on a transparent background, at a 22°
elevation, with its size in metres and its ground pivot recorded.

- `tools/balcony-render/focusbalcony/garden_paradise.py`: the 84 species.
- `tools/balcony-render/focusbalcony/paradise_blooms.py`: the blooms
  (cupped roses, recurved lily trumpets, pompoms, daisies with discs, open
  hibiscus with its column, cups, lotus, bracts, orchids, iris, daffodil
  coronas, spathes, spikes, buds) and the lush bush with a leaf-clad core.
- `render_paradise.py` renders; `gen_paradise_pack.py` writes
  `src/paradise/sprites.generated.ts`.
- `gen_paradise_plate.py`, `gen_paradise_growth_bg.py`,
  `gen_paradise_soil.py` build the plate, the session background and the
  soil from the reference image.

```bash
cd tools/balcony-render
python render_paradise.py --samples 16 --px 768        # every species; finished sprites are kept
python render_paradise.py --only lily,rose             # a few
python render_paradise.py --remeasure                   # recompute sizes in metres without rendering
python render_paradise.py --extras --px 512             # the pond plinth
python gen_paradise_pack.py                             # → src/paradise/sprites.generated.ts
```

A full set is 672 sprites at roughly 10–30 s each on 4 CPU cores.

## Drawing sizes

The plate is a stylised painting, not a photograph, so plants are drawn
in "garden metres" (`gardenMetres` in `model.ts`): small plants a little
larger than life, trees a little smaller, the seven sizes always in order.
Depth scale comes from `pxPerMetre(y)` on the plate. The growth scene uses
the same curve so a size looks the same in both places.

## Performance

- One transformed world view: camera moves and the drift are native-driver
  animations; React does not re-render while the camera moves.
- Level of detail: a plant smaller than 120 px on screen uses its 256 px
  thumbnail; the full sprite (768 px) only when it is large.
- In a segment view only plants within that segment (± a margin) are
  drawn. Four shared sway phases animate the plants that sway.
- Ambience (butterflies, birds, pollen, fireflies, clouds) is a fixed
  number of small native-driver views.
- Motion settings: Settings → Garden animation (Full, Calm, Off), and the
  system's reduce-motion switch turns everything off.

## Persistence

`AsyncStorage` key `focus.paradise.v1` (`src/paradise/repository.ts`),
with a subscription so the Garden tab, the session and Home share one
state. On first load the old 3D garden's growable plants
(`focus.garden3d.v1`) become paradise plants of the size their minutes
earned, and artworks that hung in the old garden return to the collection.

## Checks

```bash
node --experimental-strip-types tools/checks/growth_sizes.mjs     # the minute → size table, growth monotonic
node --experimental-strip-types tools/checks/paradise_layout.mjs  # ≥150 slots per segment, no overlaps, keep-clear areas
npx tsc --noEmit
```
