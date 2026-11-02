# 15 – Real-world assignment architecture: "Dadaji's Real World Adventures"

Follows `00-canon.md`. Related: `10-interactive-object-map.md` (objects that launch assignments),
`11-eight-sections.md` (lessons that launch them), `16-assessment.md` (practical-activity items),
`19-parent-dashboard.md` (parent unlock, photo consent), `17-database-schema.md` (tables),
`20-admin-cms.md` (authoring and safety review).

## 1. Purpose

Every relevant lesson in DADU can step out of the screen. An assignment is a short, safe, real
activity that Dadaji sets, the child does in the real world with an adult where needed, and the
parent confirms. Assignments are the mechanism that stops DADU from feeling like online tuition:
the garden lesson ends with a real seed in a real cup on a real windowsill.

Design rules, in order of priority:

1. Safety before learning. Nothing dangerous, nothing unsupervised that needs supervision.
2. Optional, never blocking. No lesson, badge path or section is locked behind an assignment.
3. Parent in the loop. The parent unlocks, the parent confirms, the parent owns any photo.
4. Effort, not perfection. Badges reward participation, curiosity and effort, never a "correct" result.
5. Cheap materials. Default to what an Indian household already has; list substitutes.

## 2. The assignment contract

Every assignment has exactly these eight parts. The CMS refuses to move an assignment past
*Draft* if any part is empty (`20-admin-cms.md`).

| # | Part | Field | Rules |
|---|---|---|---|
| 1 | Dadaji's introduction | `intro` | 1–3 sentences, in Dadaji's voice, recorded audio per language. Says why this matters and links back to the lesson. |
| 2 | Clear instructions | `steps[]` | 3–8 numbered steps, each one action, each with an illustration and audio. Little mode shows one step per screen. |
| 3 | Required materials | `materials[]` | Each with a name, quantity, an "already at home" flag and an optional substitute. |
| 4 | Estimated duration | `durationMinutes` | Active time, plus `waitDays` for activities that need days (sprouting, evaporation). |
| 5 | Safety instructions | `safety[]` | Plain-language warnings shown before step 1 and repeated at the risky step. Always present, even if "none needed beyond the usual". |
| 6 | Adult-supervision requirement | `supervision` | One of the four tiers in section 5. Shown as a coloured chip to the parent. |
| 7 | Completion confirmation | `confirmation` | How the parent confirms: tick, short note, optional photo, or a parent-asked question. |
| 8 | Learning outcome | `outcome` | One sentence a parent can read: "Gopu can name the parts of a seedling." Maps to a concept ID in `16-assessment.md`. |

Plus mandatory metadata shared with every learning item (`00-canon.md` section 6): learning
objective, age bands, section, subject, topic, difficulty, prerequisites, source provenance,
verification status, version.

## 3. Data model

Stored in `rwa_assignments` with versions in `rwa_assignment_versions`; completions in
`rwa_completions` (`17-database-schema.md`). Translations live in the shared translation tables.

```json
{
  "id": "rwa.gardening.plant_a_seed",
  "version": 3,
  "status": "published",
  "section": "nature",
  "subject": "gardening",
  "topic": "seeds_and_germination",
  "ageBands": ["A1", "A2", "A3"],
  "difficulty": "gentle",
  "prerequisites": ["nature.gardening.seeds.01"],
  "launchedBy": [
    { "type": "lesson", "id": "nature.gardening.seeds.01" },
    { "type": "object", "id": "house.garden.seed_tray" }
  ],
  "learningObjective": "Observe that a seed needs soil, water and light to sprout.",
  "intro": {
    "speaker": "dadaji",
    "text": { "en": "Beta, a seed is a tiny sleeping plant. Let us wake one up at home.", "hi": "बेटा, बीज एक छोटा सा सोया हुआ पौधा है। चलो घर पर एक को जगाते हैं।" },
    "audio": "rwa/gardening/plant_a_seed/intro.{lang}.opus"
  },
  "materials": [
    { "name": { "en": "A small cup or old yoghurt pot" }, "qty": 1, "atHome": true },
    { "name": { "en": "Soil" }, "qty": "a handful", "atHome": true, "substitute": { "en": "Cotton wool" } },
    { "name": { "en": "Moong, chana or mustard seeds" }, "qty": "3–4", "atHome": true },
    { "name": { "en": "Water" }, "qty": "a little", "atHome": true }
  ],
  "durationMinutes": 10,
  "waitDays": 4,
  "steps": [
    { "n": 1, "text": { "en": "Ask an adult to help you make a small hole in the bottom of the cup." }, "illustration": "rwa/gardening/plant_a_seed/s1.webp", "safetyRef": "sharp" },
    { "n": 2, "text": { "en": "Fill the cup with soil up to the top line." } },
    { "n": 3, "text": { "en": "Push three seeds in with your finger, as deep as your fingernail." } },
    { "n": 4, "text": { "en": "Sprinkle water until the soil is dark and damp, not soaking." } },
    { "n": 5, "text": { "en": "Put the cup near a window. Water a little every day." } },
    { "n": 6, "text": { "en": "After four days, come back and tell Dadaji what you see." } }
  ],
  "safety": [
    { "key": "sharp", "text": { "en": "Only an adult makes the hole." } },
    { "key": "general", "text": { "en": "Wash hands after touching soil. Seeds are not for eating." } }
  ],
  "supervision": "assist",
  "confirmation": { "type": "parent_tick", "optionalPhoto": true, "optionalNote": true, "parentQuestion": { "en": "Did a sprout appear? Ask your child what colour it is." } },
  "outcome": { "en": "Can describe what a seed needs to sprout and name the first two leaves.", "conceptId": "nature.gardening.germination" },
  "badges": ["curious_gardener"],
  "provenance": { "author": "admin:…", "sources": ["NCERT EVS Class 2, 'Seeds and seeds'"], "aiDrafted": false },
  "verification": { "educational": "ok", "factual": "ok", "language": { "en": "ok", "hi": "ok" }, "safety": "ok" }
}
```

Completion record:

```json
{
  "id": "uuid",
  "childId": "uuid",
  "assignmentId": "rwa.gardening.plant_a_seed",
  "assignmentVersion": 3,
  "state": "completed",
  "startedAt": "2026-11-02T10:12:00+05:30",
  "completedAt": "2026-11-06T18:40:00+05:30",
  "confirmedBy": "parent:uuid",
  "note": "Two sprouts, one yellow one green",
  "photoAssetId": null,
  "effortRating": 3,
  "offline": true
}
```

## 4. Flow in the app

```
Lesson or object ──▶ "Dadaji's Real World Adventure" card
                          │
                          ▼
                  Child taps "I want to try"
                          │
                          ▼  (first time per assignment)
                  Parental gate ──▶ parent sees materials, duration,
                                     supervision tier, safety ──▶ Unlock
                          │
                          ▼
                  Adventure screen: intro audio, steps one by one,
                  materials checklist, timer (optional), all offline
                          │
                          ▼
                  "Done? Call an adult" ──▶ parental gate ──▶ parent tick
                                             + optional note / photo
                          │
                          ▼
                  Dadaji's feedback + badge + Mitthu's Echo of the outcome
                          │
                          ▼
                  Appears in My Achievements and the parent weekly report
```

Details:

- **Discover.** Assignments appear only where they belong: at the end of the linked lesson, on the
  linked object's activity sheet, and in a dedicated *Adventures* shelf on the veranda
  (`house.veranda.adventure_board`). Never as a pop-up interrupting play.
- **Parent unlock.** The first time a child chooses an assignment, the parental gate opens the
  *Adventure briefing*: materials, duration, supervision tier, safety list. The parent can
  unlock, "unlock all `self` and `nearby` tier adventures", or decline. Declines are silent to
  the child ("Dadaji says: another day").
- **Do it offline.** The adventure screen is fully cached: audio, illustrations, steps. A wait
  timer (`waitDays`) sets a local reminder ("Day 4: check your seed") that respects quiet hours
  and the parent's notification settings.
- **Mark complete with a parent.** The child taps *Done*; the gate opens; the parent confirms.
  The parent can add a note (200 characters) and an optional photo. The parent may also mark
  "we tried but could not finish", which still earns the participation badge.
- **Effort rating.** The parent rates effort 1–3 (tried, worked hard, went further). This feeds
  badges, not scores.

### Photo and note consent rules

- Photos are **optional**, always. No assignment ever requires one and the UI never says "add a
  photo to complete".
- Photos are **private**: stored under the parent account, visible only in that parent's
  dashboard and the child's own gallery on that device. Never shown to other children, never
  used in marketing, never used to train anything.
- **Parental consent** is explicit: the first upload asks the parent to confirm a one-screen
  consent note (DPDP Act 2023, section 9), recorded with a timestamp in `consents`.
- **Never a child's face required.** The prompt says "photograph the plant, the drawing, the
  craft". The photo picker guidance discourages faces; the backend applies no face detection
  (no biometric processing), it simply never asks.
- Deletable at any time from the parent dashboard; deletion removes the object-storage file
  within 24 hours and the completion keeps only "photo removed".
- Offline uploads queue and upload only on Wi-Fi by default.

## 5. Safety policy

### Supervision tiers

| Tier | Key | Meaning | Examples | Colour chip |
|---|---|---|---|---|
| 0 | `self` | Child can do it alone at any age in the band | Draw a tree, sort toys, count spoons | `peepal` |
| 1 | `nearby` | An adult in the room, not hands-on | Fold origami, stretch routine, bird watching from the window | `marigold` |
| 2 | `assist` | An adult does the risky step | Cutting, hot water, planting with tools, kitchen tasks | `saffron` |
| 3 | `together` | Adult hands-on throughout | Floating and sinking in a bucket, any water activity, cooking on a stove, cycling outside | `clay` |

The tier is set by the author and may only be raised, never lowered, by reviewers. Age bands
A0–A1 may only receive `together` assignments. A2 may receive `nearby` or above. `self` is
available from A3.

### Forbidden

Assignments must never involve:

- Fire, matches, candles, stoves or ovens operated by the child; chemicals beyond vinegar,
  baking soda, salt, sugar, lemon and soap; sharp tools in a child's hand under A4; electricity
  beyond a sealed 1.5 V battery torch kit (A4+ with `assist`).
- Water deeper than a bucket; any swimming; bathtubs.
- Climbing, heights, roads, traffic, strangers, leaving the home or school ground alone.
- Eating or tasting anything not explicitly listed as food in the materials.
- Animals that are not the family's own pets; wild animals, insects to be handled, street dogs.
- Medicines, plants known to be toxic (listed in the CMS blocklist: oleander, datura, castor,
  dieffenbachia and others), mushrooms.
- Anything that asks the child to be photographed, filmed or to share location.
- Magnets small enough to swallow for A0–A2; balloons for A0–A1; small parts for A0–A1.

Every assignment passes a **safety review** by the educational reviewer and the fact checker
(`20-admin-cms.md`, workflow step 2 and 3), who tick a safety checklist in the CMS. An assignment
without a passed safety checklist cannot be published.

### Standard safety lines (reused)

| Key | English |
|---|---|
| `general` | Ask an adult before you start. Wash your hands afterwards. |
| `sharp` | Only an adult uses scissors, knives or anything sharp. |
| `water` | Stay with an adult the whole time near water. Dry the floor. |
| `kitchen` | The adult handles anything hot. You handle the cool, safe parts. |
| `outdoors` | Stay where your adult can see you. |
| `small_parts` | Keep small pieces away from babies and pets. |
| `no_taste` | Do not eat or taste anything in this activity unless the adult says it is food. |

## 6. Badge rules

Badges for assignments are about participation, curiosity and effort. There is no "best result"
badge. Defined in `gamification` (`17-database-schema.md`, `badges`).

| Badge | Key | Earned when |
|---|---|---|
| First Adventure | `first_adventure` | First confirmed completion of any assignment. |
| Curious Gardener / Scientist / Artist / Musician / Athlete / Helper / Naturalist | `curious_<subject>` | 3 confirmed completions in that subject. |
| Tried My Best | `tried_my_best` | Any completion marked "could not finish" by the parent. Awarded once a week at most, never withheld. |
| Went Further | `went_further` | Parent effort rating 3. |
| Patient Observer | `patient_observer` | Completing any assignment with `waitDays` ≥ 3 after returning on the reminder. |
| Weekend Explorer | `weekend_explorer` | 2 completions in a calendar week, max once per week. |
| Adventure Album | `adventure_album` | 10 completions in total, then 25, 50, 100 (tiers). |

Rules: stars (not coins) are awarded per completion (A0–A2: 3 stars, A3–A5: 5 stars), flat,
never multiplied by streaks. No countdown timers, no "expiring" adventures. Missed reminders
never cost anything.

## 7. Catalogue

Columns: ID, name, age bands, materials, active duration (plus wait), supervision tier, linked
lesson or object, learning outcome. All linked lesson IDs follow `11-eight-sections.md` numbering;
object IDs follow `10-interactive-object-map.md`.

### 7.1 Gardening (`rwa.gardening.*`, section `nature`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.gardening.plant_a_seed` | Plant a seed | A1–A3 | cup, soil, moong/chana seeds, water | 10 min + 4 days | assist | `nature.gardening.seeds.01`, `house.garden.seed_tray` | Names what a seed needs to sprout |
| `rwa.gardening.water_a_plant` | Water a plant | A0–A2 | small mug, a houseplant | 5 min | together | `house.garden.watering_can` | Knows plants drink water through soil |
| `rwa.gardening.five_leaves` | Find five leaves | A2–A4 | paper, pencil | 20 min | nearby | `nature.gardening.leaves.02`, `house.garden.neem_tree` | Describes leaf shape, edge and veins |
| `rwa.gardening.observe_a_flower` | Observe a flower | A1–A4 | a flower, magnifying glass (optional) | 10 min | nearby | `house.garden.flower_bed` | Points to petals, stem, centre |
| `rwa.gardening.grow_a_vegetable` | Grow a vegetable | A3–A5 | pot, soil, methi or coriander seeds | 15 min + 21 days | assist | `nature.gardening.vegetables.03` | Tracks growth over three weeks in a log |
| `rwa.gardening.tulsi_care` | Look after a tulsi | A2–A5 | tulsi plant | 5 min daily, 7 days | nearby | `house.garden.tulsi_plant` | Explains why leaves need light and water |
| `rwa.gardening.root_in_water` | Roots in a jar | A3–A5 | jar, water, onion or sweet potato | 10 min + 7 days | assist | `nature.gardening.roots.04` | Describes how roots grow and why |
| `rwa.gardening.compost_jar` | Mini compost jar | A4–A5 | jar with lid, peels, soil | 15 min + 14 days | assist | `house.garden.compost_pit` | Explains decomposition |
| `rwa.gardening.leaf_rubbing` | Leaf rubbing | A1–A3 | leaves, paper, crayon | 15 min | nearby | `house.garden.neem_tree` | Sees veins as the leaf's "pipes" |
| `rwa.gardening.seed_sort` | Sort kitchen seeds | A1–A3 | rajma, chana, moong, rice | 10 min | nearby | `house.kitchen.spice_box` | Sorts by size and colour; counts |

### 7.2 Science (`rwa.science.*`, section `academic` / `stem`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.science.observe_shadows` | Shadow clock | A2–A5 | sunny spot, a stick or bottle, chalk | 5 min × 3 times | nearby | `academic.science.light.02` | Shadows change with the sun's position |
| `rwa.science.float_sink` | Float or sink | A2–A5 | bucket with little water, spoon, cork, coin, leaf | 15 min | together | `house.lab.water_tray` | Predicts and tests floating |
| `rwa.science.evaporation_saucer` | The vanishing water | A3–A5 | two saucers, water, a marker | 5 min + 2 days | assist | `academic.science.matter.03` | Explains evaporation and sunlight |
| `rwa.science.paper_bridge` | Paper bridge | A3–A5 | 3 sheets of paper, two books, coins | 20 min | nearby | `stem.engineering.structures.01` | Folds increase strength |
| `rwa.science.magnet_hunt` | Magnet hunt | A3–A5 | fridge magnet (large), household objects | 15 min | assist | `house.lab.magnet` | Sorts magnetic and non-magnetic |
| `rwa.science.rainbow_in_a_glass` | Rainbow in a glass | A3–A5 | glass of water, sunlight, white paper | 10 min | nearby | `academic.science.light.04` | Light splits into colours |
| `rwa.science.balloon_static` | Sticky balloon | A3–A5 | balloon, woollen cloth, paper bits | 10 min | nearby | `academic.science.electricity.01` | Static charge attracts |
| `rwa.science.ice_melt_race` | Ice melt race | A2–A5 | 3 ice cubes, 3 plates, sun and shade | 15 min | assist | `academic.science.matter.01` | Heat melts ice; shade slows melting |
| `rwa.science.sound_string_phone` | String telephone | A3–A5 | two paper cups, string, adult to pierce | 20 min | assist | `academic.science.sound.02` | Sound travels through a tight string |
| `rwa.science.seed_to_plant_diary` | Seed diary | A4–A5 | notebook, pencil, a growing plant | 5 min daily, 10 days | self | `academic.science.plants.03` | Records and measures growth |
| `rwa.science.weather_log` | Weather log | A3–A5 | notebook | 3 min daily, 7 days | self | `academic.science.environment.02` | Reads a week of weather patterns |
| `rwa.science.moon_watch` | Moon watch | A3–A5 | window or terrace with an adult | 5 min nightly, 8 nights | nearby | `house.living_room.telescope` | Draws the changing moon shape |

### 7.3 Sports and fitness (`rwa.sports.*`, section `sports`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.sports.throw_catch` | Throw and catch | A1–A4 | soft ball | 10 min | nearby | `sports.basics.catching.01` | Catches with two hands five times |
| `rwa.sports.cricket_batting` | First batting | A3–A5 | plastic bat, soft ball, open space | 20 min | together | `town.public_garden.cricket_pitch` | Stands side-on, watches the ball |
| `rwa.sports.balance_line` | Walk the line | A1–A3 | tape or a dupatta on the floor | 10 min | nearby | `sports.balance.01` | Walks heel to toe along a line |
| `rwa.sports.simple_stretches` | Morning stretches with Dadaji | A2–A5 | mat or carpet | 8 min | nearby | `sports.yoga.stretching.01` | Does five stretches safely |
| `rwa.sports.team_game` | A team game | A3–A5 | friends or family, a ball | 20 min | nearby | `sports.teamwork.01` | Takes turns and passes |
| `rwa.sports.hop_and_count` | Hop and count | A1–A2 | floor | 5 min | together | `sports.coordination.01` | Hops on both feet while counting to ten |
| `rwa.sports.sun_salutation` | Surya namaskar, slowly | A4–A5 | mat | 10 min | nearby | `sports.yoga.surya_namaskar.01` | Performs the sequence with breathing |
| `rwa.sports.kho_kho_tag` | Kho-kho tag with family | A3–A5 | open space, 3+ people | 15 min | nearby | `sports.kho_kho.01` | Explains the rule of "kho" |
| `rwa.sports.skipping` | Skipping | A3–A5 | skipping rope | 10 min | nearby | `sports.fitness.01` | Skips ten times without stopping |
| `rwa.sports.balance_bean_bag` | Bean bag on the head | A1–A3 | a small cloth bag of rajma | 5 min | nearby | `sports.balance.02` | Walks five steps balancing |

### 7.4 Art and creativity (`rwa.art.*`, section `art`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.art.draw_a_tree` | Draw a tree | A1–A4 | paper, crayons | 15 min | self (A3+), nearby | `art.drawing.nature.01` | Draws trunk, branches, leaves |
| `rwa.art.origami_boat` | Origami boat | A2–A5 | square paper | 15 min | nearby | `house.art_room.origami_basket` | Follows a fold sequence |
| `rwa.art.paper_craft_lantern` | Paper lantern | A3–A5 | coloured paper, glue; adult cuts | 25 min | assist | `art.papercraft.02` | Measures, folds and glues |
| `rwa.art.paint_a_picture` | Paint the garden | A1–A5 | paper, watercolours or vegetable dyes | 20 min | nearby | `house.art_room.easel` | Mixes two colours to make a third |
| `rwa.art.clay_sculpture` | Clay animal | A2–A5 | atta dough or clay | 20 min | nearby | `house.art_room.clay_table` | Shapes a recognisable animal |
| `rwa.art.rangoli_dots` | Dot rangoli | A3–A5 | chalk or rice flour, a courtyard corner | 20 min | nearby | `art.rangoli.01` | Draws a symmetrical dot grid |
| `rwa.art.warli_family` | Warli family picture | A4–A5 | brown paper, white crayon | 20 min | self | `art.folk.warli.01` | Uses circles and triangles for figures |
| `rwa.art.madhubani_border` | Madhubani border | A4–A5 | paper, sketch pens | 25 min | self | `art.folk.madhubani.01` | Repeats a motif in a pattern |
| `rwa.art.vegetable_prints` | Vegetable printing | A1–A3 | bhindi or potato, paint; adult cuts | 15 min | assist | `art.printing.01` | Makes a repeating print |
| `rwa.art.diy_bird_feeder` | Bird feeder from a bottle | A4–A5 | plastic bottle, string, grains; adult cuts | 30 min | assist | `house.garden.bird_feeder` | Builds and hangs a feeder |

### 7.5 Music (`rwa.music.*`, section `music`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.music.clap_rhythm` | Clap the taal | A1–A4 | hands | 5 min | self (A3+) | `music.taal.01` | Claps a four-beat cycle |
| `rwa.music.identify_notes` | Sa Re Ga at home | A3–A5 | the app's note player, voice | 10 min | self | `house.music_room.harmonium` | Sings Sa, Re, Ga in tune |
| `rwa.music.sing_a_song` | Sing for the family | A1–A5 | voice | 5 min | nearby | `music.singing.01` | Sings a full verse from memory |
| `rwa.music.practise_instrument` | Ten minutes of practice | A4–A5 | own instrument if any | 10 min | self | `music.instrument.practice.01` | Practises a set exercise |
| `rwa.music.kitchen_band` | Kitchen band | A1–A3 | steel plates, spoons, a dabba | 10 min | nearby | `house.kitchen.utensil_rack` | Hears high and low sounds |
| `rwa.music.water_glass_scale` | Water glass scale | A3–A5 | 5 glasses, water, a spoon | 15 min | assist | `academic.science.sound.03` | More water means a lower note |
| `rwa.music.folk_dance_step` | One folk-dance step | A2–A5 | space | 10 min | nearby | `music.dance.folk.01` | Repeats a step on the beat |
| `rwa.music.story_with_voices` | Tell a story with voices | A3–A5 | a story from the Story Corner | 10 min | nearby | `town.library.story_shelf` | Uses three distinct voices |

### 7.6 Life skills (`rwa.life.*`, section `nature`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.life.arrange_books` | Arrange the bookshelf | A2–A5 | home bookshelf | 15 min | nearby | `house.study.bookshelf` | Sorts by size or colour or subject |
| `rwa.life.tidy_toys` | Tidy the toy box | A1–A3 | toys, box | 10 min | nearby | `house.playroom.toy_box` | Groups by kind and puts away |
| `rwa.life.healthy_plate` | Build a healthy plate | A2–A5 | today's meal | 10 min | nearby | `house.dining.thali` | Names food groups on the plate |
| `rwa.life.cooking_helper` | Kitchen helper | A3–A5 | adult cooking something simple | 20 min | together | `house.kitchen.measuring_cups` | Measures one cup and half a cup |
| `rwa.life.table_manners` | Table manners dinner | A2–A5 | family meal | 20 min | nearby | `house.dining.table` | Waits, shares, says thank you |
| `rwa.life.brush_two_minutes` | Two-minute brushing | A1–A4 | toothbrush, timer | 2 min, 7 days | nearby | `house.bathroom.toothbrush` | Brushes all surfaces for two minutes |
| `rwa.life.handwash_song` | Handwash song | A1–A3 | soap, water | 2 min | nearby | `house.bathroom.basin` | Washes for twenty seconds |
| `rwa.life.piggy_bank` | Piggy bank week | A3–A5 | a box, coins the parent gives | 7 days | nearby | `nature.financial.saving.01` | Counts savings and sets a small goal |
| `rwa.life.road_safety_walk` | Road safety walk | A3–A5 | a walk with an adult | 20 min | together | `nature.safety.road.01` | Stops, looks, listens at a crossing |
| `rwa.life.first_aid_box` | Find the first-aid box | A4–A5 | home first-aid box, adult | 10 min | together | `nature.safety.first_aid.01` | Names five items and what they are for |
| `rwa.life.water_saving_day` | Water-saving day | A3–A5 | household | 1 day | nearby | `nature.conservation.water.01` | Lists three ways the family saved water |
| `rwa.life.plan_my_day` | Plan my day | A4–A5 | paper | 10 min | self | `nature.time_management.01` | Writes a simple timetable with breaks |
| `rwa.life.phone_a_grandparent` | Call a grandparent | A3–A5 | parent's phone | 10 min | together | `mind.communication.01` | Asks three questions and listens |

### 7.7 Nature (`rwa.nature.*`, section `nature` / `explore`)

| ID | Name | Bands | Materials | Duration | Tier | Linked | Outcome |
|---|---|---|---|---|---|---|---|
| `rwa.nature.observe_birds` | Bird watching from the window | A2–A5 | window, paper | 15 min | nearby | `house.garden.bird_feeder` | Describes two birds by colour and size |
| `rwa.nature.identify_trees` | Three trees near home | A3–A5 | walk with an adult, notebook | 30 min | together | `town.public_garden.tree_trail` | Identifies neem, peepal or mango by leaf |
| `rwa.nature.understand_weather` | Sky diary | A2–A5 | window | 3 min daily, 5 days | self (A3+) | `academic.science.environment.02` | Names cloudy, sunny, rainy, windy |
| `rwa.nature.waste_segregation` | Two dustbins | A3–A5 | two bins or bags | 1 day | nearby | `nature.waste.segregation.01` | Sorts wet and dry waste correctly |
| `rwa.nature.water_conservation` | Bucket bath count | A3–A5 | bucket | 1 day | nearby | `nature.conservation.water.01` | Compares bucket and shower water use |
| `rwa.nature.pet_care_log` | Pet or plant care log | A2–A5 | family pet or plant | 5 min daily, 5 days | nearby | `house.cowshed.feeding_trough` | Feeds and checks water each day |
| `rwa.nature.butterfly_watch` | Butterfly watch | A2–A4 | garden or park with an adult | 15 min | nearby | `house.garden.butterfly_corner` | Describes wing colours; does not touch |
| `rwa.nature.ant_trail` | Follow an ant trail | A2–A4 | a garden corner | 10 min | nearby | `town.public_garden.insect_station` | Observes a line of ants without disturbing |
| `rwa.nature.season_basket` | Seasonal fruit basket | A2–A5 | market visit with an adult | 20 min | together | `house.kitchen.fruit_basket` | Names three fruits of the current season |
| `rwa.nature.rain_gauge` | Bottle rain gauge | A4–A5 | plastic bottle, ruler; adult cuts | 20 min + rainy days | assist | `academic.science.environment.03` | Measures rainfall in millimetres |

Total: 73 assignments at launch, across 7 subjects.

## 8. Authoring checklist (for the CMS)

Before an assignment leaves *Draft*:

- [ ] All eight contract parts filled, each step has an illustration and audio for every launch language.
- [ ] Supervision tier set; age bands consistent with the tier rules in section 5.
- [ ] No item from the forbidden list; toxic-plant blocklist checked.
- [ ] Materials marked "at home" or with a substitute; nothing costs more than a modest household item.
- [ ] Linked to at least one lesson or object that exists and is published or in review.
- [ ] Outcome maps to a concept ID in the mastery model (`16-assessment.md`).
- [ ] Badge keys exist in `gamification`.
- [ ] Photo guidance text says "photograph the result, not the child".
- [ ] Safety checklist signed by the educational reviewer and the fact checker.

## 9. Open questions for approval

1. Should the parent be able to author private family assignments ("help Dadi water the plants")? Proposed for Phase 9, parent-only, never shared.
2. Should school-ground variants exist (teacher confirms instead of parent)? Not in scope for launch.
3. Reminder defaults for `waitDays` activities: proposed 6 pm local, overridable in `19-parent-dashboard.md`.
