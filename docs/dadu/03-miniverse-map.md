# 03 – The Miniverse map

The Miniverse is DADU's primary navigation and exploration system. It is not a decorative home
screen: every place on the map is a doorway into a learning activity, and the child's progress
is visible in the world itself (plants grow, decorations appear, new lanes open). This document
fixes the shape of the world, how the child moves through it and how each location maps to the
eight learning sections. Location IDs follow `00-canon.md` §5.

## 1. Overview map

The world is one continuous canvas, roughly 3 : 2 in proportion, drawn on a grid of
**world units (wu)**. One wu is about the width of Gopu standing. The house plot alone is
96 × 72 wu; the whole world is 240 × 160 wu.

```
 (0,0)                                                                              (240,0)
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │  HILLS AND SKY (parallax back layer; Mitthu's mountain home on the horizon)          │
 │                                                                                      │
 │   ┌─────────────────────────────┐    peepal     ┌──────────────────┐                 │
 │   │  town.temple                │    tree +     │ town.library     │   ┌───────────┐ │
 │   │  temple and cultural        │    well       │ public library   │   │ portal:   │ │
 │   │  courtyard (optional)       │              │ (two floors)     │   │ space     │ │
 │   └──────────────┬──────────────┘              └────────┬─────────┘   └─────┬─────┘ │
 │                  │  lane (stone)                        │  lane               │       │
 │  ════════════════╧════════════════ MAIN LANE ═══════════╧═════════════════════╧════  │
 │                  │                                      │                             │
 │   ┌──────────────┴──────────────────────────────────────┴────────────────────────┐   │
 │   │  house  (Dadaji's plot, 96 × 72 wu, low clay boundary wall, blue gate)      │   │
 │   │                                                                              │   │
 │   │   house.garden (massive: the plot minus the house footprint)                │   │
 │   │   ┌───────────┐ ┌───────────┐ ┌───────────┐       ┌───────────────────────┐ │   │
 │   │   │ shelter.  │ │ shelter.  │ │ shelter.  │       │ orchard               │ │   │
 │   │   │ goat (rsv)│ │ hen (rsv) │ │ horse(rsv)│       │ mango · guava · neem  │ │   │
 │   │   └───────────┘ └───────────┘ └───────────┘       │ jamun · amla · banana │ │   │
 │   │   ┌─────────────┐  ┌──────────────────────┐       └───────────────────────┘ │   │
 │   │   │ house.      │  │ house.cowshed        │  ┌──────────┐  ┌────────────┐   │   │
 │   │   │ store       │  │ Gauri · Dhanu · Kim  │  │ pond +   │  │ compost +  │   │   │
 │   │   │ tools       │  │ kennel · Molly hutch │  │ fountain │  │ bird feed  │   │   │
 │   │   └─────────────┘  └──────────────────────┘  └──────────┘  └────────────┘   │   │
 │   │                                                                              │   │
 │   │            ┌────────────────────────────────────────┐   flower beds          │   │
 │   │            │  THE HOUSE (two floors + terrace)      │   vegetable patch      │   │
 │   │            │  veranda faces the lane (south)        │   medicinal corner     │   │
 │   │            │  13 rooms – see 04-house-floor-plan.md │   butterfly corner     │   │
 │   │            └──────────────┬─────────────────────────┘   creeper pergola      │   │
 │   │   ┌───────────┐ ┌─────────┴──────┐ ┌───────────┐                            │   │
 │   │   │ shelter.  │ │ house.veranda  │ │ shelter.  │   shelter.rescue (rsv)     │   │
 │   │   │ duck_pond │ │ swing · Mitthu │ │ bee (rsv) │                            │   │
 │   │   │ (rsv)     │ │ perch · steps  │ │           │                            │   │
 │   │   └───────────┘ └────────────────┘ └───────────┘                            │   │
 │   └──────────────────────────────┬───────────────────────────────────────────────┘   │
 │                                  │ blue gate                                          │
 │  ════════════════════════════════╧═══════════ MAIN LANE ═══════════════════════════  │
 │                                  │                                                    │
 │   ┌──────────────────────────────┴───────────────────────┐   ┌───────────┐ ┌──────┐  │
 │   │  town.public_garden                                  │   │ portal:   │ │portal│  │
 │   │  playground · swings · slides · cricket ground ·     │   │ forest /  │ │ocean │  │
 │   │  running track · butterfly garden · tree trail ·     │   │ mountains │ │      │  │
 │   │  outdoor science stations · community mandap         │   └───────────┘ └──────┘  │
 │   └──────────────────────────────────────────────────────┘   ┌───────────┐ ┌──────┐  │
 │                                                              │ portal:   │ │portal│  │
 │   RIVER (front layer; boats, reflections)                    │ museum /  │ │monu- │  │
 │                                                              │ archaeology│ │ments │  │
 │                                                              └───────────┘ └──────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────┘
 (0,160)                                                                          (240,160)
```

`(rsv)` marks the six reserved animal-shelter plots inside the garden (`shelter.goat`,
`shelter.hen`, `shelter.horse`, `shelter.duck_pond`, `shelter.bee`, `shelter.rescue`). They are
drawn today as fenced grassy plots with a small wooden signboard ("Coming soon" in the child's
language) so that future shelters are added as content, not as a redesign.

### Location table

| Location ID | World position (wu) | Size (wu) | Opens at | Primary sections |
|---|---|---|---|---|
| `house` (plot) | 40, 50 | 96 × 72 | Day 1 | all |
| `house.veranda` | 80, 112 | 20 × 8 | Day 1 | mind, music, stories |
| `house.garden` | plot minus footprint | ~5,200 wu² | Day 1 | nature, academic (science), explore |
| `house.cowshed` | 60, 66 | 22 × 10 | Day 1 | nature, mind |
| `house.store` | 44, 66 | 12 × 10 | After first garden activity | nature, stem |
| `town.public_garden` | 30, 128 | 90 × 26 | Day 1 (playground); sports grounds after first sports lesson | sports, nature, mind |
| `town.library` | 150, 14 | 36 × 24 | Day 1 | academic, stories, explore |
| `town.temple` | 16, 10 | 56 × 26 | Parent toggle (off by default for A0–A1) | explore, music, art |
| `town.excursions` (portals) | right and bottom margins | 10 × 10 each | Each unlocks on first related lesson | explore, academic, stem |

## 2. Navigation model: continuous world with a hub overlay

Two models were considered.

| Model | Strengths | Weaknesses |
|---|---|---|
| Hub map (tap a card, jump to a scene) | Fast, cheap, simple for A1 | Feels like a menu; breaks the "I live here" feeling the master prompt requires |
| Continuous scroll-and-zoom world | Immersive, discoverable, progress is visible in place | Needs camera rules, more asset work, harder for the youngest |

**Decision: a continuous scroll-and-zoom world, with a hub overlay ("Dadaji's map") that is
always one tap away.** The world is the default view; the overlay exists so that navigation
never depends on exploring (master prompt §6). Both reach the same location IDs.

- **Zoom levels.** Z0 *world* (whole 240 × 160 canvas), Z1 *place* (one plot or building, e.g.
  the house plot or the public garden), Z2 *room* (one room or garden zone, the level where
  objects become interactive), Z3 *activity* (the lesson or activity itself, full screen).
- **Entering.** Tapping a building door, a gate or a portal at Z0/Z1 tweens the camera to Z2.
  Tapping an object at Z2 starts the interaction (see `10-interactive-object-map.md`).
- **Leaving.** A single, persistent, large "back" pebble at the bottom left always goes one zoom
  level out. There is never a dead end.
- **The map overlay.** The top-right "map" button opens Dadaji's hand-drawn map with the twelve
  illustrated tabs (eight sections, Stories, Tests, My Achievements, Parents) along the bottom
  and the places as tappable paintings. Tapping a place animates the camera to it.

## 3. Camera and traversal rules

1. The camera follows Gopu. The child drags to look around; the camera eases back to Gopu after
   three seconds of inactivity (Explorer mode) or immediately (Little mode).
2. Pinch zooms between Z0 and Z1 (Explorer only). Little mode uses tap-to-zoom only.
3. Tapping anywhere walkable moves Gopu there along a precomputed path (nav mesh of lanes,
   paths and room floors). Dadaji, Kim and the current companion follow on a short delay.
   Gauri and Dhanu stay within the plot; Mitthu flies and lands on the nearest perch.
4. Doors, gates and portals are the only transitions between scenes; each has a 400 ms
   "wipe" with a sound (gate creak, door bell, portal shimmer).
5. The camera never shows beyond the canvas; edges are soft hills, river and sky so there is
   no visible "end of the world".
6. Walk speed is scaled by the parent's animation-speed setting; "Very Fast" also allows a
   double-tap to arrive instantly.
7. Reduce-motion replaces tweens with 150 ms cross-fades and stops ambient loops.

## 4. Characters in the world

| Character | Where they idle | How they move | What they do on the map |
|---|---|---|---|
| Dadaji | Veranda swing, living room armchair | Walks beside Gopu | Greets, suggests the next activity ("Beta, the tulsi needs water"), introduces every place |
| Gopu | Wherever the child left them | Player-controlled walk/run | Comments, points at objects, asks questions |
| Kim | Veranda steps, public garden | Runs ahead, circles back | Finds hidden objects, leads to the sports ground |
| Molly | Study, under the mango tree | Hops beside Gopu | Counts things aloud, spots patterns ("Three butterflies, two yellow") |
| Gauri | Cow shed, orchard shade | Slow walk within the plot | Nutrition and animal-care prompts |
| Dhanu | Next to Gauri, garden paths | Hops, often in the wrong direction | Comic distraction; A0–A1 mini-activities |
| Mitthu | Veranda perch, Dadaji's shoulder, peepal tree by the library | Flies | Mitthu's Echo revision prompts; repeats the day's key clause when tapped |

Companion selection: the child chooses one animal companion from the veranda each session;
the others remain visible in their places. Dadaji always comes along.

## 5. Time of day and seasons

- **Time of day** follows the device clock in four states: morning (06–11), afternoon
  (11–17), evening (17–20), night (20–06). Sky, shadows, lamp states and ambient sound change.
  Night switches the veranda lantern on and biases suggestions towards bedtime stories.
  Parents can lock a fixed time of day in Settings for children sensitive to the change.
- **Seasons** follow the Indian calendar in six ritus, each with a visual pass on the garden,
  orchard and sky: Vasant (spring), Grishma (summer), Varsha (monsoon), Sharad (autumn),
  Hemant (pre-winter), Shishir (winter). Seasons drive garden activities (sowing, monsoon
  puddles, harvest) and festival decorations on the lane and the temple courtyard.
- **Festivals** add temporary decorations and activities (diyas, kites, rangoli, pookalam,
  Durga pandal) on the dates in the content calendar managed from the CMS (`20-admin-cms.md`).

## 6. Minimap and wayfinding

- A round minimap sits top-left at Z0–Z2, drawn in Dadaji's hand-painted map style, with Gopu
  as a moving dot, Dadaji as a spectacles icon, and pulsing marks for "something new today".
- Signposts stand at every lane junction with the place's name in the chosen language and a
  picture for pre-readers.
- Dadaji's suggestion bubble ("Shall we visit the library today?") is the primary wayfinding for
  A1–A2; tapping it walks the party there.

## 7. Unlock rules

The world opens gradually so that A1–A2 learners are not overwhelmed, but nothing educational is
ever locked behind payment or chance.

| Area | Unlock rule |
|---|---|
| House ground floor, veranda, garden paths, cow shed, playground | From the first session |
| Store room, tool shed | After the first garden activity |
| Laboratory, music room, art room | After the child's first visit to the living room lesson that introduces them (Dadaji walks them there) |
| First floor (study, bedroom, playroom, bathroom) | After the first full day; bedroom opens with the first bedtime |
| Sports grounds, science stations | After the first sports or science lesson |
| Public library | Day 1 (Little mode shows the picture-book hall only) |
| Temple courtyard | Parent toggle; never auto-unlocks |
| Excursion portals | Each opens with its first related lesson (space portal with the telescope lesson, ocean with marine life, etc.) |
| Reserved shelters | Content releases; shown as "coming soon" plots until then |

Unlocks are celebrated by Dadaji walking the child there, never by a popup alone.

## 8. Little mode versus Explorer mode

| Aspect | Little mode (A0–A2) | Explorer mode (A3–A5) |
|---|---|---|
| Default zoom | Z1 (one place at a time) | Z0 world |
| Gestures | Tap only; no pinch, no drag | Tap, drag, pinch |
| Visible places | House, garden, cow shed, playground, library picture hall | Everything unlocked |
| Suggestions | Dadaji's bubble every 20 seconds of idling | Dadaji's bubble on arrival at a place |
| Hub overlay | Six large paintings, audio labels | Twelve tabs with text |
| Objects per room | 3–5 highlighted with a soft glow | 6–12, no glow unless idle for 10 s |
| A0 (Lap mode) | No map at all: a carousel of sound-and-picture scenes a parent swipes | – |

## 9. Location-to-section mapping

| Location | Academic | STEM | Music | Art | Sports | Nature | Mind | Explore | Stories |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| house.living_room | ● | ● | | | | | ● | ● | ● |
| house.study | ● | ● | | | | | ● | ● | ● |
| house.lab | ● | ● | | | | ● | | ● | |
| house.music_room | | | ● | | | | ● | ● | |
| house.art_room | | | | ● | | | ● | | |
| house.kitchen | ● | | | | | ● | ● | | |
| house.dining | ● | | | | | ● | ● | | |
| house.bedroom | | | | | | ● | ● | | ● |
| house.playroom | ● | ● | | | ● | | ● | | |
| house.veranda | | | ● | | | | ● | | ● |
| house.bathroom | | | | | | ● | | | |
| house.cowshed | ● | | | | | ● | ● | | |
| house.store | | ● | | | | ● | | | |
| house.garden | ● | ● | | ● | | ● | ● | ● | |
| town.public_garden | | ● | | | ● | ● | ● | | |
| town.library | ● | | | | | | ● | ● | ● |
| town.temple | | | ● | ● | | | ● | ● | ● |
| town.excursions | ● | ● | | | | ● | | ● | |

Every section is reachable from at least three locations, and every location serves at least
two sections. The full object-level mapping is the database described in
`10-interactive-object-map.md`.

## 10. Data representation

The map is content, not code. A `locations` table (see `17-database-schema.md`) stores each
location's ID, parent, world rectangle, zoom level, unlock rule, scene asset pack, ambient
sound set and age-mode visibility; `objects` stores interactive objects within a location. The
scene renderer (`src/dadu/miniverse`) reads these and draws the layered SVG/Rive scene, so new
areas (the reserved shelters, a future school lane) ship as content packs with no app update.
