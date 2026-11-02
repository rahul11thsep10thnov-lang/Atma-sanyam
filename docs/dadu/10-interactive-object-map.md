# 10 – Interaction Engine and the interactive object map

Follows `00-canon.md`. Related: `05-room-designs.md`, `06-garden-designs.md`, `07-public-library.md`,
`08-temple-courtyard.md` (where the objects live), `11-eight-sections.md` (the lessons they open),
`15-real-world-assignments.md` (what they extend into), `16-assessment.md` (their assessments),
`17-database-schema.md` (`interactive_objects` and `object_lessons` tables).

## 1. Purpose

The Miniverse is an interactive learning engine, not a map of pretty rooms. Every location, room,
object and character has a functional purpose. The Interaction Engine is the one reusable module
(`src/dadu/interaction`) that turns a tap on any object into a complete, tracked learning
experience, so that the telescope, the tulsi plant, the piano and the temple bell all behave the
same way under the hood while feeling completely different to the child.

## 2. The interactive object contract

Every interactive object must provide all nine capabilities below. An object missing any one of
them fails CMS validation and cannot be published (`20-admin-cms.md`).

| # | Capability | What it means | Where it is defined |
|---|---|---|---|
| 1 | Tap / click | A hit area in the room scene, at least 48 pt (72 pt in Little mode), with a glow or bob when the child is near. | `hitArea`, `highlight` |
| 2 | Animation | A short Rive/Lottie animation for `idle`, `highlight`, `activate`, `complete` (for example the telescope swivels to the window). | `animation` |
| 3 | Character reaction | Which character reacts first and with which reaction line category (`02-character-bible.md`). Dadaji always speaks second if another character speaks first. | `reactions` |
| 4 | Audio explanation | Dadaji's spoken introduction to the object, per language, per age band (`14-voice-audio.md`). | `intro` |
| 5 | Educational activity | The lesson or activity the object opens, by lesson ID per age band. The activity must be *about the object* (see section 7). | `activities` |
| 6 | Learning objective | A single sentence per age band, stored on the lesson and surfaced to parents. | via `lesson.objective` |
| 7 | Age-appropriate difficulty | Variants per age band, or an explicit "not available" with Dadaji's gentle redirect for bands outside the range. | `activities[band]` |
| 8 | Completion tracking | Progress events (`object.viewed`, `object.activity_started`, `object.activity_completed`) and the per-profile completion state. | `tracking` |
| 9 | Associated assessment | The assessment set that follows the activity, by ID, with the pass rule (`16-assessment.md`). | `assessment` |

Optional: `assignment` (a real-world assignment the object can extend into), `unlockRule`
(hidden until a condition), `seasonal` (visible only in a season or festival window), `rewards`.

## 3. Object definition schema (JSON)

```json
{
  "$schema": "dadu/interactive-object/1",
  "id": "house.living_room.telescope",
  "location": "house.living_room",
  "name": { "en": "Dadaji's telescope", "hi": "दादाजी की दूरबीन" },
  "section": "explore",
  "subject": "astronomy",
  "topic": "solar_system",
  "ageBands": ["A2", "A3", "A4", "A5"],
  "hitArea": { "shape": "polygon", "points": [[612,180],[690,160],[720,330],[640,350]], "minSize": 48 },
  "highlight": { "style": "glow", "colour": "marigold", "bob": true },
  "animation": {
    "asset": "objects/living_room/telescope.riv",
    "states": { "idle": "Idle", "highlight": "Glow", "activate": "SwivelToWindow", "complete": "Sparkle" }
  },
  "reactions": {
    "first": { "character": "molly", "category": "curiosity", "line": "react.telescope.molly.01" },
    "dadaji": { "category": "introduce", "line": "react.telescope.dadaji.01" }
  },
  "intro": {
    "A2": "audio.intro.telescope.A2",
    "A3": "audio.intro.telescope.A3",
    "A4": "audio.intro.telescope.A4",
    "A5": "audio.intro.telescope.A5"
  },
  "activities": {
    "A2": "explore.astronomy.day_and_night.01",
    "A3": "explore.astronomy.moon_phases.01",
    "A4": "explore.astronomy.solar_system.02",
    "A5": "explore.astronomy.how_telescopes_work.01"
  },
  "assessment": {
    "A2": "qs.explore.astronomy.day_and_night.01",
    "A3": "qs.explore.astronomy.moon_phases.01",
    "A4": "qs.explore.astronomy.solar_system.02",
    "A5": "qs.explore.astronomy.how_telescopes_work.01"
  },
  "assignment": "rwa.nature.observe_the_moon_for_a_week",
  "tracking": { "events": ["viewed", "activity_started", "activity_completed", "assessment_passed"] },
  "unlockRule": null,
  "seasonal": null,
  "rewards": { "stars": 3, "coins": 10, "badge": "sky_watcher" },
  "version": 4,
  "status": "published"
}
```

Validation rules enforced by the CMS and by a unit test on every content pack:

- `id` is `<location>.<slug>` and `location` matches the prefix.
- Every band in `ageBands` has an `activities`, `intro` and `assessment` entry.
- The `section` of the object equals the `section` of every lesson it opens.
- `hitArea.minSize` is at least 48; the room's Little-mode layout scales it to 72.
- Audio IDs exist in every published language of the pack, or the object is marked
  `partialLanguages` and hidden in languages that lack audio.

## 4. Lifecycle state machine

```
             child enters room
                    │
                    ▼
   ┌──────────── idle ───────────┐   object animates its idle loop; glows softly
   │                             │   if the daily plan recommends it
   │  child approaches / hovers  │
   ▼                             │
highlighted ──────────────────────┤   bob + name spoken on hover (Little mode)
   │ tap                         │
   ▼                             │
introduced ───────────────────────┤   first reaction (animal), then Dadaji's intro audio,
   │ "Let's try!"  │ "Not now"   │   activate animation plays; two buttons
   ▼               └────────────►┘
activity ─────────────────────────┐   lesson engine runs the lesson for the child's band
   │ steps complete   │ "Stop"    │   (progress saved on every step)
   ▼                  └──────────►│   returns to idle with a bookmark
feedback ─────────────────────────┤   Dadaji's warm feedback, Gopu's comment
   │
   ▼
assessment ───────────────────────┤   short assessment; fail → gentle re-explanation and retry
   │ pass                         │   (never more than two retries in a row before Dadaji
   ▼                              │   suggests a break or a simpler lesson)
completed ────────────────────────┤   complete animation, rewards, assignment offered
   │ later                        │
   ▼                              │
revisit ──────────────────────────┘   next variant, Mitthu's Echo, or free play with the object
```

Transitions emit tracking events. `activity` is resumable across app restarts. The same object can
be `completed` for one band and `idle` for another; the state is per profile, per object, per
activity variant.

## 5. Rules that keep objects meaningful

1. **Context rule.** The activity an object opens must be about that object or what it
   represents. The piano opens notes and rhythm, never a geography quiz. The CMS rejects a
   lesson whose `subject` is not in the object's allowed subject list.
2. **No catalogue rule.** An object never opens a list of unrelated lessons. If it has more than
   one activity for a band, Dadaji offers them as a spoken choice in character ("Shall we count
   the planets, or find the moon?").
3. **One voice rule.** Dadaji introduces every object. Another character may react first, but the
   explanation is Dadaji's.
4. **Age rule.** An object outside the child's band is still tappable: Dadaji says something kind
   and redirects ("That is for when you are a little bigger, beta. Come, Dhanu wants to show you
   the marbles."). Nothing is silently dead.
5. **Return rule.** After completion the child is back in the same room, same camera, with the
   object now showing its `complete` state.
6. **Real-world rule.** Where an assignment exists, it is offered once at completion and then
   lives in Real World Adventures; it is never nagged.

## 6. The location-to-learning mapping table

This is the seed of the `interactive_objects` table. Activity types: **tap-reveal** (A0–A1),
**match**, **sort**, **drag**, **trace**, **count**, **listen**, **sing**, **rhythm**, **build**,
**experiment**, **observe**, **read**, **write**, **quiz**, **project**, **play** (physical
game demonstrated), **map**, **code**, **cook**, **care**.

Sections: `academic`, `stem`, `music`, `art`, `sports`, `nature`, `mind`, `explore`, plus the
companion areas `stories` and `culture` (temple courtyard, under `explore` for reporting).

### 6.1 Veranda (`house.veranda`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.veranda.swing` | mind | Emotional regulation / calm breathing | A0–A5 | listen, play | `rwa.life.breathe_and_swing` |
| `house.veranda.mitthu_perch` | academic | Revision (Mitthu's Echo) | A1–A5 | listen | none |
| `house.veranda.rangoli_floor` | art | Rangoli / symmetry | A1–A5 | drag, trace | `rwa.art.make_a_rangoli` |
| `house.veranda.rain_gauge` | stem | Measurement / weather | A3–A5 | observe, count | `rwa.nature.measure_rain` |
| `house.veranda.shoe_rack` | nature | Hygiene / household responsibility | A1–A3 | sort | `rwa.life.arrange_shoes` |
| `house.veranda.doorbell` | stem | Electricity / circuits | A3–A5 | experiment | none |
| `house.veranda.tulsi_pot` | nature | Medicinal plants | A1–A5 | care, observe | `rwa.gardening.water_a_plant` |
| `house.veranda.letterbox` | academic | Writing / letters and addresses | A3–A5 | write | `rwa.life.write_a_letter` |

### 6.2 Living room (`house.living_room`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.living_room.telescope` | explore | Astronomy / solar system | A2–A5 | observe, quiz | `rwa.nature.observe_the_moon_for_a_week` |
| `house.living_room.globe` | academic | Geography / continents and countries | A2–A5 | map | `rwa.explore.find_india_on_a_map` |
| `house.living_room.bookshelf` | stories | Story Corner | A0–A5 | read, listen | `rwa.life.read_with_family` |
| `house.living_room.wall_clock` | academic | Mathematics / time | A2–A5 | drag, quiz | `rwa.life.read_the_clock_at_dinner` |
| `house.living_room.radio` | music | Listening / Indian music forms | A1–A5 | listen | none |
| `house.living_room.carrom_board` | mind | Strategy / angles and turn-taking | A3–A5 | play | `rwa.sports.play_carrom_with_family` |
| `house.living_room.family_photos` | academic | Social studies / family tree, history | A2–A5 | match, write | `rwa.explore.ask_a_grandparent_story` |
| `house.living_room.ceiling_fan` | stem | Physics / electricity and motion | A3–A5 | experiment | none |
| `house.living_room.calendar` | academic | Mathematics / days, months, festivals | A2–A5 | drag, count | `rwa.life.mark_a_birthday` |
| `house.living_room.money_box` | nature | Financial literacy / saving | A3–A5 | count, quiz | `rwa.life.save_in_a_gullak` |
| `house.living_room.floor_cushions` | mind | Teamwork / circle time | A1–A3 | listen, play | none |
| `house.living_room.window_sparrow` | nature | Bird identification | A1–A5 | observe | `rwa.nature.observe_birds` |

### 6.3 Study room and private library (`house.study`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.study.writing_desk` | academic | Writing / handwriting and creative writing | A2–A5 | trace, write | `rwa.academic.write_a_story` |
| `house.study.alphabet_chart` | academic | English and Hindi / letters, phonics | A1–A3 | tap-reveal, match | none |
| `house.study.dictionary` | academic | Vocabulary / spelling | A3–A5 | quiz | `rwa.academic.find_five_new_words` |
| `house.study.abacus` | academic | Mathematics / place value, Vedic maths | A2–A5 | count, drag | none |
| `house.study.map_of_india` | academic | Indian states / geography | A2–A5 | map, quiz | `rwa.explore.name_your_state_neighbours` |
| `house.study.story_shelf` | stories | Story Corner / collections | A0–A5 | read, listen | none |
| `house.study.grammar_box` | academic | Grammar / sentences | A3–A5 | sort, drag | none |
| `house.study.reading_lamp` | academic | Reading / comprehension | A2–A5 | read, quiz | `rwa.life.read_with_family` |
| `house.study.biography_frames` | explore | Famous personalities | A3–A5 | read, quiz | `rwa.explore.scientist_poster` |
| `house.study.chess_set` | mind | Chess | A3–A5 | play | `rwa.mind.play_chess_with_family` |
| `house.study.crossword_notebook` | mind | Crosswords and riddles | A3–A5 | write | none |
| `house.study.old_letters` | academic | History / sources and evidence | A4–A5 | read, quiz | none |

### 6.4 Science laboratory (`house.lab`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.lab.magnet_tray` | academic | Physics / magnetism | A2–A5 | experiment | `rwa.science.explore_magnets_safely` |
| `house.lab.water_basin` | academic | Physics / floating and sinking | A1–A5 | sort, experiment | `rwa.science.float_or_sink` |
| `house.lab.microscope` | academic | Biology / cells and tiny things | A3–A5 | observe | `rwa.nature.look_at_a_leaf_closely` |
| `house.lab.skeleton_model` | academic | Human body / bones | A2–A5 | drag, quiz | `rwa.sports.feel_your_bones_stretch` |
| `house.lab.prism_lamp` | academic | Light / colours and rainbows | A2–A5 | experiment | `rwa.science.make_a_rainbow_with_water` |
| `house.lab.tuning_fork` | academic | Sound / vibration | A2–A5 | listen, experiment | `rwa.science.feel_sound_on_a_drum` |
| `house.lab.circuit_board` | stem | Electronics / simple circuits | A3–A5 | build | none |
| `house.lab.robot_kit` | stem | Robotics / sensors | A4–A5 | build, code | none |
| `house.lab.computer` | stem | Computer fundamentals, internet safety, coding | A2–A5 | code, quiz | `rwa.stem.keyboard_practice` |
| `house.lab.thermometer` | academic | Matter / heat and temperature | A3–A5 | observe, experiment | `rwa.science.observe_evaporation` |
| `house.lab.balance_scale` | academic | Measurement / mass | A2–A5 | drag, count | `rwa.science.weigh_kitchen_things` |
| `house.lab.plant_in_jar` | academic | Biology / plants, photosynthesis | A2–A5 | observe | `rwa.gardening.plant_a_seed` |
| `house.lab.periodic_poster` | academic | Chemistry / elements | A4–A5 | quiz | none |
| `house.lab.paper_bridge_bench` | stem | Engineering / structures | A3–A5 | build | `rwa.science.build_a_paper_bridge` |
| `house.lab.three_d_printer` | stem | 3D modelling | A4–A5 | build | none |

### 6.5 Music room (`house.music_room`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.music_room.piano` | music | Notes and rhythm | A1–A5 | listen, rhythm | `rwa.music.practise_a_rhythm` |
| `house.music_room.tabla` | music | Taal / rhythm cycles | A2–A5 | rhythm | `rwa.music.clap_a_taal` |
| `house.music_room.harmonium` | music | Swar / Hindustani notes | A2–A5 | sing | `rwa.music.sing_sa_re_ga` |
| `house.music_room.sitar` | music | Hindustani instruments | A3–A5 | listen | none |
| `house.music_room.flute` | music | Breath and melody | A2–A5 | listen, sing | `rwa.music.practise_an_instrument` |
| `house.music_room.veena` | music | Carnatic music | A3–A5 | listen | none |
| `house.music_room.mridangam` | music | Carnatic rhythm | A3–A5 | rhythm | none |
| `house.music_room.guitar` | music | Western chords | A3–A5 | listen, rhythm | none |
| `house.music_room.violin` | music | Strings | A3–A5 | listen | none |
| `house.music_room.drum_kit` | music | Beat and tempo | A1–A5 | rhythm | none |
| `house.music_room.ghungroo` | music | Kathak and classical dance | A2–A5 | listen, play | `rwa.music.learn_a_dance_step` |
| `house.music_room.dance_mirror` | music | Bharatanatyam, Odissi, Kuchipudi, Manipuri, Mohiniyattam, folk | A2–A5 | play | `rwa.music.learn_a_dance_step` |
| `house.music_room.stage_curtain` | music | Theatre, acting, public speaking | A3–A5 | listen, play | `rwa.music.perform_for_family` |
| `house.music_room.song_book` | music | Singing / rhymes | A0–A3 | sing | `rwa.music.sing_a_song` |

### 6.6 Art and creativity room (`house.art_room`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.art_room.easel` | art | Drawing and painting | A1–A5 | trace, project | `rwa.art.draw_a_tree` |
| `house.art_room.crayon_box` | art | Colours / mixing | A0–A3 | tap-reveal, drag | `rwa.art.paint_a_picture` |
| `house.art_room.origami_table` | art | Origami | A2–A5 | build | `rwa.art.create_an_origami_figure` |
| `house.art_room.clay_jar` | art | Clay modelling and pottery | A1–A5 | build | `rwa.art.make_a_simple_sculpture` |
| `house.art_room.madhubani_panel` | art | Madhubani | A3–A5 | trace, project | none |
| `house.art_room.warli_wall` | art | Warli | A2–A5 | drag, trace | none |
| `house.art_room.gond_frame` | art | Gond | A3–A5 | trace | none |
| `house.art_room.pattachitra_scroll` | art | Pattachitra | A4–A5 | project | none |
| `house.art_room.mandala_wheel` | art | Mandala / symmetry | A2–A5 | drag | none |
| `house.art_room.craft_drawer` | art | Paper crafts and DIY | A1–A5 | build | `rwa.art.make_a_paper_craft` |
| `house.art_room.tablet_stand` | art | Digital art and animation | A3–A5 | project | none |
| `house.art_room.cartoon_corner` | art | Cartoon drawing | A3–A5 | trace, project | none |
| `house.art_room.gallery_wall` | art | Personal gallery | A1–A5 | project | none |

### 6.7 Kitchen (`house.kitchen`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.kitchen.measuring_cups` | academic | Measurement / volume | A2–A5 | drag, count | `rwa.life.measure_rice_for_dinner` |
| `house.kitchen.spice_box` | nature | Nutrition / Indian spices and senses | A1–A5 | match | `rwa.life.identify_spices` |
| `house.kitchen.vegetable_basket` | nature | Food groups and nutrition | A1–A5 | sort | `rwa.life.identify_healthy_foods` |
| `house.kitchen.stove` | nature | Cooking safety / changes of state | A3–A5 | cook, quiz | `rwa.life.assist_cooking_with_adult` |
| `house.kitchen.fridge` | academic | Science / cold, preservation | A2–A5 | sort | none |
| `house.kitchen.roti_board` | academic | Fractions / halves and quarters | A2–A5 | drag | `rwa.life.share_a_roti_in_halves` |
| `house.kitchen.water_filter` | nature | Water conservation | A2–A5 | quiz | `rwa.nature.water_conservation_check` |
| `house.kitchen.dustbins` | nature | Waste segregation | A1–A5 | sort | `rwa.nature.waste_segregation_at_home` |
| `house.kitchen.recipe_book` | academic | Reading / instructions and sequencing | A3–A5 | read, drag | `rwa.life.assist_cooking_with_adult` |
| `house.kitchen.kitchen_scale` | academic | Measurement / mass | A3–A5 | count | none |

### 6.8 Dining room (`house.dining`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.dining.thali` | nature | Balanced meal | A1–A5 | drag, sort | `rwa.life.plan_a_balanced_thali` |
| `house.dining.table_setting` | nature | Table manners | A2–A5 | drag | `rwa.life.learn_table_manners` |
| `house.dining.water_jug` | academic | Capacity / litres | A3–A5 | count | none |
| `house.dining.festival_sweets` | explore | Indian festivals | A1–A5 | match, listen | `rwa.explore.festival_at_home` |
| `house.dining.mealtime_talk` | mind | Communication / listening and gratitude | A2–A5 | listen | `rwa.life.say_thank_you_for_a_meal` |
| `house.dining.serving_counter` | academic | Division / sharing equally | A3–A5 | count, drag | none |

### 6.9 Bedroom (`house.bedroom`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.bedroom.bed` | stories | Bedtime stories | A0–A5 | listen | none |
| `house.bedroom.alarm_clock` | nature | Time management / routines | A2–A5 | drag | `rwa.life.make_a_morning_routine` |
| `house.bedroom.wardrobe` | nature | Dressing, weather-appropriate clothes | A1–A4 | sort | `rwa.life.fold_your_clothes` |
| `house.bedroom.night_sky_window` | explore | Stars and constellations | A2–A5 | observe | `rwa.nature.observe_the_moon_for_a_week` |
| `house.bedroom.toy_shelf` | nature | Household responsibility / tidying | A1–A3 | sort | `rwa.life.help_organise_toys` |
| `house.bedroom.diary` | academic | Creative writing / feelings | A3–A5 | write | `rwa.mind.write_three_good_things` |
| `house.bedroom.lullaby_box` | music | Lullabies and rhymes | A0–A2 | listen, sing | none |

### 6.10 Indoor playroom (`house.playroom`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.playroom.building_blocks` | mind | Spatial awareness | A0–A4 | build | `rwa.mind.build_a_tower` |
| `house.playroom.jigsaw_table` | mind | Jigsaw puzzles | A1–A5 | drag | none |
| `house.playroom.memory_cards` | mind | Memory | A1–A5 | match | none |
| `house.playroom.maze_mat` | mind | Mazes / planning | A2–A5 | drag | none |
| `house.playroom.sudoku_board` | mind | Sudoku and logic | A3–A5 | quiz | none |
| `house.playroom.pattern_beads` | mind | Pattern recognition | A1–A4 | drag | `rwa.mind.make_a_bead_pattern` |
| `house.playroom.puppet_theatre` | mind | Empathy, emotions, conflict resolution | A1–A5 | listen, play | `rwa.mind.act_out_a_kind_choice` |
| `house.playroom.trophy_shelf` | achievements | My Achievements | A1–A5 | tap-reveal | none |
| `house.playroom.board_games` | mind | Turn-taking, decision-making, leadership | A2–A5 | play | `rwa.mind.play_a_board_game_as_a_family` |
| `house.playroom.coding_robot_toy` | stem | Block coding / algorithms | A2–A5 | code | none |
| `house.playroom.feelings_mirror` | mind | Emotional intelligence | A1–A5 | match | none |

### 6.11 Bathroom (`house.bathroom`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.bathroom.wash_basin` | nature | Hand washing | A0–A4 | tap-reveal, drag | `rwa.life.wash_hands_six_steps` |
| `house.bathroom.toothbrush` | nature | Dental care | A1–A4 | rhythm, drag | `rwa.life.brush_for_two_minutes` |
| `house.bathroom.bucket_and_mug` | nature | Water conservation | A2–A5 | count | `rwa.nature.water_conservation_check` |
| `house.bathroom.mirror` | nature | Hygiene and grooming | A1–A4 | match | none |
| `house.bathroom.first_aid_box` | nature | First-aid awareness | A3–A5 | sort, quiz | `rwa.life.find_the_first_aid_box` |
| `house.bathroom.laundry_basket` | nature | Household responsibility | A2–A4 | sort | `rwa.life.fold_your_clothes` |

### 6.12 Cow shed and pet-care area (`house.cowshed`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.cowshed.gauri` | nature | Animal care / cows and milk | A0–A5 | care, listen | `rwa.nature.observe_an_animal_kindly` |
| `house.cowshed.dhanu` | nature | Young animals / growth | A0–A3 | care, play | none |
| `house.cowshed.fodder_trough` | nature | Animal nutrition | A2–A5 | sort | none |
| `house.cowshed.milk_pail` | academic | Measurement / litres, nutrition | A2–A5 | count | none |
| `house.cowshed.kim_kennel` | nature | Dog care and safety around animals | A1–A5 | care, quiz | `rwa.nature.observe_an_animal_kindly` |
| `house.cowshed.molly_hutch` | nature | Rabbit care / herbivores | A1–A5 | care | none |
| `house.cowshed.dung_cakes_and_biogas` | stem | Energy / biogas and compost | A4–A5 | experiment | none |
| `house.cowshed.vet_kit` | nature | Animal health | A3–A5 | sort | none |
| `house.cowshed.bell_and_rope` | music | Rhythm with natural sounds | A0–A2 | rhythm | none |

### 6.13 Storage room and gardening equipment (`house.store`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.store.tool_rack` | nature | Gardening tools and safety | A2–A5 | match | `rwa.gardening.plant_a_seed` |
| `house.store.seed_jars` | nature | Seeds and germination | A1–A5 | sort | `rwa.gardening.plant_a_seed` |
| `house.store.watering_can` | nature | Plant care | A0–A3 | care | `rwa.gardening.water_a_plant` |
| `house.store.sack_of_grain` | academic | Weight and counting | A2–A4 | count | none |
| `house.store.old_trunk` | explore | Family history, inventions | A3–A5 | read | none |
| `house.store.bicycle` | sports | Cycling and road safety | A2–A5 | quiz, play | `rwa.sports.practise_balancing` |
| `house.store.cricket_kit` | sports | Cricket basics | A2–A5 | play | `rwa.sports.learn_basic_batting` |
| `house.store.compost_bin_bag` | nature | Composting | A2–A5 | sort | `rwa.nature.start_a_compost_jar` |

### 6.14 Private family garden (`house.garden`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `house.garden.flower_bed` | nature | Flower identification, parts of a flower | A1–A5 | match, observe | `rwa.gardening.observe_a_flower` |
| `house.garden.mango_tree` | nature | Fruit trees, seasons | A1–A5 | observe, count | `rwa.gardening.identify_five_leaves` |
| `house.garden.vegetable_patch` | nature | Growing vegetables | A2–A5 | care, project | `rwa.gardening.grow_a_vegetable` |
| `house.garden.tulsi_plant` | nature | Medicinal plants | A1–A5 | care | `rwa.gardening.water_a_plant` |
| `house.garden.neem_tree` | nature | Medicinal trees | A2–A5 | observe | none |
| `house.garden.creeper_trellis` | academic | Biology / climbing plants | A3–A5 | observe | none |
| `house.garden.butterfly_corner` | nature | Insects, life cycles | A1–A5 | observe, drag | `rwa.nature.watch_a_butterfly` |
| `house.garden.bird_feeder` | nature | Bird identification | A1–A5 | observe, match | `rwa.nature.observe_birds` |
| `house.garden.fountain` | stem | Water pressure | A3–A5 | experiment | none |
| `house.garden.pond` | nature | Pond life, frogs, fish | A1–A5 | observe | none |
| `house.garden.compost_pit` | nature | Composting and decomposition | A2–A5 | sort, observe | `rwa.nature.start_a_compost_jar` |
| `house.garden.sundial` | academic | Time, shadows | A2–A5 | observe | `rwa.science.observe_shadows` |
| `house.garden.rain_barrel` | nature | Rainwater harvesting | A3–A5 | quiz | `rwa.nature.water_conservation_check` |
| `house.garden.photosynthesis_leaf` | academic | Photosynthesis | A2–A5 | drag, quiz | none |
| `house.garden.season_wheel` | nature | Seasons and crops | A1–A5 | drag | none |
| `house.garden.seed_tray` | nature | Planting seeds | A1–A5 | care | `rwa.gardening.plant_a_seed` |
| `house.garden.harvest_basket` | nature | Harvesting, counting produce | A1–A5 | count | none |
| `house.garden.garden_path_stones` | academic | Counting, number line | A0–A2 | count | none |
| `house.garden.weather_vane` | stem | Wind and weather | A2–A5 | observe | `rwa.nature.understand_weather` |
| `house.garden.shelter_plots` | nature | Future animal shelters (goat, hen, horse, duck pond, bee, rescue) | A2–A5 | observe | none (reserved) |

### 6.15 Public garden (`town.public_garden`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `town.public_garden.swings` | sports | Balance, pendulums | A0–A4 | play | `rwa.sports.practise_balancing` |
| `town.public_garden.slide` | sports | Gravity, friction, safety | A0–A4 | play | none |
| `town.public_garden.cricket_pitch` | sports | Cricket | A2–A5 | play | `rwa.sports.learn_basic_batting` |
| `town.public_garden.football_ground` | sports | Football | A2–A5 | play | `rwa.sports.play_a_team_game` |
| `town.public_garden.badminton_court` | sports | Badminton | A3–A5 | play | none |
| `town.public_garden.basketball_hoop` | sports | Basketball | A3–A5 | play | `rwa.sports.practise_throwing_and_catching` |
| `town.public_garden.kabaddi_circle` | sports | Kabaddi, kho-kho | A3–A5 | play | `rwa.sports.play_a_team_game` |
| `town.public_garden.mallakhamb_pole` | sports | Mallakhamb, flexibility | A4–A5 | play | `rwa.sports.perform_simple_stretches` |
| `town.public_garden.yoga_lawn` | sports | Yoga and stretching | A1–A5 | play | `rwa.sports.perform_simple_stretches` |
| `town.public_garden.walking_track` | sports | Athletics, fitness | A2–A5 | play, count | none |
| `town.public_garden.swimming_pool` | sports | Swimming (safety first) | A3–A5 | quiz | none |
| `town.public_garden.table_tennis` | sports | Table tennis, tennis, squash | A3–A5 | play | none |
| `town.public_garden.hockey_field` | sports | Hockey, volleyball | A3–A5 | play | none |
| `town.public_garden.butterfly_garden` | nature | Pollination | A1–A5 | observe | `rwa.nature.watch_a_butterfly` |
| `town.public_garden.tree_trail` | nature | Tree identification | A2–A5 | match | `rwa.nature.identify_trees` |
| `town.public_garden.science_station_shadows` | academic | Shadows and sun | A2–A5 | experiment | `rwa.science.observe_shadows` |
| `town.public_garden.science_station_sound` | academic | Sound in the open | A2–A5 | experiment | none |
| `town.public_garden.community_stage` | mind | Teamwork, leadership, public speaking | A3–A5 | play | `rwa.music.perform_for_family` |
| `town.public_garden.cleanup_corner` | nature | Waste management, civic sense | A2–A5 | sort | `rwa.nature.waste_segregation_at_home` |
| `town.public_garden.road_crossing` | nature | Road safety | A1–A5 | drag, quiz | `rwa.life.cross_the_road_safely` |

### 6.16 Public library (`town.library`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `town.library.picture_book_corner` | stories | Picture books | A0–A2 | listen | `rwa.life.read_with_family` |
| `town.library.story_shelf` | stories | Indian traditional stories | A1–A5 | read, listen | none |
| `town.library.indian_literature` | stories | Indian literary stories | A3–A5 | read | none |
| `town.library.world_literature` | stories | World literature | A3–A5 | read | none |
| `town.library.science_shelf` | explore | Science reference | A3–A5 | read, quiz | none |
| `town.library.history_shelf` | explore | Indian and world history | A3–A5 | read | none |
| `town.library.geography_atlas` | academic | Maps and atlases | A2–A5 | map | none |
| `town.library.poetry_nook` | academic | Poetry, recitation | A2–A5 | listen, sing | `rwa.academic.recite_a_poem` |
| `town.library.biography_shelf` | explore | Scientists, mathematicians, explorers, artists, athletes | A3–A5 | read | `rwa.explore.scientist_poster` |
| `town.library.audiobook_booth` | stories | Audiobooks | A1–A5 | listen | none |
| `town.library.regional_shelf` | academic | Regional-language books | A2–A5 | read | none |
| `town.library.catalogue_desk` | academic | Alphabetical order, classification | A3–A5 | sort | `rwa.life.arrange_books` |
| `town.library.quiet_sign` | mind | Patience, respect for shared spaces | A1–A4 | listen | none |

### 6.17 Temple and cultural courtyard (`town.temple`), optional, parent toggle

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `town.temple.courtyard_bell` | culture | Sound, tradition | A1–A5 | listen | none |
| `town.temple.ganesha_shrine` | culture | Stories, festivals (Ganesh Chaturthi) | A2–A5 | listen, read | `rwa.explore.festival_at_home` |
| `town.temple.shiva_parvati_shrine` | culture | Stories, Mahashivratri | A2–A5 | listen | none |
| `town.temple.balaji_lakshmi_shrine` | culture | Stories, Tirupati architecture | A3–A5 | read | none |
| `town.temple.murugan_shrine` | culture | Tamil traditions, Thaipusam | A3–A5 | read | none |
| `town.temple.rama_sita_shrine` | culture | Ramayana stories, Diwali | A2–A5 | listen | none |
| `town.temple.hanuman_shrine` | culture | Stories, courage and devotion | A2–A5 | listen | none |
| `town.temple.radha_krishna_shrine` | culture | Stories, Janmashtami, bhajans | A2–A5 | listen, sing | none |
| `town.temple.sai_nath_shrine` | culture | Shirdi, service to all | A3–A5 | read | none |
| `town.temple.durga_shrine` | culture | Navratri, Durga Puja | A2–A5 | listen | none |
| `town.temple.regional_gallery` | culture | State and union-territory traditions | A3–A5 | map, read | none |
| `town.temple.shared_heritage_wing` | culture | Indigenous, Buddhist, Sikh, Jain, Christian, Islamic heritage | A3–A5 | read | none |
| `town.temple.architecture_model` | explore | Temple architecture, geometry | A3–A5 | observe, quiz | none |
| `town.temple.festival_calendar` | explore | Indian festivals through the year | A1–A5 | drag | `rwa.explore.festival_at_home` |
| `town.temple.bhajan_corner` | music | Bhajans, devotional music | A2–A5 | listen, sing | none |

### 6.18 Excursion portals (`town.excursions`)

| Object ID | Section | Subject / topic | Bands | Activity | Real-world assignment |
|---|---|---|---|---|---|
| `town.excursions.museum_gate` | explore | Museums, archaeology, inventions | A3–A5 | observe, quiz | `rwa.explore.visit_a_local_museum` |
| `town.excursions.forest_path` | explore | Wildlife, forests | A1–A5 | observe | `rwa.nature.identify_trees` |
| `town.excursions.mountain_trail` | explore | Himalayas, mountains, Mitthu's home | A2–A5 | observe | none |
| `town.excursions.ocean_pier` | explore | Oceans and marine life | A2–A5 | observe | none |
| `town.excursions.monument_arch` | explore | Indian monuments | A3–A5 | observe, quiz | `rwa.explore.monument_near_you` |
| `town.excursions.dig_site` | explore | Archaeology, ancient India | A4–A5 | observe | none |
| `town.excursions.rocket_pad` | explore | Space, galaxies | A2–A5 | observe, quiz | none |
| `town.excursions.dinosaur_valley` | explore | Dinosaurs | A1–A5 | observe, match | none |
| `town.excursions.world_cultures_bazaar` | explore | World cultures, countries | A2–A5 | map | none |

Total: 208 objects across 18 locations. The CMS seeds these as `draft` records; each becomes
`published` only after its lessons, audio and assessments pass the workflow in `20-admin-cms.md`.

## 7. Engine architecture (mobile)

```
src/dadu/interaction/
├── registry.ts        loads object definitions from the content pack, indexed by location
├── hitTest.ts         converts scene taps into object ids (polygons, Little-mode scaling)
├── machine.ts         the lifecycle state machine (per profile, per object)
├── reactions.ts       picks reaction lines by category, avoids repeating the last three
├── bridge.ts          hands off to lessons, assessment, assignments, gamification, audio
└── tracking.ts        emits events to analytics and progress stores
```

The engine is content-agnostic: a new object needs a definition record and its assets, never new
code. Rooms are data too (`05-room-designs.md` defines their layers and object positions).
