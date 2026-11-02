# 05 – Room designs

Thirteen rooms, one design language. Every room is a layered, hand-painted scene with a back
layer (walls, windows, sky), a mid layer (furniture, the characters) and a front layer (a
plant, a doorway edge, a hanging lamp) that parallax gently as the child drags. Every object
listed here is an entry in the interactive object database (`10-interactive-object-map.md`)
with a learning objective, a character reaction, an activity and an assessment. The house
plan is in `04-house-floor-plan.md`; the palette tokens are in `00-canon.md` §4.

Common rules:

- Objects are drawn at least 48 × 48 pt on a phone; Little mode scales the highlighted ones to
  72 pt and gives them a slow glow.
- Dadaji stands in each room's "teaching spot" (marked ◎ below), facing the camera, so that the
  dialogue bubble never covers the objects.
- Tapping an object plays its animation and Dadaji's one-line introduction before anything
  else happens; a second tap or "Let's try" starts the activity.
- Ambient sound loops are 20–40 s, ducked under dialogue (`14-voice-audio.md`).

## 1. Veranda – `house.veranda`

**Mood and palette.** Welcoming. `paper` plaster walls, `clay` floor, `indigo` door, `marigold`
torans. Morning sun from the left; a lantern at night.

**Layers.** Back: house façade, main door, two jharokha windows, the first-floor balcony with
pots. Mid: the swing (jhoola), Dadaji's armchair, Mitthu's perch, Kim's mat, steps, a shoe
rack, a brass water pot. Front: a hanging lantern and a tulsi pot edge.

**Furniture and decor.** Swing, cane chair, perch, mat, shoe rack, water pot, toran, rangoli
spot at the steps, a calendar with the Indian month, a doorbell.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.veranda.swing` | Sit and swing; rhymes play | Rhythm, pendulum (A4+) | all |
| `house.veranda.mitthu_perch` | Tap Mitthu | Mitthu's Echo: repeats the last lesson's key clauses | all |
| `house.veranda.shoe_rack` | Drag shoes to pairs | Pairs, matching, the habit of removing shoes | A0–A2 |
| `house.veranda.calendar` | Tap | Day, date, month, Indian months and seasons | A2+ |
| `house.veranda.rangoli_spot` | Draw | Daily rangoli; symmetry | A1+ |
| `house.veranda.water_pot` | Tap | Welcoming a guest, water for Kim | A1+ |
| `house.veranda.doorbell` | Ring | Sound, politeness, "may I come in" | A0–A2 |
| `house.veranda.companion_mat` | Tap an animal | Choose today's companion | all |

**Characters.** Dadaji ◎ on the swing; Mitthu on the perch; Kim on the mat; the others visit.
**Ambient.** Birds, a distant bicycle bell, the swing's creak, crickets at night.
**Little vs Explorer.** Little: swing, Mitthu, companion mat, shoe rack glow. Explorer: all,
plus the calendar shows the weekly plan.

## 2. Living room – `house.living_room`

**Mood and palette.** The main teaching room: warm and bright. `cream` walls, `indigo` niche,
`clay` floor with a woven rug in `saffron` and `peepal`.

**Layers.** Back: wall with a large map of India, a niche with a brass lamp, a clock, a window
to the aangan with the tulsi. Mid: Dadaji's armchair, a low divan, a round table, the
telescope on its tripod, the globe, the bookshelf, the radio, a carrom board on the floor.
Front: a doorway arch and a hanging plant.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.living_room.telescope` | Look through | How a telescope works; Moon, planets; leads to the terrace and the space portal | A2+ |
| `house.living_room.globe` | Spin, tap | Continents, countries, India's place (Molly asks) | A2+ |
| `house.living_room.wall_map_india` | Tap a state | States and capitals, languages, festivals | A3+ |
| `house.living_room.bookshelf` | Pull a book | Story Corner entry; today's story | all |
| `house.living_room.radio` | Tune | Sound, waves (A4+); songs and news for the day; language listening | A1+ |
| `house.living_room.clock` | Move hands | Telling time; daily routine | A2+ |
| `house.living_room.carrom` | Flick | Angles, force, turn-taking | A3+ |
| `house.living_room.brass_lamp` | Light | Light and shadow; festival diya | A1+ |
| `house.living_room.photo_wall` | Tap frames | Family, famous personalities, who's who | A2+ |
| `house.living_room.abacus` | Slide beads | Counting, place value, Vedic mental maths | A1+ |
| `house.living_room.divan_cushions` | Count, sort | Colours, counting, patterns | A0–A2 |
| `house.living_room.window_tulsi` | Tap | Introduces the aangan and plants | A1+ |

**Characters.** Dadaji ◎ in the armchair; Molly on the divan with her notebook; Gopu on the rug.
**Ambient.** Clock tick, the radio's faint song when idle, aangan birds.
**Little vs Explorer.** Little: bookshelf, globe, lamp, cushions, abacus (five glowing). Explorer:
all twelve; the wall map shows a quiz mode.

## 3. Study room and private library – `house.study`

**Mood.** Quiet and focused. `paper` walls, dark wood, a green desk lamp, north light.

**Layers.** Back: floor-to-ceiling shelves, a window, a pinboard of maps and certificates.
Mid: a desk with an inkpot, notebooks, a small computer, a reading chair, Molly's low table with
puzzles, a dictionary stand. Front: a desk-lamp cone and a curtain edge.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.study.desk_notebook` | Open | Writing, handwriting tracing, creative writing | A2+ |
| `house.study.alphabet_chart` | Tap letters | Phonics in the chosen language and script | A1–A3 |
| `house.study.dictionary` | Open | Vocabulary, two-language lookup | A3+ |
| `house.study.computer` | Switch on | Computer fundamentals, keyboard and mouse, block coding, Python introduction (A5) | A3+ |
| `house.study.pinboard_maps` | Tap | Geography, continents, oceans | A3+ |
| `house.study.private_shelf` | Browse | Borrowed library books, reference, the child's own writings | A2+ |
| `house.study.molly_puzzle_table` | Sit | Sudoku, crosswords, riddles, logic grids | A3+ |
| `house.study.inkpot` | Dip | Letters and scripts of India, calligraphy strokes | A3+ |
| `house.study.certificate_frame` | Tap | My Achievements shortcut | A2+ |
| `house.study.grammar_box` | Sort cards | Nouns, verbs, tenses, sentence building | A3+ |

**Characters.** Dadaji ◎ at the reading chair; Molly at her table; Mitthu on the shelf for
vocabulary echoes. **Ambient.** Page turns, a pen scratch, a ceiling fan.
**Little vs Explorer.** Little: alphabet chart, notebook tracing, shelf (three glowing).
Explorer: all; the computer opens the STEM virtual lab.

## 4. Science laboratory – `house.lab`

**Mood.** Curious and safe. `sky`-tinted walls, `monsoon` benches, chalkboard, bottles in
`peepal` and `marigold`.

**Layers.** Back: chalkboard with the day's diagram, a window to the cow shed, a periodic
table poster (A4+), a safety board. Mid: two benches with a sink, a magnet wall, a shelf of
jars, a microscope, a weighing balance, a prism on a stand, a small circuit board, a plant
under a lamp, a skeleton model (A3+), a bowl of water with objects. Front: a hanging bulb and a
goggles hook.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.lab.magnet_wall` | Drag objects | Magnetism, attract and repel, poles | A2+ |
| `house.lab.prism` | Turn in sunlight | Light, colours, rainbow | A2+ |
| `house.lab.float_sink_bowl` | Drop objects | Floating and sinking, density (A4+) | A1+ |
| `house.lab.microscope` | Look | Cells, leaf, pond water | A3+ |
| `house.lab.circuit_board` | Connect | Electricity, circuits, switches, safety | A3+ |
| `house.lab.balance` | Weigh | Mass, comparison, grams | A2+ |
| `house.lab.chalkboard` | Tap | Today's concept diagram; Dadaji draws | all |
| `house.lab.jar_shelf` | Tap jars | States of matter, solids/liquids/gases, mixing (safe) | A2+ |
| `house.lab.plant_lamp` | Switch | Photosynthesis experiment over days | A3+ |
| `house.lab.skeleton` | Tap bones | Human body, bones, organs | A3+ |
| `house.lab.tuning_fork` | Strike | Sound, vibration, pitch | A2+ |
| `house.lab.safety_board` | Tap | Lab safety, adult supervision reminder before every real-world experiment | all |

**Characters.** Dadaji ◎ at the bench in a lab apron over his kurta; Kim on a stool (sniffs
everything); Molly records results. **Ambient.** Bubbling, a ticking timer, the fan.
**Little vs Explorer.** Little: float-sink, magnets, prism, tuning fork. Explorer: all; the
chalkboard holds the experiment log.

## 5. Music room – `house.music_room`

**Mood.** Soft and festive. `rose` curtains, `cream` walls, a low stage with a rug.

**Layers.** Back: a wall of framed instruments, a window with a wind chime, a tanpura in the
corner. Mid: tabla pair, harmonium, sitar on a stand, flute shelf, a small keyboard/piano,
violin, guitar, a veena, mridangam, a drum kit (A4+), ghungroo on a hook, a mirror for dance.
Front: a curtain edge and the wind chime.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.music_room.harmonium` | Press keys | Swar (sa re ga ma), scales | A1+ |
| `house.music_room.tabla` | Tap | Taal, rhythm patterns, counting beats | A1+ |
| `house.music_room.piano` | Play | Western notes, melodies, simple songs | A1+ |
| `house.music_room.sitar` | Pluck | Strings, raga introduction | A3+ |
| `house.music_room.flute_shelf` | Pick | Breath, pitch, Krishna's flute stories (optional link) | A2+ |
| `house.music_room.veena` | Pluck | Carnatic swaras | A3+ |
| `house.music_room.mridangam` | Tap | Carnatic taal | A3+ |
| `house.music_room.guitar` | Strum | Chords, rhythm | A3+ |
| `house.music_room.violin` | Bow | Pitch, posture | A4+ |
| `house.music_room.ghungroo` | Tie on | Kathak, Bharatanatyam, Odissi, Kuchipudi, Manipuri, Mohiniyattam basics; folk dances | A1+ |
| `house.music_room.mirror_stage` | Stand | Theatre, acting, public speaking, storytelling | A2+ |
| `house.music_room.wind_chime` | Tap | Sound and pitch; Mitthu echoes a rhythm | A0+ |

**Characters.** Dadaji ◎ on the rug with the harmonium; Mitthu echoes rhythms; Dhanu dances
badly and joyfully. **Ambient.** A soft tanpura drone, the chime.
**Little vs Explorer.** Little: harmonium, tabla, piano, ghungroo, chime. Explorer: all; the
stage records a performance into the gallery.

## 6. Art and creativity room – `house.art_room`

**Mood.** Bright and messy in a good way. `plum` accents, white walls splashed with colour, a
skylight.

**Layers.** Back: a gallery wall of the child's saved creations, a skylight, a shelf of folk-art
samples (Madhubani, Warli, Gond, Pattachitra). Mid: an easel, a paint table, a clay and pottery
wheel table, a rangoli floor square, a craft shelf (paper, scissors with rounded tips, glue),
an origami stack, a light table for animation (A4+), a drying line. Front: a paint-jar edge.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.art_room.easel` | Paint | Drawing, painting, colour mixing, digital art | all |
| `house.art_room.rangoli_square` | Place dots and lines | Rangoli, symmetry, patterns | A1+ |
| `house.art_room.folk_shelf` | Pick a style | Madhubani, Warli, Gond, Pattachitra, mandala templates | A2+ |
| `house.art_room.clay_table` | Pinch and roll | Clay modelling, pottery | A1+ |
| `house.art_room.origami_stack` | Fold | Origami step by step, paper crafts | A2+ |
| `house.art_room.craft_shelf` | Choose | DIY projects with real materials (assignment link) | A2+ |
| `house.art_room.light_table` | Flip pages | Animation basics, cartoon drawing | A4+ |
| `house.art_room.gallery_wall` | Tap | Personal gallery of saved creations | all |
| `house.art_room.writing_desk` | Write | Creative writing and illustrating a page | A3+ |
| `house.art_room.sketchbook` | Open | Sketching, shading | A3+ |

**Characters.** Dadaji ◎ at the easel with a paint smudge on his spectacles; Dhanu knocks over a
jar; Gopu at the rangoli square. **Ambient.** Brush taps, paper rustle, the skylight's birds.
**Little vs Explorer.** Little: easel (finger paint), rangoli dots, clay, gallery. Explorer:
all; the gallery supports titles and dates.

## 7. Kitchen – `house.kitchen`

**Mood.** Warm and fragrant. `clay` and `haldi` tones, brass and steel, a window to the
vegetable patch.

**Layers.** Back: shelves of labelled jars (dal, rice, atta, spices), a window, a water filter,
a chalk menu board. Mid: a counter with a weighing scale and measuring cups, a clay stove and a
gas stove (with a safety lock), a tawa, a masala box, a basket of vegetables from the garden,
a fridge, a grinding stone, a steel tiffin. Front: a hanging garlic string and the counter edge.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.kitchen.measuring_cups` | Pour | Measurement, fractions, halves and quarters | A2+ |
| `house.kitchen.weighing_scale` | Weigh | Grams and kilograms, comparison | A2+ |
| `house.kitchen.masala_box` | Open | Spices, smells, Indian food culture, counting compartments | A1+ |
| `house.kitchen.vegetable_basket` | Sort | Food groups, colours, which grew in our garden | A1+ |
| `house.kitchen.menu_board` | Plan | Balanced thali, nutrition, planning a meal | A3+ |
| `house.kitchen.stove` | Cook (virtual, safety lock) | Safe cooking steps, heat changes food (states of matter link) | A3+ |
| `house.kitchen.water_filter` | Fill | Clean water, water conservation | A1+ |
| `house.kitchen.jar_shelf` | Match labels | Reading labels, grains and pulses of India | A2+ |
| `house.kitchen.tiffin` | Pack | Packing a healthy tiffin; portion sizes | A2+ |
| `house.kitchen.grinding_stone` | Grind | Traditional tools, force and friction | A3+ |

**Characters.** Dadaji ◎ at the counter with a ladle; Gauri at the window (nutrition prompts);
Kim waits for a roti. **Ambient.** Sizzle, a pressure-cooker whistle, a spoon on steel.
**Little vs Explorer.** Little: basket sorting, masala box, water filter, tiffin. Explorer:
all; the stove opens the virtual cooking activity with a real-world assignment link
(`15-real-world-assignments.md`).

## 8. Dining room – `house.dining`

**Mood.** Family. A low wooden table with cushions, a thali rack, a wall clock for mealtimes.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.dining.thali` | Arrange | Food groups on a plate, balanced meals, regional thalis | A1+ |
| `house.dining.meal_clock` | Set | Mealtimes, routine, telling time | A2+ |
| `house.dining.cushions` | Seat everyone | Counting, sharing, seating guests | A0–A2 |
| `house.dining.hand_wash_bowl` | Wash | Before-meal hygiene (bathroom link) | A0+ |
| `house.dining.serving_spoons` | Serve | Table manners, portions, "ask before taking" | A1+ |
| `house.dining.festival_sweets` | Tap | Festival foods of India and their stories | A2+ |
| `house.dining.conversation_cards` | Draw a card | Family conversation, communication, empathy | A3+ |
| `house.dining.leftover_box` | Pack | Not wasting food; the compost link | A2+ |

**Characters.** Dadaji ◎ at the head of the table; Gauri looks in through the window; Dhanu
tries to eat the flowers. **Ambient.** Cutlery, a radio next door. **Little vs Explorer.**
Little: thali, cushions, hand wash. Explorer: all; conversation cards drive the social-skills
lessons.

## 9. Bedroom – `house.bedroom`

**Mood.** Calm. `indigo` to `night` at bedtime, a lamp, a window to the orchard, a star
ceiling that appears when the lamp dims.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.bedroom.story_shelf` | Pick | Bedtime stories (bedtime mode) | all |
| `house.bedroom.lamp` | Dim | Sleep routine, light and dark, the star ceiling | all |
| `house.bedroom.star_ceiling` | Tap stars | Constellations, Moon phases | A2+ |
| `house.bedroom.pillow_breathing` | Follow | Calm breathing, emotional regulation | A1+ |
| `house.bedroom.gratitude_jar` | Drop a note | Gratitude, reflection, journalling (A4+) | A2+ |
| `house.bedroom.alarm_clock` | Set | Sleep hours, waking time | A3+ |
| `house.bedroom.window_moon` | Look | Moon phases over real nights | A2+ |
| `house.bedroom.toy_basket` | Tidy | Household responsibility, sorting | A1+ |

**Characters.** Dadaji ◎ on the bedside stool reading; Molly on the other bed; Kim asleep at the
foot. **Ambient.** Crickets, a fan, a lullaby in the chosen language. **Little vs Explorer.**
Little: story shelf, lamp, pillow breathing. Explorer: all; the gratitude jar becomes a journal.

## 10. Indoor playroom – `house.playroom`

**Mood.** Bright, soft floor, a window to the balcony.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.playroom.block_set` | Build | Shapes, counting, engineering, 3D thinking | A0+ |
| `house.playroom.puzzle_carpet` | Assemble | Jigsaws, spatial awareness | A1+ |
| `house.playroom.chess_board` | Play Dadaji | Chess from pieces to openings | A3+ |
| `house.playroom.board_games` | Play | Turn-taking, counting, strategy, patience | A2+ |
| `house.playroom.indoor_cricket` | Bat | Hand-eye coordination; sends to the public garden | A2+ |
| `house.playroom.dress_up_trunk` | Dress | Pretend play, theatre, Indian costumes by state | A1+ |
| `house.playroom.memory_cards` | Flip | Memory, concentration | A1+ |
| `house.playroom.maze_mat` | Trace | Mazes, planning | A1+ |
| `house.playroom.dhanu_ball` | Roll | Cause and effect (A0), catching | A0+ |
| `house.playroom.team_corner` | Pick a game | Teamwork, cooperation, conflict-resolution stories | A3+ |

**Characters.** Dadaji ◎ on the floor cross-legged; Kim fetches; Dhanu chases the ball.
**Ambient.** Blocks clack, laughter. **Little vs Explorer.** Little: blocks, ball, memory cards,
puzzle carpet. Explorer: all; chess keeps a rating ladder against Dadaji.

## 11. Bathroom – `house.bathroom`

**Mood.** Clean and bright. White tiles with a `monsoon` border, a bucket and mug, a mirror.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.bathroom.wash_basin` | Wash hands | Twenty-second hand-wash with a song | A0+ |
| `house.bathroom.toothbrush_rack` | Brush | Dental care, two minutes, morning and night | A1+ |
| `house.bathroom.bucket_mug` | Bathe | Bathing steps, water saving versus a running tap | A1+ |
| `house.bathroom.mirror` | Look | Face, body parts, expressions, self-care | A0+ |
| `house.bathroom.soap_dish` | Tap | Germs and soap (microscope link) | A2+ |
| `house.bathroom.towel_hook` | Hang | Tidiness, drying hands | A1+ |
| `house.bathroom.nail_clipper` | Tap | Nail care, adult help | A2+ |
| `house.bathroom.door_knock` | Knock | Privacy and manners | A1+ |

**Characters.** Dadaji ◎ at the door (never inside with the child in the scene; he talks from
the doorway); Dhanu learns alongside. **Ambient.** Water drip, a bucket fill. **Little vs
Explorer.** Little: basin, toothbrush, mirror. Explorer: all; a weekly hygiene chart.

## 12. Cow shed and pet-care area – `house.cowshed`

**Mood.** Earthy and warm. Straw, wood, `peepal` fodder, a brass bell.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.cowshed.gauri_stall` | Feed, brush | Animal care, kindness, what cows eat | A0+ |
| `house.cowshed.dhanu_corner` | Play | Baby animals, growth | A0+ |
| `house.cowshed.kim_kennel` | Fill bowl | Dog care, water, walks | A0+ |
| `house.cowshed.molly_hutch` | Clean | Rabbit care, hay, gentleness | A1+ |
| `house.cowshed.feed_bins` | Sort | Hay, green fodder, grain; measuring | A1+ |
| `house.cowshed.milk_pail` | Milk | Dairy, where milk comes from, nutrition | A2+ |
| `house.cowshed.first_aid_box` | Open | Animal first-aid awareness, calling an adult or a vet | A3+ |
| `house.cowshed.gobar_basket` | Carry | Compost and biogas, waste to resource | A2+ |
| `house.cowshed.hay_loft` | Climb | Simple machine (pulley), storage | A3+ |
| `house.cowshed.bell` | Ring | Sound, calling the animals | A0+ |

**Characters.** Dadaji ◎ with a brush; Gauri, Dhanu, Kim, Molly all here. **Ambient.** Moo,
bell, straw rustle, a distant tractor. **Little vs Explorer.** Little: feed Gauri, play with
Dhanu, fill Kim's bowl. Explorer: all; a daily care checklist with badges.

## 13. Storage room and gardening equipment area – `house.store`

**Mood.** Dim and interesting. One window, dust motes, tools on a wall.

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `house.store.tool_wall` | Match tools to outlines | Sorting, tool names, safety | A1+ |
| `house.store.seed_cabinet` | Open drawers | Seeds, which grows into what, planning a bed | A2+ |
| `house.store.wheelbarrow` | Push | Wheels and levers | A2+ |
| `house.store.pulley` | Pull | Simple machines | A3+ |
| `house.store.lever_plank` | Press | Levers, balance | A3+ |
| `house.store.sacks` | Weigh and label | Soil, compost, sand; mass | A2+ |
| `house.store.safety_board` | Tap | Gloves, sharp tools, adult supervision | all |
| `house.store.watering_cans` | Fill | Volume, litres | A2+ |

**Characters.** Dadaji ◎ holding a lantern; Kim finds a lost ball. **Ambient.** Creaks, a
sparrow in the rafters. **Little vs Explorer.** Little: tool matching, watering can. Explorer:
all; the room is also the tool inventory.

## 14. Shared design notes

- Each room ships as one scene pack: back, mid and front layers as SVG (or Rive scenes for the
  animated objects), an object manifest, and an ambient sound set (`22-assets.md`).
- Dadaji's teaching spot ◎ and the characters' idle spots are part of the manifest so that
  dialogue layout is consistent.
- Festivals and seasons add overlay layers (diyas on the veranda, rangoli on the steps, a
  raincoat on the hook) without changing the base scene.
