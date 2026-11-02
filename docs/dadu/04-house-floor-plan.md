# 04 – Dadaji's house: floor plan

Dadaji's house is the heart of the Miniverse. It is a large, two-storey traditional Indian
house with a terrace, built around a small open courtyard (aangan), standing in the middle of a
96 × 72 world-unit (wu) plot. The house footprint is 40 × 26 wu, so about four fifths of the plot
is garden: the master prompt asks for a massive garden so that animal shelters can be added
later without a redesign. Location IDs follow `00-canon.md` §5; interactive objects per room are
in `05-room-designs.md`; the garden itself is in `06-garden-designs.md`.

## 1. The plot

```
              N
              ▲
 (40,50)                                                              (136,50)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ boundary wall: low clay-plastered wall, marigold creepers, blue gate S  │
 │                                                                        │
 │  shelter.goat   shelter.hen   shelter.horse        ORCHARD             │
 │  (rsv 10×8)     (rsv 10×8)    (rsv 12×8)           mango, guava, neem, │
 │                                                    jamun, amla, banana │
 │  house.store    house.cowshed                      ┌──────┐ compost    │
 │  (12×10)        (22×10)                            │ pond │ bird feed  │
 │                                                    └──────┘ fountain   │
 │                                                                        │
 │          ┌────────────────────────────────┐   flower beds              │
 │          │                                │   vegetable patch          │
 │          │   THE HOUSE  40 × 26 wu        │   medicinal corner         │
 │          │   (ground + first + terrace)   │   butterfly corner         │
 │          │                                │   creeper pergola          │
 │          └───────────┬────────────────────┘                            │
 │  shelter.duck_pond   │ house.veranda (20×8)   shelter.bee   shelter.   │
 │  (rsv 12×8)          │ swing, steps, perch    (rsv 8×6)     rescue     │
 │                      │                                      (rsv 12×8) │
 └──────────────────────┴─────────────────────────────────────────────────┘
 (40,122)                blue gate → main lane                     (136,122)
```

Plot facts:

| Item | Value |
|---|---|
| Plot size | 96 × 72 wu (6,912 wu²) |
| House footprint | 40 × 26 wu (1,040 wu², 15 % of the plot) |
| Veranda | 20 × 8 wu, south face, facing the lane |
| Cow shed and pet-care area | 22 × 10 wu, north-west, downwind of the house |
| Storage and gardening area | 12 × 10 wu, beside the cow shed, door on to the vegetable patch |
| Garden (everything else) | about 5,200 wu², including six reserved shelter plots (about 560 wu²) |
| Boundary | low wall, one blue main gate (south), one small service gate (north-west, near the shed) |

The reserved plots are drawn as fenced grass with a wooden signboard. Future shelters are added
as content packs that replace the plot's scene asset and object list (`03-miniverse-map.md` §10).

## 2. Ground floor

```
          N  (garden side, orchard and cow shed beyond)
 ┌────────────────┬──────────────┬──────────────────┬─────────────────┐
 │ house.kitchen  │ house.dining │   house.lab      │ house.cowshed   │
 │ 10 × 8         │ 8 × 8        │   12 × 8         │ (outside, door  │
 │ clay stove,    │ low table,   │   benches, sink, │  from the lab   │
 │ shelves, water │ thali rack   │   magnet wall    │  side yard)     │
 │ filter, back   │              │                  │                 │
 │ door → garden  │              │                  │                 │
 ├──────┐         ├──────────────┼─────┐            │                 │
 │ stair│  ┌──────┴──────────────┴─┐   │            └─────────────────┘
 │  ▲   │  │   AANGAN (courtyard)  │   │
 │      │  │   6 × 6, open sky,    │   │ house.music_room
 ├──────┘  │   tulsi chaura, rain  │   │ 10 × 8
 │         │   gauge, swing seat   │   │ tabla, harmonium, sitar,
 │ house.  └──────────┬────────────┘   │ piano, flute shelf
 │ living_room        │                │
 │ 16 × 10            │                ├─────────────────────────────────
 │ armchair, telescope│                │ house.art_room
 │ globe, bookshelf,  │                │ 10 × 8
 │ radio, clock,      │                │ easel, rangoli floor, clay table,
 │ carrom, wall map   │                │ craft shelves, gallery wall
 ├────────────────────┴────────────────┴─────────────────────────────────┤
 │ house.veranda  20 × 8                                                 │
 │ swing (jhoola), Mitthu's perch, Kim's mat, steps, shoe rack, lantern │
 └───────────────────────────────────────────────────────────────────────┘
          S  (lane side; blue gate 12 wu ahead)
```

### Ground-floor adjacency

| From | To | Doorway |
|---|---|---|
| Lane | Veranda | Blue gate, garden path, three steps |
| Veranda | Living room | Double wooden door with a brass bell (main door) |
| Living room | Aangan | Open arch |
| Living room | Stairs | Stair arch, west side |
| Living room | Music room | Curtained door, east |
| Music room | Art room | Open arch (the two share a wall of paintings) |
| Aangan | Kitchen, dining, lab, music room | Each room opens on to the courtyard |
| Kitchen | Garden | Back door to the vegetable patch and the store |
| Lab | Side yard | Door to the cow shed yard (Gauri can be seen through the window) |
| Dining | Kitchen | Serving hatch |

## 3. First floor

```
          N
 ┌───────────────────┬──────────────────┬──────────────────────────┐
 │ house.study       │ house.bathroom   │ house.playroom           │
 │ 14 × 8            │ 6 × 6            │ 12 × 8                   │
 │ private library,  │ wash basin,      │ building blocks, puzzle  │
 │ desk, lamp, maps, │ mirror, toothbrush│ carpet, indoor cricket, │
 │ Molly's corner,   │ rack, bucket and │ board games, dress-up   │
 │ computer          │ mug, soap, towel │ trunk, Dhanu's ball      │
 ├──────┐            ├──────────────────┤                          │
 │ stair│            │ landing / gallery│                          │
 │  ▼   │            │ over the aangan  │                          │
 ├──────┘            │ (looks down on   ├──────────────────────────┤
 │ house.bedroom     │  the tulsi)      │ linen and toy cupboard   │
 │ 12 × 8            │                  │ (not a room; decor)      │
 │ two beds, lamp,   │                  ├──────────────────────────┤
 │ window to orchard,│                  │ terrace stair ▲          │
 │ story shelf, star │                  │                          │
 │ ceiling at night  │                  │                          │
 └───────────────────┴──────────────────┴──────────────────────────┘
          S  (balcony over the veranda, 20 × 3, railing with pots)
```

### First-floor adjacency

| From | To | Doorway |
|---|---|---|
| Stairs | Landing | Open |
| Landing | Study, bedroom, bathroom, playroom | Doors; bathroom door has a "knock" interaction for privacy habits |
| Landing | Balcony | Open arch; balcony pots are part of the garden growth model |
| Playroom | Terrace stairs | Narrow stair |

## 4. Terrace

The terrace (40 × 26 wu, open) is not one of the thirteen rooms but it is a location
(`house.terrace`) because astronomy, weather, kites and rooftop yoga happen here. It holds the
water tank, a drying line, a kite spool, a rain gauge, a small solar panel, a sundial and, at
night, Dadaji's telescope (which the child carries up from the living room: the telescope
object exists in both places and the living-room instance says "Let's take it to the terrace").

## 5. Room table

| Location ID | Floor | Size (wu) | Lighting | Primary teaching purpose | Usual companion |
|---|---|---|---|---|---|
| `house.veranda` | G | 20 × 8 | Morning sun, evening lantern | Welcome, companion choice, Mitthu's Echo, rhymes, bedtime goodbyes | Mitthu, Kim |
| `house.living_room` | G | 16 × 10 | Warm daylight from the aangan | Main teaching room: introductions to every subject; telescope, globe, bookshelf, radio, clock, carrom | Molly |
| `house.study` | 1 | 14 × 8 | Desk lamp, north window | Private library, reading, writing, languages, computer fundamentals, coding | Molly |
| `house.lab` | G | 12 × 8 | Cool north light, bench lamps | Physics, chemistry, biology experiments; magnets, light, sound, matter | Kim, Molly |
| `house.music_room` | G | 10 × 8 | Soft, curtained | Hindustani and Carnatic basics, instruments, rhythm, dance | Mitthu (rhythm echo), Dhanu (dance) |
| `house.art_room` | G | 10 × 8 | Bright, skylight | Drawing, painting, folk art, crafts, clay, gallery | Gopu alone with Dadaji; Dhanu for mess |
| `house.kitchen` | G | 10 × 8 | Warm, stove glow | Measurement, fractions, nutrition, food groups, safe cooking | Gauri |
| `house.dining` | G | 8 × 8 | Warm | Table manners, sharing, food groups, time (meal clock), family talk | Gauri, Dhanu |
| `house.bedroom` | 1 | 12 × 8 | Lamp; star ceiling at night | Bedtime stories, sleep hygiene, calm breathing, gratitude | Molly (reads), Kim (sleeps at the foot) |
| `house.playroom` | 1 | 12 × 8 | Bright | Puzzles, blocks, board games, indoor sports, pretend play, teamwork | Kim, Dhanu |
| `house.bathroom` | 1 | 6 × 6 | Bright, tiled | Hygiene: hand-washing, brushing, bathing, water saving | Dhanu (learns too) |
| `house.cowshed` | Yard | 22 × 10 | Open, straw warmth | Animal care, dairy, feeding, kindness, Kim's kennel and Molly's hutch | Gauri, Dhanu, Kim, Molly |
| `house.store` | Yard | 12 × 10 | Dim, one window | Gardening tools, simple machines, sorting, safety, seeds | Kim |
| `house.terrace` | T | 40 × 26 | Sky | Astronomy, weather, kites, rooftop yoga, solar energy | Mitthu |

## 6. Cow shed and pet-care area (detail)

```
 ┌──────────────────────────────────────────────────────┐
 │ hay loft (ladder)                                     │
 │ ┌──────────┐ ┌──────────┐  ┌─────────┐  ┌──────────┐ │
 │ │ Gauri's  │ │ Dhanu's  │  │ Kim's   │  │ Molly's  │ │
 │ │ stall    │ │ corner   │  │ kennel  │  │ hutch    │ │
 │ └──────────┘ └──────────┘  └─────────┘  └──────────┘ │
 │ water trough · feed bins (hay, green fodder, grain)  │
 │ milk pail · brush · salt lick · first-aid box        │
 │ gobar collection → compost (garden)                  │
 └──────────────────────────────────────────────────────┘
```

Each stall is an object cluster (`house.cowshed.gauri_stall`, `house.cowshed.kim_kennel`, and
so on). Feeding, grooming and cleaning are daily-care activities that feed the garden growth
model (gobar to compost) and the gamification loop (care badges), see `06-garden-designs.md`
and `15-real-world-assignments.md`.

## 7. Storage and gardening equipment area (detail)

A single room with a tool wall (spade, trowel, rake, watering can, hose, gloves, pruning
shears), a seed cabinet with labelled drawers, a wheelbarrow, sacks (soil, compost, sand), a
pulley over the loft, a lever-and-plank for lifting sacks and a safety board. It teaches sorting
and classification (A1–A2), simple machines (A3–A4), tool safety and planning a garden bed
(A4–A5), and it is the inventory screen for garden tools the child has earned.

## 8. Why the house is laid out this way

- **Teaching rooms open on to the aangan** so that the camera can show two rooms and the sky
  in one frame, and so that Gopu's walk between activities is short (A1–A2 attention spans).
- **The veranda faces the lane** so that every return to the house passes Dadaji's swing, the
  natural place for greetings, Mitthu's Echo and the companion choice.
- **Private rooms are upstairs** (bedroom, bathroom, study, playroom), which lets the bedtime
  flow dim the whole lower floor and makes the bathroom door's privacy lesson natural.
- **The kitchen has a garden door** so that harvest-to-cooking activities are one walk.
- **The lab looks on to the cow shed** so that biology lessons can point at a living animal.
- **The terrace is open sky** for astronomy and weather without leaving home.
- **The house is small relative to the plot** so that shelters, a larger orchard, a bee garden
  and a rescue corner can be added over the years.

## 9. Camera framing per room

Each room is drawn as a wide scene (about 3 : 2) and viewed at zoom level Z2
(`03-miniverse-map.md` §2). The framing rules below keep Dadaji, the child and the objects
readable on a budget phone in portrait and landscape.

| Room | Camera anchor | Pan range | Notes |
|---|---|---|---|
| Veranda | Centre on the swing | Half a room each way | Mitthu's perch stays in frame at all times |
| Living room | Centre on the armchair | Full room | The bookshelf and the telescope are at the two ends so a pan rewards exploring |
| Study | Desk | Half room | The alphabet chart is beside the desk for Little mode |
| Lab | Centre bench | Full room | The chalkboard is the dialogue backdrop |
| Music room | Rug and stage | Half room | Instruments ring the stage |
| Art room | Easel | Full room | The gallery wall is the back layer |
| Kitchen | Counter | Half room | The garden window is always visible |
| Dining | Table | Fixed | Single frame |
| Bedroom | Beds | Fixed | Bedtime dims to a single lamp pool |
| Playroom | Carpet | Full room | |
| Bathroom | Basin and mirror | Fixed | Single frame; Dadaji at the doorway edge |
| Cow shed | Gauri's stall | Full shed | Dhanu wanders in and out of frame |
| Store | Tool wall | Half room | |
| Terrace | Parapet | Full width | Sky layer carries the stars at night |

## 10. Overlays: time, season and festival

The base scene of each room never changes. Three overlay layers sit on top of it:

- **Time of day.** Window light colour, lamp state, shadow direction (four states).
- **Season.** Window views (monsoon rain on the panes, winter mist, spring blossoms on the
  orchard side), a raincoat or a shawl on the veranda hook, a cooler or a heater in the
  bedroom corner.
- **Festival.** Diyas along the veranda and the aangan, a toran at every door, a rangoli on
  the steps, a kite spool on the terrace, a Ganesha idol made of clay in the art room during
  Ganesh Chaturthi (shown as craft), a pookalam in the aangan for Onam. Festival overlays are
  scheduled in the CMS content calendar and respect the parent's content settings.

## 11. Build and asset notes

The house is 14 scene packs (13 rooms plus the terrace), each with three base layers, up to
three overlay sets and an object manifest, plus the exterior pack (façade, plot, boundary
wall, gate). Asset counts, sizes and formats are itemised in `22-assets.md`; the floor plan
above is the reference for the exterior pack and for the camera transitions between rooms,
which always pass through a doorway shown in both adjacent scenes.
