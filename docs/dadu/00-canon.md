# DADU – Design canon

**Project, app and session name: DADU.**
Full title: *DADU – Dadaji's Miniverse. Learn, Play, Explore and Grow!*
An immersive, multilingual Indian child-development universe for ages 0–12.

This file is the single source of truth that every other document in `docs/dadu/` and the
visual prototype in `prototype/dadu/` follow. If a document and this file disagree, this
file wins. Change it first, then the documents.

---

## 1. The seven permanent characters

| Key | Name | Who | Voice | Learning role |
|---|---|---|---|---|
| `dadaji` | **Dadaji** | Elderly Indian grandfather. Round spectacles, white hair and moustache, cream kurta with a saffron-and-indigo border, white dhoti, brown chappals, a small shoulder towel (gamchha). | Warm, slow, expressive, slightly husky; chuckles. | The one and only permanent teacher. Introduces every lesson, explains, asks, encourages, corrects, experiments, narrates, guides real-world assignments, conducts assessments. |
| `gopu` | **Gopu** | Dadaji's naughty, curious, energetic grandchild, about seven in canon. Messy hair with a cowlick, yellow T-shirt with a mango print, blue shorts, red sneakers, a scraped knee plaster. | Young, bright, fast, giggly. | Represents the learner. Asks unexpected questions, makes funny mistakes, learns good habits over time. |
| `kim` | **Kim** | Playful dog. Tan-and-white Indian pariah-style dog with one floppy ear, a red collar with a brass bell, an ever-wagging curled tail. | Playful, bouncy, short barks, "Woof-yes!" | Sports, reasoning, environment, "let's go find out" energy. |
| `molly` | **Molly** | Intelligent rabbit. Soft grey rabbit with a white tummy, one ear folded, a tiny green scarf, carries a notebook and a pencil behind the ear. | Cheerful, quick, precise, dry humour. | Mathematics, puzzles, logic, patterns. Makes humorous observations. |
| `gauri` | **Gauri** *(proposed – pending approval)* | Gentle pet cow. White Gir-style cow with a pale pink muzzle, a marigold garland, soft brown patches, a brass bell. | Calm, deep, slow, affectionate "Hmmm". | Agriculture, nature, animals, nutrition, kindness. |
| `dhanu` | **Dhanu** | Mischievous calf. Small, tan, big eyes, a tuft on the head, always hopping. | Innocent, squeaky, playful "Maa!". | Simple activities for the youngest learners; comic relief; memorable moments. |
| `mitthu` | **Mitthu** | Indian mountain parrot (inspired by the Himalayan slaty-headed parakeet): bright green body, slate-blue head, red-orange beak, long blue-green tail. Perches on Dadaji's shoulder or the veranda swing. | Chirpy, rhythmic, repeats phrases with a musical lilt. | **Revision.** Once in a while Mitthu repeats key clauses of a lesson ("Mitthu's Echo"); Gopu listens, repeats and revises. Never teaches new material. |

The cow is the only character the master prompt leaves unnamed; *Gauri* is a proposal and must be
approved or replaced before any audio is recorded.

Dadaji is the permanent central teacher across all subjects. Specialists and guest characters
may visit (a cricketer, a scientist, a musician, a librarian) but Dadaji always introduces them,
stays on screen, and closes the lesson.

### Canonical teaching formula (every lesson, every section)

1. Dadaji introduces the subject.
2. Gopu asks a question (often unexpected).
3. An animal participates (Kim, Molly, Gauri, Dhanu).
4. Dadaji explains, with an example or an experiment.
5. The child performs an activity.
6. Dadaji gives feedback (never shaming).
7. A short assessment follows.
8. *Optional, periodic:* Mitthu's Echo – a 30–60 second revision where Mitthu repeats the key clauses and Gopu repeats after Mitthu.

---

## 2. Age bands and interface modes

| Band key | Ages | Interface mode | Notes |
|---|---|---|---|
| `A0` | 0–2 | **Lap mode** | Parent holds the device. Full-screen pictures, sounds, songs, single-tap. No text, no scoring. |
| `A1` | 2–4 | **Little mode** | Big illustrations, 3–4 choices per screen, audio-first, drag-and-drop, matching. |
| `A2` | 4–6 | **Little mode** | Phonics, counting, tracing; text appears with audio; 4–6 choices. |
| `A3` | 6–8 | **Explorer mode** | Reading text, multiple choice, simple written answers, projects begin. |
| `A4` | 8–10 | **Explorer mode** | Reasoning, experiments, coding, longer projects, Olympiad-style practice. |
| `A5` | 10–12 | **Explorer mode** | Independent exploration, essays, data, advanced projects, mentoring the younger characters. |

Age is set by the parent at profile creation. A separate **difficulty level** (`gentle`, `steady`,
`stretch`) and the child's **demonstrated mastery** adjust content independently of age. Age is
never used alone to judge ability.

---

## 3. Languages

First screen after install is always language selection. Fourteen launch languages:

| Code | Language | Script | Cartoon font (headings) |
|---|---|---|---|
| `en` | English | Latin | Baloo 2 |
| `hi` | Hindi | Devanagari | Baloo 2 |
| `bn` | Bengali | Bengali | Baloo Da 2 |
| `as` | Assamese | Bengali–Assamese | Baloo Da 2 |
| `or` | Odia | Odia | Baloo Bhaina 2 |
| `mr` | Marathi | Devanagari | Baloo 2 |
| `gu` | Gujarati | Gujarati | Baloo Bhai 2 |
| `pa` | Punjabi | Gurmukhi | Baloo Paaji 2 |
| `ta` | Tamil | Tamil | Baloo Thambi 2 |
| `te` | Telugu | Telugu | Baloo Tammudu 2 |
| `kn` | Kannada | Kannada | Baloo Tamma 2 |
| `ml` | Malayalam | Malayalam | Baloo Chettan 2 |
| `ur` | Urdu | Perso-Arabic (RTL) | Baloo Bhaijaan 2 |
| `sa` | Sanskrit | Devanagari | Baloo 2 |

Body text: **Nunito** (Latin) and **Noto Sans <script>** per language. All fonts are open licence
(SIL OFL). Modes: single-language, bilingual (primary + helper), language comparison, English with
Hindi explanations, Hindi with English explanations.

---

## 4. Visual identity – "Living Picture Book"

Original identity. Hand-painted, warm, rounded, soft 2.5D with layered parallax backgrounds.
No corporate dashboards, no flat grey grids.

### Palette (`dadu.palette`)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FFF6E5` | Base background, cards |
| `cream` | `#FFEFD2` | Secondary surfaces |
| `saffron` | `#F4A523` | Primary action, stars, Dadaji's border |
| `marigold` | `#FFC94D` | Highlights, coins |
| `haldi` | `#FFE08A` | Soft highlight |
| `clay` | `#D9663D` | Warm accent, house walls, danger-free "try again" |
| `peepal` | `#4E9F3D` | Nature, correct, garden |
| `leaf` | `#8BC34A` | Light green |
| `monsoon` | `#2E86AB` | Water, sky, STEM |
| `sky` | `#BFE6F7` | Day sky |
| `indigo` | `#2F3C7E` | Dadaji's kurta border, ink headings, night |
| `night` | `#1B2142` | Bedtime mode background |
| `plum` | `#8E4585` | Art and creativity |
| `rose` | `#F28DA6` | Music and performing arts |
| `ink` | `#3A2E2A` | Body text |
| `inkSoft` | `#6F5F58` | Secondary text |
| `line` | `#EAD9BF` | Hairlines |

### Section colours (eight learning sections)

| # | Section key | Name | Colour | Icon motif |
|---|---|---|---|---|
| 1 | `academic` | Academic Learning | `indigo` | Slate and chalk |
| 2 | `stem` | STEM and Technology | `monsoon` | Gear and spark |
| 3 | `music` | Music and Performing Arts | `rose` | Tabla and ghungroo |
| 4 | `art` | Art and Creativity | `plum` | Brush and rangoli |
| 5 | `sports` | Sports and Fitness | `clay` | Cricket bat and ball |
| 6 | `nature` | Nature and Life Skills | `peepal` | Sapling in hands |
| 7 | `mind` | Cognitive and Social Skills | `saffron` | Puzzle piece and heart |
| 8 | `explore` | Knowledge and Exploration | `marigold` | Telescope and globe |

Plus four companion areas: `stories` (Dadaji's Story Corner), `tests` (Tests and Challenges),
`achievements` (My Achievements), `parents` (Parent Dashboard, behind the parental gate).

### Typography

Headings: Baloo 2 family (per script, above). Body: Nunito / Noto Sans. Minimum body size 16 px
(Little mode 20 px). Dyslexia-friendly option swaps body to Atkinson Hyperlegible / Lexend.

### Shape and motion

Radii 16 / 24 / 32 / pill. Buttons in Little mode are at least 72 pt tall. Shadows are warm,
soft, low-opacity. Ambient loops (leaves, butterflies, Mitthu blinking) respect reduce-motion.
Character animation states: idle, walk, run, sit, laugh, talk, think, clap, dance, surprised,
correct, incorrect, sleepy (bedtime), wave.

---

## 5. The Miniverse – canonical locations and IDs

```
miniverse
├── house                          Dadaji's house (large plot, massive garden around it)
│   ├── house.veranda              Entry, swing, Mitthu's perch
│   ├── house.living_room          Main teaching room (telescope, globe, radio, bookshelf, clock, carrom)
│   ├── house.study                Study room and private library
│   ├── house.lab                  Science laboratory
│   ├── house.music_room           Music room
│   ├── house.art_room             Art and creativity room
│   ├── house.kitchen              Kitchen
│   ├── house.dining               Dining room
│   ├── house.bedroom              Bedroom (bedtime stories, sleep hygiene)
│   ├── house.playroom             Indoor playroom
│   ├── house.bathroom             Bathroom (hygiene)
│   ├── house.cowshed              Cow shed and pet-care area (Gauri, Dhanu, Kim's kennel, Molly's hutch)
│   ├── house.store                Storage room and gardening equipment
│   └── house.garden               Private family garden (massive; reserved zones for future animal shelters)
├── town.public_garden             Playground, sports grounds, butterfly garden, science stations
├── town.library                   Public library
├── town.temple                    Temple and cultural courtyard (optional, respectful)
└── town.excursions                Virtual excursion portals (museum, forest, mountains, ocean, monuments, space)
```

Interactive object IDs are `location.object`, for example `house.living_room.telescope`,
`house.garden.tulsi_plant`, `town.library.story_shelf`.

Reserved future zones in `house.garden`: `shelter.goat`, `shelter.hen`, `shelter.horse`,
`shelter.duck_pond`, `shelter.bee`, `shelter.rescue`. They appear on the map as fenced,
grassy plots so the world can grow without a redesign.

---

## 6. Content IDs

- Lesson: `<section>.<subject>.<topic>.<nn>` → `academic.math.counting.03`
- Story: `story.<collection>.<slug>` → `story.panchatantra.monkey_and_crocodile`
- Assignment: `rwa.<subject>.<slug>` → `rwa.gardening.plant_a_seed`
- Assessment item: `q.<lesson-id>.<nn>`
- Every content item carries: learning objective, age bands, section, subject, topic,
  difficulty, prerequisites, source provenance, verification status, version.

---

## 7. Technical stack (decided by inspecting the existing repository)

The repository already contains a working product (Tame) with the exact stack the master prompt
suggests. DADU reuses it rather than starting again:

| Layer | Existing | Reuse for DADU |
|---|---|---|
| Mobile | Expo SDK 57, React Native 0.86, TypeScript, React Navigation 7, react-native-svg, expo-gl/three, i18n (`src/i18n`), settings and secure storage | Keep. Add `src/dadu/*` modules. Replace the Tame tabs with the Miniverse. |
| API | Node 22, Express 5, Drizzle ORM, PostgreSQL, zod, RBAC, audit log, rate limits, push, SMS, WebSocket hub | Keep. Add DADU schemas and routes under `/v1/dadu/*` and `/admin/v1/dadu/*`. |
| Admin | Next.js 16 App Router, httpOnly cookie proxy, content console | Keep. Add the DADU CMS sections and the approval workflow. |
| Animation | react-native-svg today | Add Rive (preferred) or Lottie for characters; SVG/Skia for scenes. |
| Audio | none today | Add expo-av / expo-audio, cached narration, ducking. |

Seventeen DADU modules (`src/dadu/<module>` on mobile, `backend/src/dadu/<module>` on the API):
`auth`, `profiles`, `miniverse`, `characters`, `interaction`, `language`, `audio`, `lessons`,
`stories`, `assessment`, `assignments`, `gamification`, `screentime`, `parents`, `cms`,
`analytics`, `offline`.

---

## 8. Non-negotiables

- Dadaji is the only permanent teacher.
- Every object, room and location has a learning purpose (no decorative dead ends).
- Every lesson can extend into a real-world assignment where relevant.
- Nothing shames a child. Incorrect answers get a warm explanation and another try.
- No gambling mechanics, no manipulative streaks, no ads targeted at children, no open chat.
- Parental gate protects everything about accounts, purchases, data and photos.
- Indian DPDP Act compliance: verifiable parental consent, minimal data, deletion on request.
- Religious and cultural content is optional, respectful, and distinguishes history, mythology and belief.
- No copyrighted characters, art, music or text from any other product.

---

## 9. Document index

| # | File | Content |
|---|---|---|
| 00 | `00-canon.md` | This file |
| 01 | `01-product-architecture.md` | Complete product architecture |
| 02 | `02-character-bible.md` | Character design bible (seven characters) |
| 03 | `03-miniverse-map.md` | Miniverse map |
| 04 | `04-house-floor-plan.md` | House floor plan |
| 05 | `05-room-designs.md` | Room designs (13 rooms) |
| 06 | `06-garden-designs.md` | Private garden and public garden |
| 07 | `07-public-library.md` | Public library |
| 08 | `08-temple-courtyard.md` | Temple and cultural courtyard |
| 09 | `09-main-dashboard.md` | Main dashboard and navigation |
| 10 | `10-interactive-object-map.md` | Interactive object map and location-to-learning database |
| 11 | `11-eight-sections.md` | Eight-section navigation and curriculum outline |
| 12 | `12-age-adaptive-interface.md` | Age-adaptive interface designs |
| 13 | `13-story-library.md` | Story library |
| 14 | `14-voice-audio.md` | Voice and audio architecture |
| 15 | `15-real-world-assignments.md` | Real-world assignment architecture |
| 16 | `16-assessment.md` | Assessment architecture |
| 17 | `17-database-schema.md` | Database schema |
| 18 | `18-api.md` | API architecture |
| 19 | `19-parent-dashboard.md` | Parent dashboard and screen time |
| 20 | `20-admin-cms.md` | Admin panel and CMS |
| 21 | `21-roadmap.md` | Technical roadmap (ten phases) |
| 22 | `22-assets.md` | Asset requirements |
| 23 | `23-costs.md` | Estimated development and operational costs |
| — | `../../prototype/dadu/index.html` | Visual prototype |
