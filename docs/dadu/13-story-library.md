# 13 – Story library: Dadaji's Story Corner

The storytelling section lives in the reading corner of `house.study` (see `05-room-designs.md`)
and is reachable from the dashboard tile `stories` (`09-main-dashboard.md`). Dadaji narrates;
Gopu and the animals take part; Mitthu's Echo may follow a story just as it follows a lesson
(`02-character-bible.md`, section 10). Audio and read-along timing follow `14-voice-audio.md`.

This document covers the sixteen collections named in the brief, their rights position, the
data model, the player, question design and a launch list that needs no licensing.

---

## 1. Rights position of the sixteen collections

Assessment as at 2026 under Indian copyright law (life of the author plus sixty years,
counted from the start of the year following death). This is the content team's working
assessment and is not legal advice; the copyright-verification step of the CMS workflow
(`20-admin-cms.md`) must confirm every item before publication.

| # | Collection | Origin | Status | What DADU may do without a licence | What needs a licence |
|---|---|---|---|---|---|
| 1 | Panchatantra | Sanskrit, traditional (attributed to Vishnu Sharma) | Public domain | Retell freely in our own words and art in all languages | Any modern translation or illustrated edition we would copy from |
| 2 | Jataka Tales | Pali Buddhist canon, traditional | Public domain | Retell freely; present as Buddhist tradition, not Hindu mythology | Modern retellings |
| 3 | Hitopadesha | Sanskrit, traditional (Narayana) | Public domain | Retell freely | Modern translations |
| 4 | Akbar and Birbal | Folk tales, oral tradition | Public domain (folk) | Retell freely; label as folk tales, not history | Specific authored collections |
| 5 | Tenali Raman | Folk tales, oral tradition | Public domain (folk) | Retell freely; same labelling | Specific authored collections, television adaptations |
| 6 | Vikram and Betaal | Sanskrit (Betaal Pachisi), traditional | Public domain | Retell freely; select age-appropriate riddles only | Television adaptations |
| 7 | Gopal Bhar | Bengali folk tales, oral tradition | Public domain (folk) | Retell freely | Authored collections, animated series |
| 8 | Mullah Nasruddin | Folk tales across Central and South Asia | Public domain (folk) | Retell freely | Authored collections |
| 9 | Kathasaritsagara | Sanskrit (Somadeva, 11th century) | Public domain | Retell selected, age-suitable tales | Modern translations |
| 10 | Malgudi Days | R. K. Narayan (died 2001) | **In copyright until the end of 2061** | Nothing from the text | Adaptation, translation, narration and distribution licence from the estate or publisher; **blocked pending rights** |
| 11 | Rabindranath Tagore's stories | Tagore (died 1941) | Public domain in India since 2002 | Original Bengali texts and Tagore's own English versions; our own translations into the other twelve languages | Third-party modern translations or illustrations |
| 12 | Ruskin Bond's stories | Living author | **In copyright** | Nothing from the text | Licence from the author and publisher; **blocked pending rights** |
| 13 | Satyajit Ray's stories | Ray (died 1992) | **In copyright until the end of 2052** | Nothing from the text | Licence from the estate and publisher; **blocked pending rights** |
| 14 | Grandma's Bag of Stories | Sudha Murty, living author | **In copyright** | Nothing from the text; note that many of the underlying folk motifs are traditional and may be retold independently from folk sources, clearly not presented as this book | Licence from the author and publisher for the book itself; **blocked pending rights** |
| 15 | Sukumar Ray's stories and verse | Sukumar Ray (died 1923) | Public domain | Original Bengali texts; our own translations | Third-party translations; film adaptations |
| 16 | The Jungle Book | Rudyard Kipling (died 1936) | Public domain (text) | Kipling's text and our own translations, art and narration | Any film or animated adaptation, their character designs, songs and names of invented elements not in the book; **our art must be independently designed** |

Four of sixteen collections (10, 12, 13, 14) are blocked until licences are signed. The
launch catalogue is built from the other twelve.

### Permissions action list

| Action | Owner | Status |
|---|---|---|
| Write to the publishers of R. K. Narayan, Ruskin Bond, Satyajit Ray and Sudha Murty requesting adaptation, translation (14 languages), narration, illustration and in-app distribution rights for a named list of stories, with a per-story or revenue-share proposal | Content lead with legal counsel | To do |
| Record in the CMS the exact source edition used for every public-domain text (for example a specific out-of-copyright printing of Tagore) | Content team | To do before first story is drafted |
| Commission original illustrations and character designs for Jungle Book animals with a written "no reference to any film" instruction | Art director | To do |
| Obtain written confirmation from each voice actor that narration may be distributed in all markets | Audio producer | To do |
| Maintain a rights register with licence term, territory, languages, renewal date and the stories covered | Legal | To do |

---

## 2. Sample entries for the traditional collections

Each entry gives the story, the takeaway and how it is adapted across age bands. Full scripts
are authored in the CMS; these are the seeds.

### Panchatantra

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.panchatantra.monkey_and_crocodile` | The monkey and the crocodile | Quick thinking; true friendship is not betrayed | Picture-only: monkey, tree, river, fruit; two taps | Full plot, Gopu asks why the crocodile's wife was jealous; discussion of trust |
| `story.panchatantra.blue_jackal` | The jackal who turned blue | Pretending to be what you are not fails | Colours and animal sounds | Why the jackal howled; honesty discussion |
| `story.panchatantra.four_friends` | The four friends (deer, crow, mouse, turtle) | Teamwork | Name the four animals | Each animal's contribution; Kim leads a teamwork game |
| `story.panchatantra.lion_and_rabbit` | The lion and the clever rabbit | Wit over strength | Rabbit hops, lion roars | Molly explains the reflection trick |
| `story.panchatantra.tortoise_and_geese` | The talkative tortoise | Think before you speak | Flying geese picture | Why the tortoise fell; a listening game |

### Jataka Tales (presented as Buddhist tradition)

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.jataka.monkey_king_bridge` | The monkey king who became a bridge | A leader protects others | Monkeys crossing a river | Sacrifice and leadership |
| `story.jataka.banyan_deer` | The banyan deer | Compassion | Deer and forest sounds | Rules that spare the weak |
| `story.jataka.quarrelling_quails` | The quails who stayed together | Unity | Birds flying with a net | Why unity ended when they quarrelled |
| `story.jataka.golden_goose` | The golden goose | Greed loses everything | Shiny feathers | Gauri on taking only what you need |

### Hitopadesha

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.hitopadesha.old_tiger_bracelet` | The old tiger and the golden bracelet | Beware easy gifts | Tiger and shiny bangle | Judging offers; Molly's logic check |
| `story.hitopadesha.elephants_and_rabbits` | The elephants and the clever rabbit | Cleverness protects the small | Elephant stomp, moon in lake | Reflection trick; Molly again |
| `story.hitopadesha.pigeons_and_net` | The pigeons and the hunter's net | Cooperation | Birds flying together | Teamwork; same theme as quails, cross-linked |

### Akbar and Birbal (labelled folk tales)

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.akbar_birbal.pot_of_wit` | The pot of wit | Humour solves problems | Not used | Full riddle; Gopu attempts his own answer |
| `story.akbar_birbal.counting_crows` | How many crows in the kingdom | Confident reasoning | Count crows to five | Estimation lesson tie-in |
| `story.akbar_birbal.shorter_line` | Make the line shorter without touching it | Think differently | Long and short lines | Dadaji draws; child solves before Birbal |
| `story.akbar_birbal.mango_tree` | Whose mango tree? | Fairness | Mango picture | Evidence and judgement |

### Tenali Raman (labelled folk tales)

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.tenali.cat_and_hot_milk` | The cat and the hot milk | Lessons are learnt by experience | Cat and milk | Why the cat refused milk later; habit formation |
| `story.tenali.greatest_well` | The thirsty well | Wit against greed | Not used | Full plot |
| `story.tenali.bag_of_rice` | The weight of a bag of rice | Honesty in trade | Heavy and light | Measurement tie-in with the kitchen |

### Vikram and Betaal (selected tales only)

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.vikram_betaal.frame` | The king and the riddling spirit (frame story) | Keep your word | Not used | Frame explained gently; Betaal is a playful riddler, never frightening |
| `story.vikram_betaal.three_suitors` | Who is the true friend? | Reasoning about loyalty | Not used | Debate activity |
| `story.vikram_betaal.clever_minister` | The minister's judgement | Weighing evidence | Not used | Court activity |

### Gopal Bhar

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.gopal_bhar.rain_prediction` | Gopal predicts the rain | Observation beats guessing | Rain sounds | Gauri on weather signs |
| `story.gopal_bhar.cost_of_a_hen` | The price of a hen | Clear thinking about numbers | Hen and eggs | Molly on multiplication |
| `story.gopal_bhar.one_more_rupee` | One more rupee | Honesty | Coins | Money lesson tie-in |

### Mullah Nasruddin

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.nasruddin.lost_key` | Looking for the key under the lamp | Look where the problem is | Key and lamp | Problem-solving discussion |
| `story.nasruddin.donkey_and_salt` | The donkey and the salt | Learning from experience | Donkey, water, splash | Dissolving: science tie-in |
| `story.nasruddin.pot_that_died` | The pot that had a baby | Fair dealing | Pots big and small | Logic and fairness |

### Kathasaritsagara (selected)

| Story id | Story | Takeaway | A0–A2 | A3–A5 |
|---|---|---|---|---|
| `story.kathasarit.weavers_lamp` | The weaver's lamp | Patience | Not used | Patience and craft |
| `story.kathasarit.bird_who_sang` | The bird who sang for freedom | Freedom and kindness | Bird song | Caring for animals; Mitthu joins |
| `story.kathasarit.merchant_and_mouse` | The merchant who began with a mouse | Resourcefulness | Mouse and grain | Financial literacy tie-in |

### Tagore, Sukumar Ray and Kipling (public domain)

| Story id | Story | Notes |
|---|---|---|
| `story.tagore.kabuliwala` | Kabuliwala | A3–A5; friendship across distance; translated from the Bengali by our team |
| `story.tagore.postmaster` | The postmaster | A4–A5; gentle treatment of loss |
| `story.tagore.the_hero` | The hero (from The Crescent Moon) | A2–A3; a child's imagination |
| `story.sukumar_ray.abol_tabol_select` | Nonsense verses (selected) | A1–A3; rhythm and rhyme; Mitthu's favourite |
| `story.sukumar_ray.ha_ja_ba_ra_la` | Ha-Ja-Ba-Ra-La | A3–A5; playful logic |
| `story.jungle_book.mowgli_brothers` | Mowgli's brothers | A3–A5; our own illustrations and character designs |
| `story.jungle_book.rikki_tikki` | Rikki-Tikki-Tavi | A3–A5; bravery; wildlife tie-in |
| `story.jungle_book.white_seal` | The white seal | A4–A5; oceans tie-in |

---

## 3. Story data model

Table definitions sit in `17-database-schema.md`; the content fields are:

| Field | Type | Notes |
|---|---|---|
| `storyId` | string | `story.<collection>.<slug>` |
| `collectionId` | string | one of the sixteen, plus `original` for DADU originals |
| `title` | localised string | per language |
| `sourceEdition` | text | exact public-domain edition or licence reference |
| `rightsStatus` | enum | `public_domain`, `licensed`, `blocked` |
| `licenceId` | reference | required when `licensed` |
| `ageBands` | array | which bands have an adaptation |
| `adaptations` | array | one per age band: `scriptId`, reading level, duration, vocabulary list |
| `moral` | localised string | one sentence |
| `vocabulary` | array | word, meaning, example, image |
| `characters` | array | which DADU characters take part and how |
| `illustrations` | array | scene assets with `altText` |
| `questions` | array | comprehension items, linked to `16-assessment.md` |
| `modes` | array | `read_along`, `independent`, `bedtime` |
| `languages` | array | languages with approved text and audio |
| `tags` | array | theme, values, subject tie-ins (`academic.science.plants`) |
| `status`, `version`, `verificationStatus` | workflow | from `20-admin-cms.md` |

---

## 4. The story player

| Mode | Who it is for | Behaviour |
|---|---|---|
| Read-along | A1–A4 | Dadaji narrates; words highlight as spoken (viseme timeline); the child taps a word to hear it alone and see its picture; page turns are automatic with a tap-to-hold option |
| Independent reading | A3–A5 | Text only, no narration; a "help" tap reads one sentence; a vocabulary panel; reading-time tracked for the parent dashboard only |
| Bedtime | All | Dimmed `night` palette, Dadaji only, slower pace (pause factor 1.5), no questions, no rewards, soft `night_calm` ambience, auto-closes with Dadaji's goodnight; ties into bedtime schedules (`19-parent-dashboard.md`) |
| Multilingual | All | Any story opens in the profile language; a language chip switches text and audio; bilingual mode shows the helper language beneath each sentence |

Character participation pattern (every story):

1. Dadaji opens with a one-line framing and asks the child what they think will happen.
2. Gopu and one animal react at two or three scripted moments (a question, a joke, a worry).
3. Dadaji explains two to four vocabulary words in context.
4. Dadaji closes with the takeaway; Gopu says what Gopu would have done.
5. Comprehension questions (not in bedtime mode).
6. Optional Mitthu's Echo on the takeaway sentence.

---

## 5. Comprehension questions by age band

| Band | Types | Count per story |
|---|---|---|
| A0 | None; the parent sees a conversation prompt | 0 |
| A1 | Image recognition ("Which one is the monkey?"), sound matching | 2 |
| A2 | Image recognition, sequencing three pictures, yes/no spoken by Dadaji | 3 |
| A3 | Multiple choice, sequencing four events, "why did…" with picture options | 4 |
| A4 | Multiple choice, fill in the blank, short written answer, moral choice | 5 |
| A5 | Short written answer, "what would you do", compare two stories, retell in own words (voice optional, parent-enabled) | 5–6 |

Feedback follows the reaction system; an incorrect answer replays the relevant page.

---

## 6. Launch list: sixty stories that need no licensing

| Collection | Count | Stories (ids abbreviated to slug) |
|---|---|---|
| Panchatantra | 12 | monkey_and_crocodile, blue_jackal, four_friends, lion_and_rabbit, tortoise_and_geese, crow_and_snake, heron_and_crab, brahmin_and_goat, musical_donkey, mice_and_elephants, cat_and_two_birds, loyal_mongoose |
| Jataka | 8 | monkey_king_bridge, banyan_deer, quarrelling_quails, golden_goose, wise_elephant, little_parrot_and_fire, crab_and_crane, hare_in_the_moon |
| Hitopadesha | 5 | old_tiger_bracelet, elephants_and_rabbits, pigeons_and_net, lion_and_foolish_camel, crow_and_quail |
| Akbar and Birbal | 7 | pot_of_wit, counting_crows, shorter_line, mango_tree, birbal_khichdi, three_questions, well_water |
| Tenali Raman | 5 | cat_and_hot_milk, greatest_well, bag_of_rice, horse_trader, painted_portrait |
| Vikram and Betaal | 3 | frame, three_suitors, clever_minister |
| Gopal Bhar | 4 | rain_prediction, cost_of_a_hen, one_more_rupee, painted_elephant |
| Mullah Nasruddin | 4 | lost_key, donkey_and_salt, pot_that_died, three_sermons |
| Kathasaritsagara | 3 | weavers_lamp, bird_who_sang, merchant_and_mouse |
| Tagore | 3 | kabuliwala, postmaster, the_hero |
| Sukumar Ray | 3 | abol_tabol_select, ha_ja_ba_ra_la, khichuri_verse |
| The Jungle Book | 3 | mowgli_brothers, rikki_tikki, white_seal |
| **Total** | **60** | |

Blocked until rights are signed: every story from Malgudi Days, Ruskin Bond, Satyajit Ray and
Grandma's Bag of Stories. The CMS shows these collections as "awaiting rights" and prevents
drafting beyond a synopsis.

---

## 7. Editorial rules

- Every retelling is written fresh from the traditional plot, never from a modern edition's
  wording.
- Violence in traditional tales is softened for A0–A3 (the crocodile is tricked, not killed;
  the spirit is a riddler, not a corpse).
- Religious framing: Jataka tales are introduced as stories from Buddhist tradition; stories
  of kings are introduced as folk tales, with Dadaji distinguishing "a story people tell" from
  "something we know happened" (`08-temple-courtyard.md` applies the same rule).
- Gender balance: the original DADU story line (`story.original.*`) adds girls and women as
  protagonists where the traditional corpus lacks them; at least one in three launch
  originals has a female lead.
- No story is used to shame a child, and no story ends with a child character being punished.
