# 11 – The eight learning sections and curriculum outline

Follows `00-canon.md`. Related: `09-main-dashboard.md` (how the sections are reached),
`10-interactive-object-map.md` (which objects open them), `12-age-adaptive-interface.md`
(how lessons change by band), `16-assessment.md`, `15-real-world-assignments.md`,
`13-story-library.md`, `08-temple-courtyard.md`.

## 1. The shared lesson model

Every lesson in every section is the same data structure, played by one lesson engine
(`src/dadu/lessons`). Sections differ in content, not in mechanics.

### 1.1 Lesson record

| Field | Type | Notes |
|---|---|---|
| `id` | string | `<section>.<subject>.<topic>.<nn>`, e.g. `academic.math.counting.03` |
| `section` | enum | one of the eight section keys |
| `subject`, `topic` | string | from the curriculum tree below |
| `title` | localised string | per language |
| `objective` | localised string | one sentence, per age band variant |
| `ageBands` | array | subset of A0–A5 |
| `difficulty` | enum | `gentle`, `steady`, `stretch` (the base level; the adaptation engine may shift) |
| `prerequisites` | lesson ids | enforced softly: Dadaji suggests, never blocks |
| `host` | location id | where the lesson plays, e.g. `house.living_room` |
| `objects` | object ids | objects that can open this lesson |
| `durationMin` | number | planned minutes for the base band |
| `steps` | Step[] | ordered, see 1.2 |
| `assessment` | assessment set id | `16-assessment.md` |
| `assignment` | assignment id or null | `15-real-world-assignments.md` |
| `echo` | Echo or null | key clauses for Mitthu's Echo |
| `alignment` | object | `{ ncert, cbse, icse, ib, cambridge }` with grade/strand references |
| `provenance`, `verification`, `version` | | required by the canon for every content item |

### 1.2 Step types

| Step type | Who | What it does | Typical sections |
|---|---|---|---|
| `intro` | Dadaji | Spoken introduction, character staging, optional prop animation | all |
| `question` | Gopu | Gopu asks the hook question; may branch on a tap from the child | all |
| `animalBeat` | Kim / Molly / Gauri / Dhanu | A short reaction or demonstration by one animal | all |
| `explain` | Dadaji | Explanation with illustrated slides, diagrams, or a live demonstration | all |
| `example` | Dadaji | Worked example; repeatable via "more examples" | academic, stem, mind |
| `activity` | child | Interactive task: match, sort, drag, trace, count, rhythm, sing, build, experiment, observe, read, write, code, cook, care, play, map | all |
| `demo` | character | Animated demonstration (dance step, batting stance, brush stroke) | music, sports, art |
| `experiment` | Dadaji + child | Virtual lab with variables the child changes | academic (science), stem, nature |
| `excursion` | Dadaji as guide | A guided scene walk with hotspots | explore |
| `feedback` | Dadaji | Reaction to the activity result; never shaming | all |
| `assess` | Dadaji as quiz master | Hands off to the assessment engine | all |
| `echo` | Mitthu + Gopu | Mitthu repeats key clauses, Gopu repeats, the child may repeat (microphone optional, never required) | all, periodic |
| `assignmentOffer` | Dadaji | Offers the real-world assignment | where one exists |
| `outro` | Dadaji | Closes, suggests up to three next things | all |

Steps carry per-band variants for text, audio and difficulty. The engine plays the variant for
the child's effective level (`12-age-adaptive-interface.md`).

### 1.3 The canonical formula as steps

`intro → question → animalBeat → explain (→ example) → activity (×1–4) → feedback → assess
→ [echo] → [assignmentOffer] → outro`

## 2. Section 1 – Academic Learning (`academic`, colour `indigo`, motif slate and chalk)

Host locations: `house.living_room`, `house.study`, `house.lab`, `house.kitchen`,
`house.garden`, `town.library`.

### 2.1 Subjects and topics

| Subject | Topics |
|---|---|
| Languages – English | alphabet and phonics, reading, writing and handwriting, grammar, vocabulary, spelling, pronunciation, comprehension, creative writing |
| Languages – Hindi | varnamala and matras, reading, writing, vyakaran (grammar), shabd bhandar (vocabulary), uchcharan (pronunciation), comprehension, creative writing |
| Mathematics | numbers, counting, addition, subtraction, multiplication, division, fractions, decimals, geometry, measurements, time, money, mental mathematics, Vedic mathematics, logical mathematics |
| Science | physics (force, motion, magnetism, electricity, light, sound), chemistry (matter, mixtures, changes), biology (plants, animals, human body), solar system, energy, environment |
| Social studies | history, geography, civics, Indian culture, world cultures, Indian states, continents and countries, maps, famous personalities |

### 2.2 Age-band progression

| Band | Languages | Mathematics | Science | Social studies |
|---|---|---|---|---|
| A0 | Sounds, rhymes, first words spoken by Dadaji | Counting songs to 3 | Textures, animals' sounds | Family faces |
| A1 | Letter sounds, picture words, listening stories | Count to 10, big/small, shapes | Living and non-living, body parts | My home, my family |
| A2 | Phonics blends, tracing, sight words, simple sentences | Count to 100, add and subtract to 20, patterns, clock hours | Plants, animals, senses, float and sink, day and night | My town, India map, festivals |
| A3 | Reading paragraphs, grammar basics, short writing, comprehension | Place value, 3-digit operations, tables to 10, fractions as halves and quarters, money | Magnets, light and shadow, sound, water cycle, human body systems | Indian states, continents, maps, early history stories |
| A4 | Longer reading, essays, grammar, vocabulary building | Multiplication and division, fractions and decimals, geometry, measurement conversions, mental maths, Vedic tricks | Forces, electricity circuits, matter states, solar system, ecosystems | Ancient and medieval India, world geography, civics basics |
| A5 | Comprehension of literature, creative writing, formal grammar, pronunciation drills | Ratios, percentages, integers, basic algebra, data, logical reasoning | Energy, chemistry basics, cells, environment and climate | Modern Indian history, constitution, world cultures, famous personalities in depth |

### 2.3 Sample lesson: `academic.math.fractions.02` – "Sharing the roti" (A3, 12 minutes)

| Step | Content |
|---|---|
| intro | Dadaji in the kitchen with a roti on the board: "Beta, Gopu and Molly are both hungry and I have only one roti." |
| question | Gopu: "Then give it to me, Dadaji! Why share?" (the child can tap Gopu or Molly) |
| animalBeat | Molly draws a line down the middle of her notebook: "Half for Gopu, half for me. Fair!" |
| explain | Dadaji folds the roti: one whole, two halves, four quarters. The words "one half" and "1/2" appear with the fold. |
| example | Dadaji shares a mango among Kim, Dhanu and Gauri: thirds. |
| activity 1 | Drag: cut the roti into halves for two friends, quarters for four. |
| activity 2 | Match: picture of a shaded shape to 1/2, 1/4, 1/3. |
| feedback | Dadaji: "You shared it so fairly. Even Dhanu got a piece!" On a mistake: "Look, these two pieces are not the same size. Dhanu would complain. Try the fold again." |
| assess | Four items: identify halves, make quarters, compare 1/2 and 1/4, one word problem. |
| echo | Mitthu: "One whole, two halves! Four quarters, one whole!" Gopu repeats. |
| assignmentOffer | `rwa.life.share_a_roti_in_halves` |
| outro | Next: decimals with the money box, or the story of the two cats and the monkey (Panchatantra, sharing). |

### 2.4 Alignment notes

| Framework | Mapping approach |
|---|---|
| NCERT / CBSE | A2 maps to Foundational Stage (Balvatika, Classes 1–2), A3 to Classes 2–3, A4 to Classes 3–5, A5 to Classes 5–7. Each lesson cites the NCERT textbook chapter it supports (for example Math-Magic Class 3, "Fun with Give and Take"). |
| ICSE | Same bands, with ICSE's heavier language and composition emphasis reflected in extra writing activities at A3–A5. |
| IB PYP | Lessons tagged with the PYP transdisciplinary theme (for example "How the world works") and the approaches-to-learning skill they practise. |
| Cambridge Primary | Lessons tagged with the Cambridge Primary stage (1–6) and strand (for example Number, Measure, Geometry). |

Alignment tags are metadata for parents and the CMS; the child never sees a board name.

## 3. Section 2 – STEM and Technology (`stem`, colour `monsoon`, motif gear and spark)

Host locations: `house.lab`, `house.playroom` (coding robot toy), `house.veranda` (doorbell,
rain gauge), `house.garden` (fountain, weather vane).

### 3.1 Subjects and topics

Computer fundamentals, computer hardware, operating systems, internet literacy, digital safety,
keyboard and mouse, block coding, ScratchJr-style coding (original blocks), Scratch-style coding,
Python introduction, robotics, AI fundamentals, electronics, engineering, 3D modelling,
algorithms, game development.

### 3.2 Age-band progression

| Band | What they get |
|---|---|
| A0–A1 | Not offered. The lab is visible; Dadaji says the lab is for later and invites the child to the garden. |
| A2 | Cause and effect toys, the coding robot toy with three picture blocks (go, turn, stop), "what is a computer" with the lab computer, safe-screen habits. |
| A3 | Block coding with sequences and loops, keyboard and mouse, parts of a computer, simple circuits with a bulb, paper bridges, internet safety rules with Kim as the "stranger alert" dog. |
| A4 | Block coding with events and variables, a first game, robot kit with sensors, electronics with switches and LEDs, algorithms as recipes, AI as pattern-finding (sorting pictures with Molly), 3D shapes to a model. |
| A5 | Python introduction (print, variables, loops, if), game development project, robotics with a line-follower simulation, AI fundamentals (training and bias in child-safe terms), engineering challenges, operating systems and files, 3D modelling project. |

### 3.3 Virtual laboratories

| Lab | Object | What the child can change |
|---|---|---|
| Circuit lab | `house.lab.circuit_board` | battery, switch, bulb, buzzer, wires; see current flow |
| Robot lab | `house.lab.robot_kit` | sensors, motors, a block program; run on a mat |
| Code lab | `house.lab.computer` | an original block language (DADU Blocks) and a sandboxed Python runner on device |
| Bridge lab | `house.lab.paper_bridge_bench` | span, folds, load; see when it sags |
| Weather lab | `house.veranda.rain_gauge`, `house.garden.weather_vane` | collect, chart, predict |

### 3.4 Sample lesson: `stem.coding.loops.01` – "Kim runs around the garden" (A3, 10 minutes)

Dadaji: "Kim wants to run around the pond four times." Gopu: "Just say run, run, run, run!"
Kim runs once and sits. Dadaji introduces the repeat block. Activity: build `repeat 4 { run
forward, turn left }`. Feedback. Assessment: predict where Kim ends up for three programs. Echo:
"Repeat means do it again! Four times round, then sit down!"

Alignment: CBSE Computer Science (Classes 3–5), ICSE Computer Studies, Cambridge ICT Starters,
IB PYP "How we express ourselves" (technology strand).

## 4. Section 3 – Music and Performing Arts (`music`, colour `rose`, motif tabla and ghungroo)

Host locations: `house.music_room`, `house.living_room` (radio), `house.bedroom` (lullabies),
`town.temple` (bhajans), `town.public_garden` (community stage).

### 4.1 Subjects and topics

Hindustani music, Carnatic music, swar and taal, singing, tabla, harmonium, sitar, flute, veena,
mridangam, guitar, piano, keyboard, violin, drums, Kathak, Bharatanatyam, Odissi, Kuchipudi,
Manipuri, Mohiniyattam, folk dances, theatre, acting, storytelling, public speaking.

### 4.2 Age-band progression

| Band | What they get |
|---|---|
| A0 | Lullabies, clapping songs, instrument sounds on tap |
| A1 | Rhymes in home language, tap the drum to the beat, animal dances with Dhanu |
| A2 | Sa re ga ma with the harmonium, simple taal clapping (teen taal as "1-2-3-4"), first dance steps, singing along with Gopu |
| A3 | Notes on the piano, tabla bols (dha, dhin, na), a folk dance from the child's state, acting a story with the puppet theatre, speaking in front of the family |
| A4 | Raga introduction (Bhairav, Yaman as morning and evening colours), Carnatic swaras with the veena, chords on guitar, Kathak chakkars and Bharatanatyam adavus, a short play |
| A5 | Composition (a four-bar melody), rhythm notation, comparing Hindustani and Carnatic, an instrument practice plan, theatre direction, public speaking with structure |

### 4.3 Sample lesson: `music.taal.teentaal.01` – "Clap with Dhanu" (A2, 8 minutes)

Dadaji on the music-room floor with the tabla. Gopu: "Why does the tabla have two drums?"
Dhanu hops in time, Gauri's bell rings on the first beat. Dadaji explains sam (the first beat)
with a clap. Activity: tap the drum on the glowing beat (16 beats, the pattern repeats). Feedback.
Assessment: audio recognition of the first beat in three short clips. Echo: "Dha dhin dhin dha!"

Alignment: CBSE Arts Education, NCERT Arts curriculum for the Foundational and Preparatory
stages; IB PYP arts strand; Cambridge Primary Music.

## 5. Section 4 – Art and Creativity (`art`, colour `plum`, motif brush and rangoli)

Host locations: `house.art_room`, `house.veranda` (rangoli), `house.garden` (drawing from nature).

### 5.1 Subjects and topics

Drawing, painting, sketching, digital art, cartoon drawing, origami, paper crafts, clay modelling,
pottery, rangoli, Madhubani, Warli, Gond, Pattachitra, mandala, DIY projects, creative writing,
animation.

### 5.2 Age-band progression

| Band | What they get |
|---|---|
| A0 | Finger-paint on screen with big colour blobs, Dadaji names the colours |
| A1 | Colour mixing, scribble-to-shape, stickers to make a scene, clay balls |
| A2 | Tracing shapes, Warli stick figures, simple origami (boat, dog), rangoli dots to join, paper crafts |
| A3 | Drawing a tree, a house, an animal step by step; Madhubani borders; mandala symmetry; cartoon faces; a DIY project |
| A4 | Sketching with shading, Gond patterns, Pattachitra motifs, digital art on the tablet, stop-motion animation with three frames, creative-writing illustration |
| A5 | Perspective, portrait basics, a Pattachitra scroll project, a short animation, a comic strip, a creative-writing and art portfolio |

Every creation is saved to the personal gallery (`house.art_room.gallery_wall`), stored on device
and optionally synced with parental consent.

### 5.3 Sample lesson: `art.warli.first_figures.01` – "The dancing circle" (A2, 9 minutes)

Dadaji shows a Warli wall. Gopu: "They are just triangles!" Molly: "Two triangles make a person."
Dadaji draws one. Activity: drag triangles to make three dancers; trace a circle to join them.
Feedback. Assessment: which picture is Warli (three choices). Assignment: `rwa.art.draw_a_tree`.

## 6. Section 5 – Sports and Fitness (`sports`, colour `clay`, motif cricket bat and ball)

Host locations: `town.public_garden`, `house.store` (bicycle, cricket kit), `house.garden`.

### 6.1 Subjects and topics

Cricket, football, badminton, basketball, volleyball, tennis, squash, table tennis, hockey,
athletics, swimming, cycling, kabaddi, kho-kho, mallakhamb, yoga, stretching, balance,
coordination, flexibility, basic fitness.

### 6.2 Age-band progression

| Band | What they get |
|---|---|
| A0 | Movement songs; Kim shows "up, down, clap" |
| A1 | Animal walks, balance on a line, throwing a soft ball with Kim, simple yoga shapes (tree, cat, cow with Gauri) |
| A2 | Catching, kicking, running races with Kim, surya namaskar in four steps, cycling safety |
| A3 | Cricket batting and bowling basics, football dribbling, badminton serve, kho-kho rules, yoga sequence, warm-up and cool-down |
| A4 | Team tactics, basketball dribbling and passing, volleyball, athletics events, kabaddi strategy, swimming safety and strokes explained, mallakhamb basics |
| A5 | Fitness planning, hockey, tennis and squash basics, table tennis, flexibility routines, sports science (heart rate, hydration), leadership on the field |

Every sports lesson is an animated demonstration followed by a real-world practice assignment,
because sport is learned off the screen. The screen-time module (`19-parent-dashboard.md`)
counts a completed sports assignment as "active time".

### 6.3 Sample lesson: `sports.cricket.batting_stance.01` – "Stand like a wall" (A3, 7 minutes)

Dadaji with the cricket kit at the pitch. Gopu swings wildly and misses. Kim fetches the ball.
Dadaji demonstrates the stance (feet, knees, grip, eyes) in four frames. Activity: order the four
frames; tap the correct grip. Assessment: three image-recognition items. Assignment:
`rwa.sports.learn_basic_batting` with an adult.

## 7. Section 6 – Nature and Life Skills (`nature`, colour `peepal`, motif sapling in hands)

Host locations: `house.garden`, `house.cowshed`, `house.kitchen`, `house.bathroom`,
`house.dining`, `house.bedroom`, `house.store`, `town.public_garden`.

### 7.1 Subjects and topics

Gardening, plant identification, animal care, bird identification, environment, water
conservation, waste management, recycling, composting, cooking, nutrition, hygiene, dental care,
road safety, first-aid awareness, financial literacy, saving money, household responsibilities,
communication, time management, sustainable living.

### 7.2 Age-band progression

| Band | What they get |
|---|---|
| A0 | Animal sounds with Gauri and Kim, water play, washing hands song |
| A1 | Watering the tulsi, naming garden friends, brushing teeth with the two-minute song, tidy-up game |
| A2 | Planting a seed and watching it grow (persistent), food groups, hand-washing steps, waste into two bins, road crossing with Kim |
| A3 | Parts of a plant, composting, bird spotting log, balanced thali, first-aid box contents, saving in a gullak, morning routine, table manners |
| A4 | Photosynthesis, water cycle and conservation audit at home, recycling categories, cooking a simple dish with an adult, budgeting pocket money, time blocks for the week |
| A5 | Sustainable living project, animal welfare, nutrition labels, first-aid scenarios (awareness only), household budgeting, communication and negotiation, a week-long garden experiment |

The private garden's growth is persistent and connected to completed activities
(`06-garden-designs.md`): a planted seed grows a stage each time the child completes a nature
lesson or a watering assignment, never by waiting alone.

### 7.3 Sample lesson: `nature.gardening.plant_a_seed.01` – "Dhanu's bean" (A2, 10 minutes)

Dadaji at the seed tray. Gopu: "Can I plant a toffee and grow a toffee tree?" Dhanu knocks over the
seed jar. Gauri explains, slowly, what a seed needs. Dadaji plants a bean: soil, seed, water,
sunlight. Activity: drag the four things in order; tap to water. Feedback. Assessment: picture
sequence of germination. Assignment: `rwa.gardening.plant_a_seed`. Echo: "Soil, seed, water,
sun!"

## 8. Section 7 – Cognitive and Social Skills (`mind`, colour `saffron`, motif puzzle piece and heart)

Host locations: `house.playroom`, `house.study` (chess, crosswords), `house.living_room`
(carrom, circle time), `house.veranda` (calm breathing), `town.public_garden` (community stage).

### 8.1 Subjects and topics

Memory, concentration, logic, pattern recognition, spatial awareness, critical thinking,
decision-making, problem-solving, chess, sudoku, crosswords, mazes, jigsaw puzzles, riddles,
teamwork, cooperation, empathy, emotional intelligence, patience, conflict resolution,
communication, leadership.

### 8.2 Age-band progression

| Band | What they get |
|---|---|
| A0 | Peek-a-boo memory, stacking, faces and feelings |
| A1 | Two-piece puzzles, matching pairs, feelings mirror (happy, sad, angry), taking turns with Dhanu |
| A2 | Patterns with beads, simple mazes, six-piece jigsaws, "how does Gopu feel?" stories, sharing |
| A3 | Memory grids, sudoku 4×4, riddles, chess pieces and moves, empathy stories with the puppet theatre, saying sorry and making up |
| A4 | Logic grids, sudoku 6×6, crosswords, chess openings, planning a team task, conflict resolution scripts, concentration timers with the swing |
| A5 | Critical thinking (fact or opinion), decision trees, chess tactics, leadership scenarios, debate basics, emotional vocabulary, patience projects |

### 8.3 Sample lesson: `mind.empathy.kims_ball.01` – "Whose ball is it?" (A2, 8 minutes)

Dadaji at the puppet theatre. Gopu grabs Kim's ball; Kim's ears droop. Gopu: "But I wanted it!"
Molly: "Look at Kim's face." Dadaji explains feelings on faces, then asking and sharing. Activity:
match faces to feelings; choose what Gopu should say (three options, all read aloud). Feedback
never calls a choice "wrong"; Dadaji asks how Kim would feel. Assessment: two picture scenarios.
Assignment: `rwa.mind.act_out_a_kind_choice`.

## 9. Section 8 – Knowledge and Exploration (`explore`, colour `marigold`, motif telescope and globe)

Host locations: `town.excursions`, `house.living_room` (telescope, globe), `house.bedroom`
(night sky), `town.library`, `town.temple` (festivals and monuments).

### 9.1 Subjects and topics

Astronomy, space, planets, stars, galaxies, dinosaurs, wildlife, oceans, marine life, human
civilisation, ancient India, world history, Indian history, geography, archaeology, inventions,
scientists, mathematicians, explorers, artists, musicians, athletes, world cultures, Indian
festivals, monuments, general knowledge.

### 9.2 Virtual excursions (Dadaji is always the guide)

| Excursion | Portal | Scenes | Bands |
|---|---|---|---|
| Night sky and space | `town.excursions.rocket_pad` | the Moon, the planets in order, the Sun's size, a galaxy | A2–A5 |
| Dinosaur valley | `town.excursions.dinosaur_valley` | herbivores and carnivores, fossils, Indian dinosaur finds (Rajasaurus) | A1–A5 |
| Forest | `town.excursions.forest_path` | tiger reserve, elephants, hornbill, the food chain | A1–A5 |
| Mountains | `town.excursions.mountain_trail` | the Himalayas, Mitthu's home, glaciers and rivers | A2–A5 |
| Ocean | `town.excursions.ocean_pier` | coral, turtles, whales, the Indian Ocean | A2–A5 |
| Museum | `town.excursions.museum_gate` | inventions hall, scientists' gallery, art wing | A3–A5 |
| Monuments | `town.excursions.monument_arch` | Qutub Minar, Hampi, Konark, Taj Mahal, Sanchi, Meenakshi temple | A3–A5 |
| Archaeological site | `town.excursions.dig_site` | Harappa and Mohenjo-daro, how archaeologists work | A4–A5 |
| World cultures bazaar | `town.excursions.world_cultures_bazaar` | one country per visit: food, greeting, festival, map | A2–A5 |

### 9.3 Age-band progression

| Band | What they get |
|---|---|
| A0–A1 | Animal and dinosaur picture walks with sounds, the Moon at bedtime |
| A2 | Planets as a family, forest friends, India on the globe, a festival each month |
| A3 | Solar system facts, Indian monuments, famous scientists as stories, continents and oceans, inventions (wheel, zero, telescope) |
| A4 | Galaxies and stars, ancient India (Indus Valley, Mauryas), world history highlights, archaeology, mathematicians (Aryabhata, Ramanujan) |
| A5 | Space missions (Chandrayaan, Mangalyaan), modern Indian history, explorers, climate and oceans, general-knowledge challenges, artists and athletes in depth |

### 9.4 Sample lesson: `explore.astronomy.solar_system.02` – "The Sun's family" (A4, 12 minutes)

Dadaji at the telescope. Gopu: "Is the Sun a planet?" Molly counts eight planets on her notebook.
Dadaji walks the rocket-pad excursion with the planets in order, sizes compared to a marble and a
football. Activity: order the planets; sort rocky and gas giants. Assessment: five items with one
reasoning question. Echo: "Mercury, Venus, Earth, Mars! Then the giants, big as stars!" (Dadaji
corrects Mitthu gently: "Not quite stars, Mitthu," which is itself a teaching beat.)

## 10. Companion areas

| Area | Where it lives | Document |
|---|---|---|
| Stories – Dadaji's Story Corner | `house.study.story_shelf`, `house.living_room.bookshelf`, `house.bedroom.bed`, `town.library` | `13-story-library.md` |
| Tests and Challenges | `house.living_room` with Dadaji as quiz master | `16-assessment.md` |
| My Achievements | `house.playroom.trophy_shelf` | `19-parent-dashboard.md` (gamification section) and `17-database-schema.md` |
| Parent Dashboard | behind the gate | `19-parent-dashboard.md` |

## 11. Lesson ID scheme examples

| ID | Meaning |
|---|---|
| `academic.english.phonics.04` | fourth phonics lesson |
| `academic.hindi.matras.02` | second matra lesson |
| `academic.math.vedic.nikhilam.01` | first Vedic maths lesson on the Nikhilam method |
| `academic.science.light.shadows.01` | shadows |
| `academic.social.states.rajasthan.01` | Rajasthan |
| `stem.python.first_program.01` | Python |
| `music.kathak.chakkar.01` | Kathak |
| `art.madhubani.border.01` | Madhubani |
| `sports.yoga.surya_namaskar.01` | yoga |
| `nature.hygiene.handwash.01` | hygiene |
| `mind.chess.pieces.01` | chess |
| `explore.history.indus_valley.01` | ancient India |

## 12. Content volume for launch

| Section | Lessons at launch (all bands) | Priority bands |
|---|---|---|
| academic | 320 | A2–A4 |
| stem | 60 | A3–A5 |
| music | 80 | A1–A4 |
| art | 80 | A1–A4 |
| sports | 60 | A2–A4 |
| nature | 120 | A1–A4 |
| mind | 90 | A1–A4 |
| explore | 90 | A2–A5 |
| Total | 900 | |

The roadmap (`21-roadmap.md`) delivers Academic first (Phase 4), then the other seven (Phase 5).
Every lesson passes the eight-step workflow in `20-admin-cms.md` before publishing.
