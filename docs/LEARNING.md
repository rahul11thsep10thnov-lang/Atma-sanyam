# Learning academy: Study Playfully, Music and Sports

The Learn tab of the Player Console holds three sections plus the Art & Craft door:

| Section | Subjects (keys in `backend/src/catalogue/learning.ts`) |
|---|---|
| **Study Playfully** | maths, vedic-maths, physics, chemistry, biology, environment, history, geography, computers, english, hindi, general-knowledge, thinking |
| **Music** | piano, tabla, guitar (priority) · drums, flute, violin (registered, lessons "coming soon") |
| **Sports** | cricket, football, badminton, squash, basketball, volleyball, table-tennis, swimming |

Every subject, instrument and sport is tracked separately (`learning_levels`): a child can be at
"age 11" in physics and "age 6" in piano.

## Age framework

Brackets A 3–5 Little Explorers · B 6–8 Brain Builders · C 9–10 Mind Masters · D 11–12 Junior
Strategists, with a lesson per **year** (`recommended_age` 3…12). The child's default learning
age is their real age from the profile's birth month. **Cross-age access is mandatory and built
in**: every subject screen has "Explore other ages & levels" (all ages, a single age, or a
Beginner / Intermediate / Advanced filter) and "Back to my age". Exploring is a view: it changes
nothing about the profile, the bracket or the guardian's permissions, and the default returns
every time the screen opens. Lessons always show their recommended age ("Recommended for your
age", "age 4 · revision", "age 11 · stretch").

## The chapter template (every lesson, no exceptions)

1. **Today you will learn** (objective) 2. **Look & discover** (interactive picture)
3. **Understand** (short explanation, bullet points) 4. **Example** (worked, step by step)
5. **Try it** (an activity the child does) 6. **In the real world** 7. **Quick revision**
8. **Did You Know?** (a relevant fact with a named, linked source) 9. **Chapter challenge**
(3+ questions and/or an activity).

The template is enforced twice: the seed refuses a lesson that breaks it
(`backend/src/catalogue/lessons/helpers.ts: assertTemplate`), and the admin API refuses to
publish one (`templateProblems`). Text can carry a simpler `textByBracket.A` variant; the app
picks wording by the **age being learned at**, not the profile.

### Visual vocabulary (`src/learning/visuals`)

`counters`, `numberLine`, `shapes`, `placeValue`, `grid` (perimeter/area), `balance` (equations),
`multiplyTrick`, `scene` (emoji scene with arrows and tappable items), `ballPath`, `shadowSun`,
`lever`, `particles` (solid/liquid/gas), `molecule`, `cycle` / `lifeCycle`, `flowchart`,
`labelled` (also `sortCards`, `wasteBins`, `moneyJar`, `plantParts`, `computerParts`), `bar`,
`timeline`, `sourceCards` (evidence / interpretation / legend; primary / secondary),
`compass`, `mazeMini`, `mapSchematic` (world continents and oceans; Indian rivers — schematic,
never a precise map), `passwordStrength`, `letters`, `patternRow`, `pianoKeys` (with demo at
slow/normal speed, replay, finger numbers), `fingerNumbers`, `staff`, `rhythmGrid` (metronome
grid with accents, claps and khali), `tabla` (two tappable drums), `guitarChord` (fret diagram,
pluck and strum), `court` (cricket, football, badminton, squash, basketball, volleyball, table
tennis, pool), `figure` (stick-figure poses with tappable labels). Unknown kinds render as a
labelled card so console-authored content never breaks the app.

### Activity vocabulary (`src/learning/activities`)

`mcq`, `predict`, `trueFalse`, `count`, `number` (keypad), `tapTarget` (tap all that apply),
`order`, `match`, `rhythm` (tap along, scored on timing), `piano` (tap the named keys in order),
`tabla` (tap the right drum per bol), `guitar` (place fingers, strum). Instrument activities say
plainly that LoJi checks taps on the screen and cannot hear a real instrument or judge hand
position; sports lessons say the same about the body.

### Audio

Notes, bols and clicks are synthesised (`src/learning/audio.ts`): WebAudio on web, a generated
WAV played with `expo-audio` on native. No licensed samples are bundled.

## Content shipped (50 lessons)

| Section | Subject | Lessons (recommended age) |
|---|---|---|
| Study | Mathematics | 3 Counting 1–5 · 5 Shapes · 7 Tens and ones · 9 Perimeter & area · 11 Missing number (algebra) |
| Study | Vedic Maths | 8 Multiply by 11 · 11 Numbers near 100 (each with the proof and a standard-method check; the name's history is stated honestly) |
| Study | Physics | 4 Push and pull · 8 Light and shadows · 11 Levers |
| Study | Chemistry | 6 Solid/liquid/gas · 9 Mixing and separating (water, salt, sand, paper only) · 12 Atoms and molecules |
| Study | Biology | 3 Living or not · 7 Parts of a plant · 10 Digestive system |
| Study | Environment | 5 Save water · 8 Water cycle · 11 Waste segregation |
| Study | History | 6 Family timeline · 9 Indus Valley (evidence / interpretation / legend) · 12 Primary and secondary sources |
| Study | Geography | 4 Directions · 8 Continents and oceans · 10 Rivers of India (schematic) |
| Study | Computer Studies | 5 Parts of a computer · 8 Algorithms · 11 Safe online (no accounts, no external sites) |
| Study | English 4 Letter sounds · Hindi 5 स्वर · General Knowledge 9 Needs, wants and saving · Thinking 10 Spot the pattern | |
| Music | Piano | 3 High and low · 6 Finger numbers & middle C · 9 First tune (Twinkle) · 12 C major scale & chord |
| Music | Tabla | 4 Clap the beat · 8 First bols (Na, Tin, Ge, Dha) · 11 Teentaal |
| Music | Guitar | 7 Meet the guitar · 10 First chord (E minor) |
| Sports | Cricket 6 Meet cricket · 10 Grip & stance · Football 5 Kick & stop · Badminton 8 Grip & serve · Squash 9 Court & safety (eye protection) · Basketball 7 Dribbling · Volleyball 9 Forearm pass · Table tennis 8 Grip & stance · Swimming 5 Water safety first | |

Every published lesson has a sourced Did You Know? (coverage 100%, shown in the console
overview). Swimming states, in the lesson and in the subject's safety notes, that **nobody
learns to swim from a screen**: real swimming needs a qualified in-person instructor and
constant adult supervision. Chemistry uses kitchen-safe experiments only (no flames, no
household chemicals, nothing tasted).

Subjects with no lesson yet (drums, flute, violin) show **"Lessons coming soon"**; a subject
with lessons but none at the child's age shows "Lessons for other ages" — never an empty shelf
of cards.

## Curriculum mapping (honest by design)

Each lesson carries `curriculum[]` mappings: `framework` (ncert, cbse, cisce, state, ib_pyp,
ib_myp), `board?`, `grade`, `syllabusTopic`, `learningOutcome?`, `sourceRef` (the public
document), `verificationStatus`, `lastReviewedAt`. **Every seeded mapping is
`pending_review`.** A fact checker verifies or rejects each mapping in the console
(`POST /admin/v1/lessons/:id/curriculum/:index/verify`). The app shows **"Aligned with the
selected curriculum topic"** only when (a) the guardian chose a framework (and optionally grade
and board) in Controls and (b) a mapping for that framework/grade is `verified`. Otherwise it
shows "Curriculum mapping awaiting review" or "Not yet mapped". LoJi makes no claim of
affiliation with or endorsement by any board or the IB.

## Progress, coins and the guardian

`PUT /v1/player/learning/lessons/:id/progress` saves steps done, activity results, quiz score,
time and the age the child chose. Completion is accepted only when every step is done; the
first completion pays `rewards.lessonCompleted` coins once (idempotency key
`lesson:<child>:<lesson>`) and raises `learning_levels` for that subject. Guardians see the
learning report (`GET /v1/guardian/children/:id/learning`): lessons by section/subject, levels,
quiz accuracy, time, streak, weekly goals and suggested next lessons; in Controls they choose a
curriculum, set goals, turn subjects off and cap daily coins.

## Authoring

Admin console → Learning academy: list with coverage by subject × age, editor with the template
check, JSON steps/curriculum/sources, draft → in review → published → archived, review trail,
mapping verification. Seeded lessons an admin edits are never overwritten by a later seed;
untouched ones are refreshed from code (verification already recorded is kept).
