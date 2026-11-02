# 06 – Garden designs

Two gardens, two purposes. The **private family garden** (`house.garden`) is the child's own
living, persistent world: everything planted stays, grows and is harvested over real days. The
**public garden** (`town.public_garden`) is the shared place for physical education,
environmental learning and social activities. Both are part of the continuous Miniverse
(`03-miniverse-map.md`); the plot layout is in `04-house-floor-plan.md`.

## Part A – The private family garden (`house.garden`)

### A1. Zones

The garden is everything on the 96 × 72 wu plot outside the house footprint, the veranda, the
cow shed and the store (about 5,200 wu²). It is deliberately larger than the house.

| Zone ID | Where on the plot | Size (wu) | What is there |
|---|---|---|---|
| `house.garden.flower_beds` | East of the house | 14 × 10 | Marigold, hibiscus, jasmine, rose, sunflower, lotus (pond edge), champa |
| `house.garden.orchard` | North-east | 26 × 16 | Mango, guava, neem, jamun, amla, banana, coconut, papaya, a tamarind at the wall |
| `house.garden.vegetable_patch` | East, by the kitchen door | 14 × 10 | Tomato, brinjal, okra, spinach, coriander, chilli, pumpkin on the wall, beans on a trellis |
| `house.garden.medicinal_corner` | South-east | 8 × 8 | Tulsi, aloe vera, mint, curry leaf, giloy, lemongrass, ajwain, neem sapling |
| `house.garden.creeper_pergola` | Along the east wall | 20 × 3 | Bottle gourd, money plant, bougainvillea, morning glory |
| `house.garden.butterfly_corner` | South-east, sunny | 8 × 6 | Lantana, milkweed, ixora, a shallow water dish; butterflies, bees, ladybirds, dragonflies |
| `house.garden.bird_feeders` | Orchard edge | points | Two feeders, a clay water bowl, a nesting box |
| `house.garden.fountain` | Centre-east | 4 × 4 | Stone fountain with a lotus pattern |
| `house.garden.pond` | North-centre | 10 × 6 | Lotus, water lily, fish, a frog, dragonflies; a stepping-stone edge |
| `house.garden.compost` | North, by the cow shed | 6 × 6 | Three bins: fresh, turning, ready; gobar from the shed; a thermometer |
| `house.garden.paths` | throughout | – | Stone and brick paths, a tulsi chaura at the aangan, a bench under the mango |
| `house.garden.tool_shed_link` | North-west | door | Door to `house.store` for tools and seeds |
| `house.garden.balcony_pots` | First-floor balcony | 10 pots | Herbs and flowers in pots; the same growth model |
| `shelter.goat`, `shelter.hen`, `shelter.horse`, `shelter.duck_pond`, `shelter.bee`, `shelter.rescue` | Corners of the plot | 8 × 6 to 12 × 8 | Reserved: fenced grass, a signboard, wildflowers. Future content packs |

### A2. Persistent growth model

The garden remembers. Growth is driven by completed activities and real time, so a child who
returns after a week finds their tomato taller and Dadaji says so.

**Plant states**

| State | Visual | How it advances |
|---|---|---|
| `empty_bed` | Tilled soil | Child chooses a seed from the seed cabinet |
| `sown` | A marker stick with a picture | Sowing activity completed |
| `sprout` | Two leaves | 1 real day after sowing, if watered at least once |
| `seedling` | Small plant | 2 more days, watered at least twice |
| `growing` | Half-size plant, buds | 3 more days, one care task (weeding, support stick) |
| `flowering` | Flowers | 2 more days |
| `fruiting` | Fruit or vegetable visible | 3 more days; species-dependent |
| `harvest_ready` | Glowing fruit, Molly counts them | Child harvests; produce goes to the kitchen basket |
| `resting` | Trimmed plant or empty bed | Perennials rest 1 day; annuals return to `empty_bed` |

Rules:

1. **Timers are real time**, clamped: a plant never needs more than one visit a day and never
   dies. A neglected plant droops (visual only) and perks up on the next watering. Nothing is
   punished; absence is explained kindly ("The plant missed you, but look, it waited").
2. **Each state change is a lesson hook.** The first sprout starts the "parts of a plant" lesson;
   the first flower starts pollination (A3+); the first fruit starts seeds and life cycles.
3. **Difficulty follows the band.** A1 plants three species in one bed with Dadaji doing the
   steps; A5 plans a bed on a grid, chooses companions (marigold beside tomato), reads a
   watering schedule and logs growth in the study notebook.
4. **Seasons matter in Explorer mode.** Sowing out of season is allowed but Dadaji explains
   why the plant grows slowly; sowing in season gives faster timers (`03-miniverse-map.md` §5).
5. **Persistence.** The server stores each plant's species, bed slot, state, timestamps and care
   log; the device caches it for offline play and syncs later (`17-database-schema.md`,
   `18-api.md`). Decorations earned through gamification (a scarecrow, a bird bath, fairy
   lights) are placed by the child and persist.
6. **Connection to the cow shed.** Gobar collected in the shed fills the compost; ready compost
   speeds the next `growing` step by one day and teaches the cycle.
7. **Connection to the kitchen.** Harvested produce appears in `house.kitchen.vegetable_basket`
   and in the thali activity.

### A3. Activities and object IDs

| Object ID | Activity | Learning objective | Bands | Real-world assignment |
|---|---|---|---|---|
| `house.garden.seed_tray` | Choose and sow a seed | Seeds, what plants need | A1+ | `rwa.gardening.plant_a_seed` |
| `house.garden.watering_can` | Water a bed (tilt to pour) | Water, measurement (litres, A3+) | A0+ | `rwa.gardening.water_a_plant` |
| `house.garden.bed_<n>` (12 beds) | Plant, weed, support, harvest | Life cycle, parts of a plant | A1+ | `rwa.gardening.grow_a_vegetable` |
| `house.garden.flower_bed` | Identify flowers (tap, hear, match) | Flower names in two languages, colours, petals | A1+ | `rwa.gardening.observe_a_flower` |
| `house.garden.leaf_board` | Match five leaves | Leaf shapes, trees | A2+ | `rwa.gardening.identify_five_leaves` |
| `house.garden.butterfly_corner` | Observe with a magnifier | Insects, life cycle, pollination | A1+ | `rwa.nature.observe_insects` |
| `house.garden.sun_leaf` | Hold a leaf to the sun | Photosynthesis (A2 simple, A5 equation) | A2+ | `rwa.science.observe_shadows` |
| `house.garden.orchard_tree_<species>` | Shake, harvest, measure | Fruit trees, seasons, counting | A1+ | `rwa.nature.identify_trees` |
| `house.garden.compost` | Layer greens and browns, turn | Decomposition, waste to soil | A2+ | `rwa.nature.waste_segregation` |
| `house.garden.pond` | Feed fish, spot the frog | Pond life, water animals, amphibians | A1+ | – |
| `house.garden.fountain` | Switch | Water cycle, conservation, pumps (A4+) | A1+ | `rwa.nature.water_conservation` |
| `house.garden.bird_feeder` | Fill | Birds of India, bird identification, migration (A4+) | A1+ | `rwa.nature.observe_birds` |
| `house.garden.nesting_box` | Peek | Nests, eggs, patience | A1+ | – |
| `house.garden.rain_gauge` | Read | Measurement, weather, monsoon | A3+ | `rwa.nature.understand_weather` |
| `house.garden.season_wheel` | Turn | Six ritus, what to sow when | A2+ | – |
| `house.garden.medicinal_corner` | Smell and match | Tulsi, aloe, mint and their traditional uses (labelled as tradition, not medical advice) | A2+ | – |
| `house.garden.bench` | Sit | Dadaji's garden stories, rest, breathing | all | – |
| `house.garden.decoration_slot_<n>` | Place | Rewards: scarecrow, bird bath, lights, pots | all | – |
| `shelter.<name>.signboard` | Tap | "Coming soon"; Dadaji talks about that animal | all | – |

### A4. Garden chrome

A persistent "garden" view at Z1 shows the whole plot with a care summary (three plants need
water, one is ready to harvest). Tapping a zone zooms to Z2. Little mode shows a single bed and
the watering can, with Dadaji doing the rest.

## Part B – The public garden (`town.public_garden`)

### B1. Layout

South of the main lane, along the river, 90 × 26 wu.

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ PLAYGROUND          SPORTS GROUNDS              BUTTERFLY GARDEN + TREE   │
 │ swings, slides,     cricket pitch, football      TRAIL (20 labelled trees)│
 │ seesaw, climbing    goal, badminton court,                               │
 │ net, sandpit,       basketball hoop, kabaddi    OUTDOOR SCIENCE STATIONS │
 │ balance beam,       and kho-kho court, volley   sundial, weather vane,   │
 │ merry-go-round      net, table tennis table,    rain gauge, water-flow   │
 │                     mallakhamb pole, yoga lawn  channel, pulley swing,   │
 │ WALKING TRACK (loop around everything, 200 wu, distance markers)         │
 │ COMMUNITY MANDAP: open pavilion for group games, festivals, performances  │
 │ RIVER BANK: boats, ducks, a bridge, a "clean the river" station          │
 └───────────────────────────────────────────────────────────────────────────┘
```

### B2. Activities

**Sports and fitness (Section 5).** Every sport in the master prompt has a station. Each
station runs the same loop: Dadaji explains the skill, an animated demonstration (Gopu, with
Kim as fielder or goalkeeper), a tap/swipe/tilt mini-practice, then a real-world assignment
("practise throwing and catching with an adult", `rwa.sports.throw_and_catch`).

| Object ID | Sport or skill | Mini-practice | Bands |
|---|---|---|---|
| `town.public_garden.cricket_pitch` | Cricket batting, bowling, fielding | Timed tap to bat; swipe to bowl | A2+ |
| `town.public_garden.football_goal` | Football | Swipe to kick, Kim dives | A2+ |
| `town.public_garden.badminton_court` | Badminton | Tap rally | A3+ |
| `town.public_garden.basketball_hoop` | Basketball | Drag to shoot | A3+ |
| `town.public_garden.volleyball_net` | Volleyball | Tap to set and spike | A4+ |
| `town.public_garden.tennis_wall` | Tennis, squash | Rally against a wall | A4+ |
| `town.public_garden.tt_table` | Table tennis | Rally | A3+ |
| `town.public_garden.hockey_strip` | Hockey | Dribble path | A4+ |
| `town.public_garden.track` | Athletics, running, walking | Step rhythm tap; distance markers teach metres | A1+ |
| `town.public_garden.pool_sign` | Swimming (awareness only) | Water safety lesson; no virtual swimming without an adult | A2+ |
| `town.public_garden.cycle_stand` | Cycling | Balance and road safety | A2+ |
| `town.public_garden.kabaddi_court` | Kabaddi | Breath-hold chant and tag | A3+ |
| `town.public_garden.kho_kho_court` | Kho-kho | Sitting pattern, chase | A3+ |
| `town.public_garden.mallakhamb_pole` | Mallakhamb (awareness, stretches) | Pose matching | A4+ |
| `town.public_garden.yoga_lawn` | Yoga, stretching, balance, flexibility | Follow-along poses with Dadaji | A1+ |
| `town.public_garden.balance_beam` | Balance, coordination | Tilt the device | A1+ |
| `town.public_garden.playground` | Swings, slides, seesaw, sandpit | Free play; pendulum, ramps, friction (A3+) | A0+ |

**Nature and environment (Section 6).**

| Object ID | Activity | Learning | Bands |
|---|---|---|---|
| `town.public_garden.tree_trail` | Walk, tap trees | Twenty Indian trees: peepal, banyan, neem, gulmohar, ashoka, teak, sal, deodar and more | A2+ |
| `town.public_garden.butterfly_garden` | Spot and name | Butterfly species, host plants | A1+ |
| `town.public_garden.bins` | Sort waste | Wet, dry, hazardous; recycling | A1+ |
| `town.public_garden.river_station` | Clean, test | Water pollution, conservation, river life | A3+ |
| `town.public_garden.sundial` | Read | Time from shadows (shadows assignment) | A3+ |
| `town.public_garden.weather_vane` | Read | Wind, weather | A2+ |
| `town.public_garden.water_channel` | Open gates | Water flow, irrigation, dams | A3+ |
| `town.public_garden.pulley_swing` | Pull | Simple machines outdoors | A3+ |
| `town.public_garden.bridge` | Cross, inspect | Structures; paper-bridge assignment | A3+ |

**Social and cognitive (Section 7).** The community mandap hosts team games with the animals
(Kim's team against Molly's), turn-taking, fair play, a "what would you do" scenario game for
conflict resolution, festival performances from the music room, and a monthly "garden mela"
event managed from the CMS calendar.

### B3. Rules for the public garden

- No other children are simulated as peers; the companions are the team-mates. There is no
  multiplayer and no chat.
- Every sport's real-world assignment lists adult supervision and a safe-space check.
- Sports grounds unlock after the first sports lesson; the playground is open from day one.
- Little mode shows the playground, the yoga lawn, the butterfly garden and the bins.

## C. Shared growth and reward hooks

| Event | Garden effect |
|---|---|
| Any lesson completed | A butterfly visits the butterfly corner for the day |
| Five-day streak of care (no pressure mechanic; purely visual) | A bird nests in the nesting box |
| Chapter test passed | A new decoration is offered for a slot |
| Real-world gardening assignment confirmed | The matching real plant's virtual twin advances one state |
| Season change | New seeds appear in the cabinet |

Rewards never require purchase, never expire and never create loss (`00-canon.md` §8).
