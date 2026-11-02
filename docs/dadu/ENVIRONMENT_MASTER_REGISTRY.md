# DADU – Environment master registry

Every location in `src/dadu/core/locations.ts`, with its isometric scene (`IsoScene` with
`roomStyles.ts` and `DEFAULT_LAYOUTS`) and its side-view background (`side/backgrounds.tsx`,
mapped by `backgroundForLocation`). Time of day (4), weather (5) and season (5) variants are
rendered by the shared scene code: sky and tint by time, overlays by weather, canopy colours
and fruit by season, so every location below has every variant unless noted.

| Location | Iso backdrop | Default props (object IDs under `DEFAULT_LAYOUTS`) | Side background | Missing |
|---|---|---|---|---|
| `map` | exterior, hills, river | villa, garden, cow shed, park, library, temple, bazaar, pandal, balloon portal, trees | — (hub only) | Place names drawn by the screen |
| `villa.exterior` | exterior lawn | the villa (`villa_building`), gate, compound walls, lamps, path, bicycle, mango, coconut, gulmohar, bushes, flower bed, stumps | public_garden | — |
| `villa.veranda` | interior (open) | swing, tulsi, rangoli, shoe rack, door | veranda | — |
| `villa.living` | interior, two windows | TV wall, bookshelf, clock, sofa, rug, telescope, globe, carrom, lamp, plant | living | — |
| `villa.kitchen` | interior, tiles | stove, fridge, island, basin, shelf | kitchen | — |
| `villa.dining` | interior | table with plates, three chairs, lamp | dining | — |
| `villa.bedroom_dadaji` | interior | bed, wardrobe, lamp, low bookcase | bedroom (night variant) | — |
| `villa.bedroom_chintu` | interior, blue | bed, toy box, desk, lamp, rug | bedroom (night variant) | — |
| `villa.study` | interior | desk with computer, bookshelf, globe, chair, chess table | study | — |
| `villa.activity` | interior, two windows | easel, paint table, harmonium, tabla, sitar, lab bench, activity mat, rangoli, toy box, chess | activity_art, activity_music, activity_lab (chosen by the screen per corner) | — |
| `villa.bathroom` | interior, tiles | basin, bathtub, toothbrush shelf | bathroom | — |
| `villa.terrace` | exterior | pergola with seat, planter rail, telescope, yoga mat, rangoli | terrace | — |
| `villa.driveway` | exterior, stone | stumps, bat and ball, football, bicycle, lamp, gate | public_garden | Dedicated driveway background |
| `garden.flowers` | exterior | four beds (flowering, growing, seedling, empty), watering can, gulmohar, butterfly bush | garden_bed | — |
| `garden.vegetables` | exterior | four beds (fruiting, mature, germination, empty), tulsi, can, sign | garden_bed | — |
| `garden.fruit` | exterior | mango, coconut, second tree, bench, bird feeder | garden_bed | Banana tree uses the neem sprite |
| `garden.butterfly` | exterior | two butterfly bushes, flower bed, sign | garden_bed | — |
| `garden.greenhouse` | interior, glass | two beds, workbench, can | garden_bed | Glass-walled background |
| `garden.pond` | exterior | pond (ripples, lotus, frog), bench, bush, tree | pond | — |
| `garden.fountain` | exterior | fountain (animated), bench, flowers | pond | — |
| `garden.workshop` | interior | workbench, can, seed box, shelf | garden_bed | Workshop interior background |
| `garden.compost` | exterior, soil | two bins, sign | garden_bed | — |
| `animalia.dog` | exterior | dog house, feed bowl, trough, ball, fence | dog | — |
| `animalia.rabbit` | exterior | hutch, bowl, trough, bush, fence | rabbit | — |
| `animalia.cowshed` | exterior, soil | open shed with hay, trough, bowl, compost | cowshed | — |
| `animalia.calf` | exterior | fence, hay, trough, ball, tree | cowshed | — |
| `animalia.wild` | exterior | hide, banyan, pond, sign | forest | — |
| `town.public_garden` | exterior | swing set, slide, stumps, bat, balance beam, sundial, neem, banyan, butterflies, bench, yoga mat, football | public_garden | — |
| `town.library` | interior | three arched/long shelves, librarian desk, audio corner, reading carpet, reading table, lamp | library | — |
| `town.temple` | exterior, stone | shikhara, gopuram, bell (swings), lamp stand, rangoli, two gallery boards, banyan with platform | temple | Shrine labels come from content |
| `town.bazaar` | exterior, stone | five stalls (two awning colours), tree | bazaar | — |
| `town.festival_ground` | exterior | pandal, lamp stand, rangoli, stall, swing | bazaar | Festival-specific dressing |
| `excursion.space` | side only | — | space | — |
| `excursion.museum` | side only | — | museum | — |
| `excursion.forest` | side only | — | forest | — |
| `excursion.ocean` | side only | — | ocean | — |
| `excursion.mountains` | side only | — | mountains | — |
| `excursion.monument` | side only | — | monument | — |

Sprite inventory: 37 interior props, 38 outdoor props, 23 town and map props, 5 villa props
(`SPRITE_NAMES` in `iso/tiles/index.ts`), plant beds in all eight growth stages, trees in five
seasons. Weather overlays: cloudy, rainy, stormy (with flash), foggy. Time tints: morning,
afternoon, evening, night.

Not yet produced: bitmap texture atlases (not needed for vector scenes), a neighbourhood street
scene between the villa and the town (the map stands in for it), and per-festival overlays.
