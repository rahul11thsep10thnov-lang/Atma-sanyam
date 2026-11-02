# DADU – Content coverage matrix

Generated from the content registries on 2026-11-02 by `catalog.coverage()` (src/dadu/content/catalog.ts).
Every number here is computed from the code, not estimated. Re-run the snippet in
`src/dadu/__tests__/content.test.ts` after adding content.

## 1. Totals

| Item | Count | Floor | Status |
|---|---|---|---|
| Lessons (both levels, en + hi) | 52 | 40 | met |
| Stories (en + hi) | 12 | 12 | met |
| Real-world assignments (en + hi) | 51 | 40 | met |
| Interactive objects | 167 | 120 | met |
| Objects with a full lesson | 79 | all | gap: 88 objects open with Dadaji's preview line only |
| Planned lesson ids referenced by objects but not yet authored | 54 | 0 | gap (list in section 7) |

Every lesson has both a Little-mode and an Explorer-mode script that follows the eight-phase
teaching formula (validated by `catalog.validate()`), a simpler, an advanced and an example
variant, a concept id for the mastery model, and a host object in a real location.

## 2. Sections × age bands (lesson counts; a lesson counts for every band it serves)

| Section | Lessons | A0 | A1 | A2 | A3 | A4 | A5 | Objects | Assignments |
|---|---|---|---|---|---|---|---|---|---|
| academic | 8 | 0 | 3 | 7 | 8 | 5 | 2 | 24 | 3 |
| stem | 6 | 0 | 0 | 4 | 6 | 6 | 3 | 15 | 9 |
| music | 6 | 0 | 2 | 6 | 6 | 6 | 2 | 9 | 4 |
| art | 6 | 0 | 4 | 6 | 6 | 5 | 2 | 7 | 5 |
| sports | 6 | 0 | 4 | 5 | 6 | 4 | 4 | 14 | 5 |
| nature | 8 | 0 | 5 | 8 | 8 | 6 | 4 | 62 | 20 |
| mind | 6 | 0 | 4 | 5 | 6 | 5 | 3 | 8 | 2 |
| explore | 6 | 0 | 2 | 5 | 6 | 6 | 6 | 28 | 3 |

A0 (0–2, Lap mode) has no lessons by design: Lap mode is pictures, sounds and songs without
assessment. The Lap-mode media set is not authored yet (gap).

## 3. Languages

| Language | Lessons | Stories | Assignments |
|---|---|---|---|
| en | 52 | 12 | 51 |
| hi | 52 | 12 | 51 |
| bn | 0 | 0 | 0 |
| as | 0 | 0 | 0 |
| or | 0 | 0 | 0 |
| mr | 0 | 0 | 0 |
| gu | 0 | 0 | 0 |
| pa | 0 | 0 | 0 |
| ta | 0 | 0 | 0 |
| te | 0 | 0 | 0 |
| kn | 0 | 0 | 0 |
| ml | 0 | 0 | 0 |
| ur | 0 | 0 | 0 |
| sa | 0 | 0 | 0 |

Only English and Hindi are authored. The other twelve launch languages have language codes,
fonts and fallback rules in `src/dadu/i18n` but no content; the CMS translation workflow
(docs/dadu/20-admin-cms.md) produces them. Nothing in the app claims a language is ready
when it is not: `i18n.coverage()` reports 0 for them.

## 4. Locations × objects

| Location | Objects | With lesson | Planned only |
|---|---|---|---|
| villa.exterior | 4 | 1 | 0 |
| villa.veranda | 6 | 3 | 1 |
| villa.living | 9 | 6 | 2 |
| villa.kitchen | 6 | 2 | 3 |
| villa.dining | 4 | 1 | 2 |
| villa.bedroom_dadaji | 4 | 2 | 0 |
| villa.bedroom_chintu | 5 | 1 | 2 |
| villa.study | 6 | 4 | 2 |
| villa.activity | 14 | 13 | 0 |
| villa.bathroom | 3 | 1 | 2 |
| villa.terrace | 6 | 2 | 4 |
| villa.driveway | 5 | 3 | 2 |
| garden.flowers | 5 | 1 | 3 |
| garden.vegetables | 5 | 3 | 1 |
| garden.fruit | 4 | 1 | 2 |
| garden.butterfly | 3 | 0 | 3 |
| garden.greenhouse | 3 | 0 | 2 |
| garden.pond | 3 | 0 | 3 |
| garden.fountain | 2 | 1 | 1 |
| garden.workshop | 3 | 0 | 3 |
| garden.compost | 2 | 1 | 1 |
| animalia.dog | 5 | 4 | 0 |
| animalia.rabbit | 4 | 2 | 1 |
| animalia.cowshed | 6 | 3 | 2 |
| animalia.calf | 3 | 2 | 1 |
| animalia.wild | 3 | 0 | 2 |
| town.public_garden | 8 | 4 | 4 |
| town.library | 6 | 2 | 3 |
| town.temple | 7 | 3 | 4 |
| town.bazaar | 5 | 3 | 2 |
| town.festival_ground | 5 | 4 | 1 |
| excursion.space | 3 | 3 | 0 |
| excursion.museum | 2 | 1 | 1 |
| excursion.forest | 2 | 0 | 2 |
| excursion.ocean | 2 | 0 | 2 |
| excursion.mountains | 2 | 0 | 2 |
| excursion.monument | 2 | 2 | 0 |

## 5. Activity kinds used by authored lessons

| Activity kind | Uses |
|---|---|
| sort | 37 |
| sequence | 22 |
| count | 6 |
| choose | 5 |
| tap-target | 5 |
| rhythm | 5 |
| play-notes | 3 |
| circuit | 2 |
| code-blocks | 2 |
| pattern | 2 |
| mix-colours | 2 |
| draw | 2 |
| balance | 2 |
| memory | 2 |
| maze | 2 |
| trace | 1 |
| water | 1 |
| plant | 1 |
| groom | 1 |
| cook | 1 |

Every kind listed in `core/content.ts` has an evaluator in `engines/activities.ts` with unit
tests; kinds not yet used by a lesson (feed, groom, harvest, clean, cook, plant appear through
world objects rather than lesson steps where not listed) are exercised by the Animalia and
Garden screens directly.

## 6. Stories

| Collection | Rights | Stories authored |
|---|---|---|
| Panchatantra | traditional | 4 |
| Jataka Tales | traditional | 2 |
| Hitopadesha | traditional | 1 |
| Akbar and Birbal | traditional | 2 |
| Tenali Raman | traditional | 2 |
| Vikram and Betaal | traditional | 0 |
| Gopal Bhar | traditional | 0 |
| Mullah Nasruddin | traditional | 0 |
| Kathasaritsagara | traditional | 0 |
| Tagore's stories | public-domain | 0 |
| Sukumar Ray's stories | public-domain | 0 |
| The Jungle Book | public-domain | 0 |
| Malgudi Days | pending | 0 |
| Ruskin Bond's stories | pending | 0 |
| Satyajit Ray's stories | pending | 0 |
| Grandma's Bag of Stories | pending | 0 |
| DADU originals | original | 1 |

| Story | Collection | Pages | Bands |
|---|---|---|---|
| story.panchatantra.monkey_and_crocodile | panchatantra | 4 | A1 A2 A3 A4 |
| story.panchatantra.blue_jackal | panchatantra | 3 | A1 A2 A3 |
| story.panchatantra.lion_and_rabbit | panchatantra | 3 | A1 A2 A3 A4 |
| story.panchatantra.four_friends | panchatantra | 3 | A1 A2 A3 |
| story.jataka.monkey_king | jataka | 3 | A2 A3 A4 |
| story.jataka.banyan_deer | jataka | 3 | A2 A3 A4 |
| story.akbar_birbal.well | akbar_birbal | 3 | A2 A3 A4 A5 |
| story.akbar_birbal.line | akbar_birbal | 2 | A2 A3 A4 |
| story.tenali.cat | tenali | 3 | A2 A3 A4 |
| story.tenali.thieves | tenali | 3 | A2 A3 A4 |
| story.hitopadesha.old_tiger | hitopadesha | 3 | A3 A4 A5 |
| story.original.mitthu_first_echo | original | 3 | A1 A2 A3 |

Licensed collections (Malgudi Days, Ruskin Bond, Satyajit Ray, Grandma's Bag of Stories) are
registered with rights `pending` and carry no pages; the validator rejects any page added to
them until the rights status changes.

## 7. Planned lessons (object has a preview line, full lesson not yet authored)

| Object | Planned lesson id |
|---|---|
| villa.veranda.shoe_rack | academic.maths.counting.02 |
| villa.living.bookshelf | academic.english.reading.01 |
| villa.living.tv_wall | stem.computers.pixels.01 |
| villa.kitchen.fridge | nature.nutrition.foodgroups.01 |
| villa.kitchen.spice_box | explore.culture.spices.01 |
| villa.kitchen.sink | nature.environment.water.01 |
| villa.dining.dining_table | nature.lifeskills.tablesetting.01 |
| villa.dining.thali | nature.nutrition.thali.01 |
| villa.bedroom_chintu.toy_box | nature.lifeskills.tidy.01 |
| villa.bedroom_chintu.star_lamp | explore.astronomy.stars.01 |
| villa.study.abacus | academic.maths.place_value.01 |
| villa.study.map_india | academic.social.states.01 |
| villa.bathroom.toothbrush | nature.hygiene.teeth.01 |
| villa.bathroom.bucket | nature.environment.water.01 |
| villa.terrace.kite | stem.physics.wind.01 |
| villa.terrace.water_tank | nature.environment.water.01 |
| villa.terrace.solar_panel | stem.energy.solar.01 |
| villa.terrace.night_sky | explore.astronomy.stars.01 |
| villa.driveway.football | sports.football.passing.01 |
| villa.driveway.gate | nature.safety.road.01 |
| garden.flowers.flower_bed | nature.gardening.flowers.01 |
| garden.flowers.bee_box | nature.biology.pollination.01 |
| garden.flowers.bird_feeder | nature.birds.identify.01 |
| garden.vegetables.scale | academic.maths.measurement.01 |
| garden.fruit.guava_tree | nature.biology.plant_parts.01 |
| garden.fruit.ladder | nature.safety.home.01 |
| garden.butterfly.butterfly_bush | nature.biology.lifecycle.01 |
| garden.butterfly.caterpillar_leaf | nature.biology.lifecycle.01 |
| garden.butterfly.magnifier | stem.biology.insects.01 |
| garden.greenhouse.seed_trays | nature.gardening.seeds.01 |
| garden.greenhouse.thermometer | stem.physics.heat.01 |
| garden.pond.pond | nature.biology.frog.01 |
| garden.pond.lotus | explore.india.symbols.01 |
| garden.pond.fish | nature.biology.fish.01 |
| garden.fountain.fountain | stem.physics.gravity.01 |
| garden.workshop.tool_rack | nature.gardening.tools.01 |
| garden.workshop.seed_jars | academic.maths.sorting.01 |
| garden.workshop.workbench | stem.engineering.bridge.01 |
| garden.compost.compost_bin | nature.environment.compost.01 |
| animalia.rabbit.rabbit_hutch | nature.animalcare.cleaning.01 |
| animalia.cowshed.milk_pail | nature.nutrition.dairy.01 |
| animalia.cowshed.dung_cakes | nature.environment.compost.01 |
| animalia.calf.salt_lick | nature.nutrition.minerals.01 |
| animalia.wild.binoculars | nature.birds.identify.01 |
| animalia.wild.footprint_board | explore.wildlife.tracks.01 |
| town.public_garden.slide | stem.physics.gravity.01 |
| town.public_garden.tree_trail | nature.trees.identify.01 |
| town.public_garden.badminton_net | sports.badminton.serve.01 |
| town.public_garden.walking_track | academic.maths.measurement.01 |
| town.library.regional_shelf | academic.languages.scripts.01 |
| town.library.reference_shelf | explore.research.facts.01 |
| town.library.librarian_desk | nature.lifeskills.responsibility.01 |
| town.temple.shikhara | explore.history.architecture.01 |
| town.temple.regional_gallery | temple.regional.traditions.01 |
| town.temple.heritage_wing | temple.heritage.shared.01 |
| town.temple.banyan | nature.trees.identify.01 |
| town.bazaar.cloth_stall | explore.culture.clothing.01 |
| town.bazaar.sweet_shop | explore.culture.food.01 |
| town.festival_ground.folk_instruments | music.instruments.folk.01 |
| excursion.museum.harappa_seal | explore.history.harappa.01 |
| excursion.forest.tiger_track | explore.wildlife.tracks.01 |
| excursion.forest.sal_tree | nature.environment.forests.01 |
| excursion.ocean.coral | explore.ocean.life.01 |
| excursion.ocean.turtle | explore.ocean.life.01 |
| excursion.mountains.snow_peak | explore.geography.himalaya.01 |
| excursion.mountains.glacier | explore.geography.himalaya.01 |

## 8. Assignments

| Assignment | Section | Bands | Tier | Minutes | Linked lesson |
|---|---|---|---|---|---|
| rwa.gardening.plant_a_seed | nature | A1 A2 A3 A4 A5 | assist | 15 | nature.gardening.vegetables.01 |
| rwa.gardening.water_a_week | nature | A1 A2 A3 A4 A5 | nearby | 5 | nature.gardening.plants.01 |
| rwa.gardening.five_leaves | nature | A2 A3 A4 A5 | nearby | 20 |  |
| rwa.gardening.compost_jar | nature | A3 A4 A5 | assist | 15 |  |
| rwa.gardening.harvest_herb | nature | A2 A3 A4 | assist | 10 |  |
| rwa.science.fridge_magnet | stem | A2 A3 A4 | nearby | 10 | stem.physics.magnet.01 |
| rwa.science.shadow_tracing | stem | A2 A3 A4 A5 | nearby | 20 | stem.physics.shadows.01 |
| rwa.science.float_sink | stem | A1 A2 A3 | together | 15 |  |
| rwa.science.evaporation_cup | stem | A3 A4 A5 | nearby | 5 |  |
| rwa.science.paper_bridge | stem | A3 A4 A5 | self | 20 |  |
| rwa.science.torch_parts | stem | A3 A4 A5 | assist | 10 | stem.electronics.circuit.01 |
| rwa.science.glass_vs_cup | stem | A2 A3 A4 | nearby | 5 | stem.physics.sound.01 |
| rwa.science.robot_game | stem | A2 A3 A4 | nearby | 15 | stem.coding.blocks.01 |
| rwa.nature.feed_birds | nature | A1 A2 A3 A4 A5 | nearby | 10 | nature.animalcare.feeding.01 |
| rwa.nature.moon_shape | explore | A1 A2 A3 A4 A5 | together | 10 | explore.astronomy.telescope.01 |
| rwa.nature.find_india | academic | A2 A3 A4 A5 | self | 5 | academic.social.geography.01 |
| rwa.nature.sort_bins | nature | A2 A3 A4 A5 | nearby | 10 | nature.environment.waste.01 |
| rwa.nature.tree_id | nature | A2 A3 A4 A5 | nearby | 20 |  |
| rwa.nature.weather_week | nature | A2 A3 A4 A5 | self | 3 |  |
| rwa.nature.water_saver | nature | A2 A3 A4 A5 | self | 5 |  |
| rwa.nature.festival_food | explore | A2 A3 A4 A5 | self | 10 | explore.culture.festivals.01 |
| rwa.sports.walk_the_line | sports | A1 A2 A3 A4 | nearby | 5 | sports.physical.balance.01 |
| rwa.sports.catch_ten | sports | A1 A2 A3 A4 | nearby | 10 | sports.physical.throw.01 |
| rwa.sports.morning_stretch | sports | A1 A2 A3 A4 A5 | nearby | 5 | sports.yoga.tadasana.01 |
| rwa.sports.team_game | sports | A2 A3 A4 A5 | nearby | 30 |  |
| rwa.sports.cycle_balance | sports | A3 A4 A5 | together | 20 |  |
| rwa.art.draw_tree | art | A1 A2 A3 A4 A5 | self | 15 | art.drawing.tree.01 |
| rwa.art.origami_boat | art | A2 A3 A4 | self | 10 | art.craft.origami.01 |
| rwa.art.door_rangoli | art | A1 A2 A3 A4 | nearby | 15 | art.pattern.rangoli.01 |
| rwa.art.paint_mix | art | A1 A2 A3 | nearby | 15 | art.painting.colours.01 |
| rwa.art.clay_diya | art | A1 A2 A3 A4 | nearby | 20 | art.craft.clay.01 |
| rwa.music.sing_saptak | music | A1 A2 A3 A4 | self | 5 | music.hindustani.swaras.01 |
| rwa.music.clap_rhythm | music | A1 A2 A3 | self | 5 | music.taal.teentaal.01 |
| rwa.music.tatkar | music | A2 A3 A4 A5 | nearby | 5 | music.dance.kathak.01 |
| rwa.music.found_sounds | music | A1 A2 A3 | nearby | 10 |  |
| rwa.lifeskills.count_spoons | academic | A1 A2 A3 | self | 5 | academic.maths.counting.01 |
| rwa.lifeskills.help_cook | nature | A2 A3 A4 A5 | assist | 20 | nature.cooking.poha.01 |
| rwa.lifeskills.tidy_toys | nature | A1 A2 A3 | self | 10 |  |
| rwa.lifeskills.handwash_song | nature | A1 A2 A3 | nearby | 2 | nature.hygiene.handwash.01 |
| rwa.lifeskills.table_manners | nature | A2 A3 A4 | self | 20 |  |
| rwa.lifeskills.shop_list | nature | A3 A4 A5 | together | 30 | nature.lifeskills.money.01 |
| rwa.lifeskills.tell_story | academic | A2 A3 A4 A5 | self | 10 | storyland.panchatantra.monkey.01 |
| rwa.lifeskills.feelings_chart | mind | A2 A3 A4 A5 | self | 5 | mind.emotion.feelings.01 |
| rwa.lifeskills.family_tree | mind | A2 A3 A4 A5 | self | 15 | mind.social.family.01 |
| rwa.household.bed_making | nature | A2 A3 A4 A5 | self | 5 |  |
| rwa.household.plant_water_check | nature | A1 A2 A3 | nearby | 5 |  |
| rwa.observation.ant_line | nature | A1 A2 A3 A4 | nearby | 10 |  |
| rwa.observation.sunset_colours | explore | A1 A2 A3 A4 A5 | together | 15 |  |
| rwa.environment.plastic_count | nature | A3 A4 A5 | self | 10 |  |
| rwa.environment.rain_gauge | stem | A3 A4 A5 | nearby | 10 |  |
| rwa.safety.road_cross | nature | A2 A3 A4 A5 | together | 10 |  |

## 9. Gap list, in priority order

1. Author the 54 planned lessons above (each needs both levels, en + hi, an activity, a quiz and an echo).
2. Lap-mode (A0) media: picture-and-sound sets for every world; no scoring.
3. Translate all content into the twelve remaining languages through the CMS workflow; proofread per language.
4. Audio: no recorded voice lines exist; every dialogue step is text until the voice production in docs/dadu/14-voice-audio.md runs.
5. Illustrations: story pages reference illustration keys (e.g. `river_tree`) that the render layer draws generically until per-page art exists.
6. Assessments: items are drawn from lesson quizzes; dedicated question banks per concept (16-assessment.md) are not yet authored.
7. Olympiad-style sets exist as a shape only; curated problem sets are not authored.
8. Stories for Vikram–Betaal, Gopal Bhar, Nasruddin, Kathasaritsagara, Tagore, Sukumar Ray and The Jungle Book: collections registered, zero stories authored.
