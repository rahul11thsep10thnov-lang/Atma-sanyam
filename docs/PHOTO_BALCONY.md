# The Focus Balcony

A luxury apartment balcony at early morning, photographed — and it is yours.
It starts nearly bare (the architecture, a cane chair, a small teak table, a
snake plant, a seedling) and fills up as you focus: plants, a dhurrie, a
lantern, a hanging money plant, a wind chime, a daybed or a study corner,
and framed artworks that arrive as jigsaws and end up on the wall.

The test for every change: **hide all the controls — does it still look like
a photograph of a real, beautiful balcony?**

## How it is built (and why)

The balcony is **pre-rendered photography composited in layers** (the
"hybrid" option): every surface, plant and object is path-traced offline in
Blender Cycles (`tools/balcony-render/`), and the phone only stacks the
pictures. This was chosen over real-time 3D because:

- Path-traced light (sun through the balusters, contact shadows, bounce
  light, cane weave, linen, haze) is what makes it read as a photograph. A
  phone GPU can't do that in real time, and real-time 3D on low-end Android
  looks like a game.
- Image layers cost almost nothing to draw, so the balcony runs smoothly on
  low-end Android and never drains the battery during a focus session.
- Objects are rendered **in each place they can stand**, with their own
  shadows on the floor, wall or glass. Moving one in Customize swaps to the
  photograph of it in that spot, so placement can never look pasted-on.

Depth and life come from the layers themselves:

| Layer (back → front) | Moves |
| --- | --- |
| `environment/sky` | — |
| `environment/clouds` | drift across the sky over ~7 minutes |
| `environment/landscape` | hills, trees and city in haze; slight parallax |
| `architecture/base` | the balcony: plaster, terracotta floor, railing, glass doors, ceiling |
| `lighting/sun_mask` | sunlight brightens and eases back, as if thin cloud passes |
| objects, far → near | plants sway at their own rates (pivoting at the soil; hanging things at the hook) |
| `artwork` | the jigsaw or the finished artwork, lit by the scene |
| dust | a few motes drifting in the sunlit air |

Parallax uses the device's motion sensor (a few pixels; far layers move
less). Everything stops under the OS "reduce motion" setting and while the
tab isn't visible.

## The focus plant

A peace lily at the front of the balcony. It grows only from focused time:

| Stage | Focused minutes | What you see |
| --- | --- | --- |
| seedling | 0 | three new leaves in a small terracotta pot |
| small | 25 | a young plant, seven leaves |
| growing | 45 | a fuller plant in a bigger pot |
| mature | 60 | a lush, glossy plant |
| flowering | 90+ | white spathes above the leaves |

Leaving a session early makes it droop: its health drops, and below 60% the
wilted render is shown (fewer leaves, curling, dry tips, duller colour). The
next completed session lifts it back. During a balcony focus session the
plant visibly moves through its stages as the minutes add up. There are no
progress bars; the plant is the progress.

## The art wall

After 25 focused minutes the first artwork arrives as a 16 × 16 jigsaw.
Every focused minute adds a piece. The Gallery shows the jigsaw and animates
in the pieces earned since you last looked. When it is complete, "Frame it
and hang it" closes the seams and the artwork appears, framed in teak, on
the far wall, lit by the morning light. Finished artworks can be swapped
from the Gallery.

## Code map

The balcony now runs on the shared spaces engine in `src/spaces/` (see
`docs/SPACES.md`); the table below maps the balcony's concepts onto it.

### `src/spaces/`

| File | |
| --- | --- |
| `packs/balcony.generated.ts` | the asset manifest + a `require()` per image (generated) |
| `packTypes.ts` | its shape |
| `catalog.ts` | prices, unlock times, artworks, jigsaw size |
| `model.ts` | the balcony state and every rule that changes it (pure) |
| `repository.ts`, `useSpaces.ts` | persistence and live subscription |
| `rewards.ts` | coins, lifetime minutes, milestones |
| `focusEngine.ts` | what a completed or abandoned session does |
| `scene/SpaceScene.tsx` | the layered compositor (live or still) |
| `scene/JigsawArt.tsx`, `scene/jigsaw.ts` | interlocking jigsaw pieces |
| `ui/SpaceScreen.tsx` | the tab: full-bleed scene, dock, customize |
| `ui/EditLayer.tsx` | Customize: select, drag-to-snap, guides |
| `ui/StoreSheet.tsx`, `ui/InventorySheet.tsx`, `ui/GallerySheet.tsx` | buying, owning, art |
| `ui/SpaceSession.tsx`, `ui/SpacePreview.tsx` | the session view, Home hero |

## Asset slots

Places an object can stand, in balcony metres (`focusbalcony/catalog.py`):

| Slot | Kind | Holds |
| --- | --- | --- |
| `focus` | floor | the focus plant (fixed) |
| `near_left` | floor | snake plant, tulsi |
| `rail_mid` | floor | snake plant, tulsi |
| `rail_far` | floor | snake plant, tulsi, areca palm |
| `corner_far` | floor | snake plant, areca palm |
| `seating` | floor | cane lounge chair (2 angles) |
| `table` | floor | teak coffee table |
| `rug` | floor | dhurrie |
| `lantern` | floor | iron lantern |
| `lounge` | floor | daybed or study corner |
| `hang_near`, `hang_far` | ceiling hook | hanging money plant, wind chime |
| `shelf` | wall | teak wall shelf |
| `art` | wall | the artwork frame |

## What is procedural, and what would benefit from real assets

Everything is procedural and rendered offline: no clip-art, vector shapes or
emoji anywhere on the balcony. It is generated, not photographed, so these
would gain the most from an artist's model or a real photograph at the same
camera and light (see `tools/balcony-render/README.md` for the format):

1. **Plants** — the areca palm, the money plant and the tulsi are the most
   "modelled"-looking. Scanned or artist-made plants (with real leaf
   textures) would lift realism the most.
2. **Artworks** — the three are rendered photographs. Real photographs or
   paintings (3:4) drop straight in.
3. **The view** — the hills and the city are hazy procedural shapes; a real
   photographic backplate of a hill-city morning would be a big step.
4. **Textiles** — cushions, the dhurrie and the throw use procedural weaves;
   scanned fabrics would read more convincingly up close.

The rest (architecture, terracotta, plaster, teak, cane, glass, light) already
holds up in the "hide all UI" test.
