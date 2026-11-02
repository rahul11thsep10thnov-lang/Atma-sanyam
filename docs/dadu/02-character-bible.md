# 02 – Character design bible

The seven permanent characters of DADU, specified so that every artist, animator, writer and
voice director produces the same people and animals. Names, keys and roles come from
`00-canon.md`; nothing here overrides it.

Reading order for a new team member: section 1 (shared rules), then the character you are
working on, then sections 9–12 (dialogue system, Mitthu's Echo, guest rules, review checklist).

---

## 1. Shared rules

### 1.1 Style family

All seven characters live in one style: soft 2.5D, hand-painted texture, thick rounded
silhouettes, no hard black outlines (outlines are a darker tint of the fill, 2 px at 1x).
Eyes are large with a single white highlight at the upper-left. Mouths are simple shapes that
map to the eight visemes in `14-voice-audio.md`. Hands have four fingers on humans and are
mitten-shaped on animals.

### 1.2 Proportions

| Character | Height in heads | Standing height relative to Dadaji |
|---|---|---|
| Dadaji | 4.5 | 1.00 |
| Gopu | 3.0 | 0.58 |
| Kim | 2.5 (nose to rump, on all fours) | 0.40 at shoulder |
| Molly | 2.0 (sitting upright) | 0.25 |
| Gauri | 3.0 (nose to rump) | 0.72 at shoulder |
| Dhanu | 2.5 (nose to rump) | 0.42 at shoulder |
| Mitthu | 1.5 (head to tail tip) | 0.12 |

The whole cast must fit in one frame at 16:9 with Dadaji standing, so no character is drawn
taller than Dadaji and none smaller than Mitthu.

### 1.3 Colours

Every colour on a character is a palette token from `00-canon.md` or a tint/shade of one.
Tints are written as `token+20` (20 % towards white) and shades as `token-20` (20 % towards
`ink`). Artists do not invent hex values.

### 1.4 Age-band behaviour (all characters)

| Bands | Behaviour |
|---|---|
| A0–A2 | Slower movement, bigger gestures, shorter lines (under eight words), more repetition, more sound effects, faces turned to camera. Jokes are physical, not verbal. |
| A3–A5 | Normal pacing, longer explanations, verbal humour, side-glances between characters, characters can disagree and reason aloud, Gopu attempts things before being told. |

---

## 2. Dadaji (`dadaji`)

### Appearance

- 4.5 heads tall, soft round belly, slight forward lean of the shoulders, hands often clasped
  behind the back when walking.
- Head: round, bald crown with white hair at the sides (`paper`), thick white eyebrows, white
  walrus moustache, warm brown skin (`clay-30` base, `clay-10` cheeks).
- Round spectacles, thin `indigo` frames, lenses tinted `sky+60`; the frames slide down when he
  is surprised and he pushes them up with one finger.
- Costume: cream kurta (`cream`) with a `saffron` and `indigo` striped border at the hem,
  cuffs and collar; white dhoti (`paper`); brown chappals (`clay-40`); a small
  `saffron` gamchha over the left shoulder.
- Props: a walking stick with a carved parrot head (Mitthu's favourite perch), a pocket watch,
  a cloth bag of "surprise objects" he produces for lessons.
- Signature silhouette: round head with spectacle circles, moustache bulge, kurta flare at the
  hips, stick at a 15° angle.

### Personality

1. Patient: never rushes an answer.
2. Curious: treats every question from Gopu as a gift.
3. Humorous: gentle puns, never at a child's expense.
4. Affectionate: calls the learner "beta" (child) and the animals by pet names.
5. Rigorous: distinguishes "we know", "we think" and "people believe".

Never: raises his voice, says "wrong" without explaining, hands a lesson to someone else,
uses sarcasm, mentions a brand.

### Catchphrases (original)

| English | Hindi |
|---|---|
| "Come, let us find out together." | "आओ, मिलकर पता लगाते हैं।" |
| "A mistake is a step, not a fall." | "गलती सीढ़ी है, गड्ढा नहीं।" |
| "Look closely, beta. What do you see?" | "ध्यान से देखो बेटा, क्या दिखता है?" |
| "Shabash! Now let us try once more." | "शाबाश! अब एक बार और।" |

Speech pattern: short sentences, one idea each, a question at the end of most explanations,
a chuckle ("heh-heh") before a joke, Hindi affectionate words even in other languages
("beta", "shabash") kept as loanwords in all 14 localisations.

### Relationships

| With | Relationship |
|---|---|
| Gopu | Grandparent; delighted by mischief, firm about safety. |
| Kim | Old companions; Kim walks at his heel. |
| Molly | Respects her precision; asks her to check his arithmetic as a joke. |
| Gauri | Tender; strokes her forehead when they talk about nature. |
| Dhanu | Indulgent; pretends not to notice Dhanu's pranks. |
| Mitthu | Mitthu rides on his shoulder; Dadaji asks Mitthu to "say it again for us". |

### Learning role

The only permanent teacher: introduces, explains, questions, encourages, corrects,
demonstrates, narrates, guides assignments, conducts assessments, guides excursions.

### Expression sheet

`neutral_warm`, `smile`, `big_laugh`, `thinking` (finger on moustache), `surprised`
(spectacles slip), `proud`, `gentle_concern`, `listening` (head tilt, hand to ear),
`explaining` (index finger raised), `sleepy` (bedtime), `wink`, `mock_stern` (eyebrows down,
mouth twitching).

### Animation states

Shared: idle, walk, run (a short shuffle, never fast), sit, laugh, talk, think, clap, dance
(a slow bhangra shoulder-shrug), surprised, correct, incorrect, sleepy, wave.
Specific: `push_spectacles`, `reach_into_bag`, `point_with_stick`, `stroke_moustache`,
`sit_on_swing`, `hold_book`, `pour_and_measure` (kitchen/lab), `look_through_telescope`.

### Sound effects

Chuckle, "hmm" of thought, spectacle clink, stick tap on floor, kurta rustle, pocket-watch
click, bag rummage.

### Voice profile

Warm, elderly, mid-low pitch, slow (about 110 words per minute at Normal), expressive rises on
questions, soft consonants. Full specification in `14-voice-audio.md`.

---

## 3. Gopu (`gopu`)

### Appearance

- 3 heads tall, big head, thin limbs, always slightly off-balance as if about to run.
- Hair: `ink` black, messy, one cowlick standing up (the cowlick droops when Gopu is sad).
- Skin: `clay-20` base, `rose+30` cheeks. Big eyes, gap-toothed grin, one eyebrow often raised.
- Costume: `haldi` yellow T-shirt with a mango print (`saffron` mango, `peepal` leaf), `monsoon`
  blue shorts, `clay` red sneakers with white laces, one sock up and one down, a plaster
  (`cream`) on the left knee.
- Props: a slingshot that is confiscated in every episode, a magnifying glass on a string, a
  pocket full of marbles that spill at the worst moment.
- Signature silhouette: cowlick, oversized head, one foot lifted.

### Personality

1. Curious to the point of touching everything.
2. Energetic; cannot stand still during explanations.
3. Honest; admits mistakes with a grin.
4. Brave; tries first, asks later.
5. Kind underneath; protective of Dhanu.

Never: bullies, lies to Dadaji for long, is punished on screen, is called "naughty" in a
hurtful way, does anything unsafe without Dadaji intervening.

### Catchphrases

| English | Hindi |
|---|---|
| "But why, Dadaji?" | "पर क्यों, दादाजी?" |
| "I'll try it first!" | "पहले मैं करके देखता हूँ!" |
| "Oops. That was a step, not a fall." | "ओहो। ये सीढ़ी थी, गड्ढा नहीं।" |
| "Mitthu, say it again!" | "मिट्ठू, फिर से बोलो!" |

Speech pattern: fast, exclamations, half-finished sentences, lots of "wait, wait, wait".
Gopu is referred to by name in scripts; the application never assigns Gopu a gender.

### Relationships

Dadaji: adored, imitated. Kim: best friend and partner in mischief. Molly: Gopu's "brainy"
friend whom Gopu secretly wants to impress. Gauri: Gopu hides behind her when scolded. Dhanu:
little sibling figure; Gopu teaches Dhanu what Dadaji just taught Gopu. Mitthu: rival in
noise; Gopu repeats after Mitthu during revision.

### Learning role

Stands for the learner. Asks the question the child would ask, makes the error the child
would make, so the correction is never aimed at the child.

### Age-band behaviour

A0–A2: Gopu mostly plays and points, laughs and claps, names things in one word. A3–A5: Gopu
reasons aloud, argues, proposes experiments, and sometimes gets things right before Dadaji
finishes.

### Expression sheet

`grin`, `wide_eyed`, `mischief` (sideways look), `confused`, `oops`, `proud`, `sulk`
(cowlick droops), `eureka`, `scared_of_bath`, `yawn`, `concentrating` (tongue out),
`listening_to_mitthu`.

### Animation states

Shared set plus: `cartwheel`, `hide_behind_gauri`, `climb`, `pull_sock`, `shoot_marble`,
`repeat_after_mitthu` (hand cupped at ear, then speaks), `write_in_notebook`, `jump_in_puddle`.

### Sound effects

Giggle, sneaker squeak, marbles spilling, "whoa", cartwheel whoosh, plaster peel.

### Voice profile

Child voice, high, quick (about 150 words per minute at Normal), giggles between lines.

---

## 4. Kim (`kim`)

### Appearance

- Indian pariah-style dog, tan (`saffron-30`) with a white (`paper`) chest, muzzle and paw
  tips; one ear upright, one floppy; curled tail that never stops.
- `clay` red collar with a brass (`marigold-20`) bell.
- Props: a tennis ball, a stick, a tiny backpack for sports lessons.
- Signature silhouette: one ear up, curled tail, nose forward.

### Personality

1. Loyal. 2. Boundless energy. 3. Problem-solver (digs, fetches, finds paths). 4. Brave
outdoors, scared of thunder. 5. Fair; stops a game if someone is left out.

Never: bites, growls at a child, is scolded harshly, is leashed in the Miniverse.

### Catchphrases

| English | Hindi |
|---|---|
| "Woof-yes! Let's go find out!" | "वूफ-हाँ! चलो पता करें!" |
| "Follow my nose." | "मेरी नाक के पीछे चलो।" |
| "Ball first, questions later." | "पहले गेंद, फिर सवाल।" |

Speech pattern: Kim speaks (all animals speak in the Miniverse) in short bursts, starting with
a bark, ending with an action.

### Relationships

Dadaji: heel-walker, guardian. Gopu: co-conspirator. Molly: Kim fetches, Molly plans. Gauri:
Kim naps against her. Dhanu: chases and is chased. Mitthu: pretends to be annoyed by the
repeating, secretly hums along.

### Learning role

Sports and fitness demonstrations, reasoning through action, environmental exploration,
"find the path" activities (mazes, maps).

### Expression sheet

`happy_pant`, `alert`, `head_tilt`, `play_bow`, `sniffing`, `proud_fetch`, `droopy`
(incorrect), `thunder_scared`, `sleepy_curl`, `wink`, `determined`, `surprised_jump`.

### Animation states

Shared set plus: `fetch`, `dig`, `sniff_trail`, `jump_over`, `balance_on_log`, `shake_water`,
`push_ball`, `tug_rope`.

### Sound effects

Short bark, bell jingle, panting, paws on floor, tail thump, shake-off.

### Voice profile

Playful, mid pitch, breathy, lots of energy; bark sound layered under the first word.

---

## 5. Molly (`molly`)

### Appearance

- Soft grey (`inkSoft+40`) rabbit, white (`paper`) tummy and inner ears, one ear folded at the
  tip, pink (`rose+20`) nose, large thoughtful eyes with long lashes.
- Tiny `peepal` green scarf; a small notebook under one arm; a pencil behind the upright ear.
- Signature silhouette: one folded ear, pencil, notebook.

### Personality

1. Precise. 2. Quick-witted. 3. Dry humour. 4. Patient with Dhanu, impatient with guessing.
5. Honest about not knowing.

Never: shows off cruelly, calls anyone slow, is the teacher (she assists, Dadaji teaches).

### Catchphrases

| English | Hindi |
|---|---|
| "Let me count that again." | "मैं फिर से गिनती हूँ।" |
| "Pattern spotted!" | "पैटर्न मिल गया!" |
| "Hmm, that's one carrot short." | "हम्म, एक गाजर कम है।" |

Speech pattern: crisp, numbered lists ("One. Two. Three."), small jokes delivered deadpan.

### Relationships

Dadaji: his "assistant calculator" (a running joke). Gopu: corrects him kindly, is secretly
impressed by his daring. Kim: logistics partner. Gauri: Molly reads to Gauri in the shed.
Dhanu: tutors Dhanu in counting hops. Mitthu: the only one who can out-count Mitthu's
repetitions.

### Learning role

Mathematics, puzzles, logic, pattern recognition, Vedic maths tricks, chess and sudoku.

### Expression sheet

`neutral_alert`, `smirk`, `calculating` (eyes up), `pattern_spotted` (ears up), `unimpressed`,
`giggle_behind_paw`, `worried`, `nod`, `aha`, `sleepy_ear_droop`, `frown_recount`, `wink`.

### Animation states

Shared set plus: `hop`, `hop_count` (one hop per number), `write`, `tap_pencil`, `flip_page`,
`twitch_nose`, `thump_foot` (surprised), `sort_carrots`.

### Sound effects

Soft hop thump, pencil scratch, page flip, nose twitch "nuf-nuf", a tiny "ting" when a
pattern is spotted.

### Voice profile

Cheerful, light, quick but very clear; precise consonants.

---

## 6. Gauri (`gauri`) – proposed name, pending approval

### Appearance

- White (`paper`) Gir-style cow with soft brown (`clay+30`) patches, a pale pink (`rose+40`)
  muzzle, long lashes, a small hump, long drooping ears, a marigold garland (`marigold`,
  `saffron`), a brass (`marigold-20`) bell on a `clay` cord.
- Signature silhouette: hump, drooping ears, garland.

### Personality

1. Gentle. 2. Slow and steady. 3. Nurturing. 4. Observant of weather and seasons. 5. Wise
about food.

Never: is frightened into running, is ridden, is drawn with a lead rope.

### Catchphrases

| English | Hindi |
|---|---|
| "Hmmm. Everything grows in its own time." | "हम्म्म। हर चीज़ अपने समय पर बढ़ती है।" |
| "Good food, good mood." | "अच्छा खाना, अच्छा मन।" |
| "Smell the rain coming?" | "बारिश की खुशबू आ रही है?" |

Speech pattern: begins with a long "Hmmm", speaks slowly, uses farm and kitchen metaphors.

### Relationships

Dadaji: mutual tenderness. Gopu: safe place, hides behind her. Kim: pillow. Molly: her reader.
Dhanu: mother; her patience is tested daily. Mitthu: Mitthu perches on her horn at noon.

### Learning role

Agriculture, plants, animals, seasons, nutrition, kindness, composting, water.

### Expression sheet

`calm`, `soft_smile`, `chewing`, `sniff_air`, `eyes_closed_content`, `mild_alarm` (Dhanu),
`proud_mother`, `sleepy`, `curious_ear_forward`, `laugh_low`, `concerned`, `wink_slow`.

### Animation states

Shared set (run is a trot; dance is a gentle sway) plus: `chew`, `moo_call`, `lick_dhanu`,
`swish_tail`, `lie_down`, `sniff_plant`, `nudge_gopu`, `walk_to_shed`.

### Sound effects

Low "moo", bell clonk, chewing, tail swish, hoof on earth.

### Voice profile

Calm, deep for a female voice, slow (about 95 words per minute at Normal), resonant.

---

## 7. Dhanu (`dhanu`)

### Appearance

- Small tan (`saffron-20`) calf with a white (`paper`) blaze, enormous eyes, a tuft of hair on
  the crown (`clay`), knobbly knees, always one hoof off the ground.
- A tiny `rose` ribbon on the tail that Gopu tied there.
- Signature silhouette: tuft, big eyes, hopping pose.

### Personality

1. Innocent. 2. Mischievous (knocks over buckets). 3. Eager. 4. Easily distracted by
butterflies. 5. Loving.

Never: is in real danger, is mocked for being small, speaks in long sentences.

### Catchphrases

| English | Hindi |
|---|---|
| "Maa! Me too!" | "माँ! मैं भी!" |
| "Was that me? Oops." | "वो मैं था? ओहो।" |
| "Butterfly!" | "तितली!" |

Speech pattern: two-to-four-word sentences, repeats the last word of what others say, ends
with "Maa!".

### Relationships

Dadaji: follows his stick. Gopu: big sibling and partner in bucket-tipping. Kim: chase
partner. Molly: counting pupil. Gauri: mother. Mitthu: Dhanu is Mitthu's most faithful echoer.

### Learning role

Simple activities for A0–A2 (colours, sounds, counting to five), comic relief, "memorable
moment" at the end of lessons for all ages.

### Expression sheet

`wide_eyed_wonder`, `giggle`, `oops_guilty`, `pout`, `sleepy_wobble`, `excited_hop`,
`scared_small`, `proud_tiny`, `confused_tilt`, `chewing_flower`, `yawn`, `love_eyes`.

### Animation states

Shared set (walk is a skip; dance is bouncing) plus: `hop_in_place`, `knock_bucket`,
`chase_butterfly`, `hide_under_gauri`, `wobble_stand`, `lick_face`, `tail_wag_ribbon`.

### Sound effects

High "maa", hoof patter, bucket clang, giggle-snort, butterfly flutter.

### Voice profile

Innocent, squeaky, slow and simple, giggles.

---

## 8. Mitthu (`mitthu`)

### Appearance

- Indian mountain parrot inspired by the Himalayan slaty-headed parakeet (an original design,
  not a wildlife illustration): bright green (`peepal+10`) body, slate-blue (`indigo+30`)
  head, red-orange (`clay+10`) beak with a yellow tip, long blue-green tail, a tiny red
  shoulder patch.
- Perches: Dadaji's shoulder, the parrot-head of Dadaji's stick, the veranda swing chain,
  Gauri's horn.
- Signature silhouette: round head, long tail, one foot raised.

### Personality

1. Chirpy. 2. Rhythmic (everything is a tune). 3. Proud of a good memory. 4. Punctual (appears
when revision is due). 5. Sleeps at dusk no matter what.

Never: introduces new material, corrects a child, speaks over Dadaji, repeats more than three
clauses at once.

### Catchphrases

| English | Hindi |
|---|---|
| "Mitthu says it again! Say it again!" | "मिट्ठू फिर से बोले! फिर से बोलो!" |
| "Tick-tock, revision o'clock." | "टिक-टॉक, दोहराने का टाइम।" |
| "Good night, Mitthu sleeps." | "शुभ रात्रि, मिट्ठू सोता है।" |

Speech pattern: sing-song, repeats a clause two or three times with a rising melody, ends with
a whistle.

### Relationships

Dadaji: rides on his shoulder; the revision bell. Gopu: noisy rival, revision partner. Kim:
Kim hums along. Molly: counting duel. Gauri: noon perch. Dhanu: most faithful echoer.

### Learning role

**Revision only.** See section 10.

### Expression sheet

`perky`, `head_cock`, `sing`, `proud_feathers_up`, `sleepy_fluff`, `whistle`, `listening_eye`,
`wing_stretch`, `surprised_crest`, `nod_bob`, `dozing_one_eye`, `cheeky`.

### Animation states

Shared set (walk is a waddle; run is a short flight; dance is a head-bob) plus: `fly_to_perch`,
`bob_head`, `whistle`, `fluff_and_sleep`, `wing_point`, `echo_three_times` (three head-bobs,
one per repetition), `preen`.

### Sound effects

Chirp, whistle, wing flutter, beak click, a three-note "revision bell" jingle.

### Voice profile

Bright, rhythmic, slightly nasal parrot timbre, musical repetition.

---

## 9. Reusable dialogue and reaction system

Every character has the same six reaction categories so that any lesson can request a
reaction by `character + category + age band + language` and the audio engine picks a line
at random from the approved pool (minimum three lines per cell; the examples below are the
English seeds).

| Category | Dadaji | Gopu | Kim | Molly | Gauri | Dhanu | Mitthu |
|---|---|---|---|---|---|---|---|
| greeting | "Namaste, beta! Come in." / "There you are. I saved you a seat." / "Ah, a new day, a new question." | "You're here! Watch this!" / "Finally! I waited ages." / "Hi! Dadaji has a surprise." | "Woof-yes! You came!" / "Ball? Ball!" / "Follow my nose, friend." | "Right on time. I counted." / "Hello. Notebook ready." / "Pattern of the day: you're here." | "Hmmm. Welcome, little one." / "Hmmm. The garden missed you." / "Come sit, the shade is cool." | "Maa! Friend!" / "Hi hi hi!" / "Me too! Me too!" | "Hello, hello, hello!" / "Tick-tock, friend's here!" / "Chirp! Say hello!" |
| correct | "Shabash! Exactly so." / "You saw it before I said it." / "That is how a scientist thinks." | "Yesss! I knew you'd get it." / "Told you! Told Dadaji too!" / "High five!" | "Woof-yes! Fetch another!" / "Nose was right!" / "Jump for joy!" | "Correct. I checked twice." / "Pattern matched." / "One point. Noted." | "Hmmm. Well grown." / "Good thinking, good food." / "The seed knew it." | "Yay! Maa!" / "Again! Again!" / "Clap clap!" | "Right, right, right!" / "Chirp! That's it!" / "Mitthu remembers that!" |
| incorrect | "Not yet, beta. Look here once more." / "Close. Let's see what changed." / "A step, not a fall. Try with me." | "Oops. I did that too!" / "Hmm, let's look again." / "Wait, what if we…" | "Nose went the wrong way. Sniff again." / "Woof, nearly." / "Let's run back and look." | "Let me count that again with you." / "One carrot short. Check the end." / "Nearly. The pattern breaks here." | "Hmmm. In its own time." / "Try once more, gently." / "The rain comes slowly too." | "Oops. Me too." / "Again?" / "Butterfly! … sorry, again." | "Say it again, say it again." / "Mitthu whispers the clue." / "Once more, slowly." |
| encouragement | "Keep going, I am right here." / "Curiosity is the best tool." / "One more look, then we rest." | "You can do it, I saw you!" / "Race you to the answer!" / "Go go go!" | "Ball's in the air, catch it!" / "Woof! Nearly there." / "Dig a bit more." | "Two more steps, I counted." / "You're closer than before." / "Numbers like patience." | "Hmmm. Slowly, steadily." / "Breathe, then try." / "Good things grow slow." | "You can! Maa!" / "Me cheering!" / "Hop hop!" | "Tick-tock, almost!" / "Chirp, keep going!" / "Mitthu believes you!" |
| transition | "Now, let us go to the garden." / "Bring your notebook; next room." / "Mitthu, is it revision time?" | "Race you there!" / "What's next? What's next?" / "Can we see the lab now?" | "This way! Follow the tail." / "Woof, new place!" / "Sniff… it's the kitchen." | "Next topic. Page turned." / "Three steps to the library." / "Pattern of the day continues." | "Hmmm. The shed is quiet now." / "Walk with me to the pond." / "Time for the next field." | "Where? Where?" / "Me first!" / "Butterfly that way!" | "Tick-tock, revision o'clock!" / "Fly, fly, new room!" / "Chirp, follow Dadaji." |
| goodbye | "Rest well, beta. Tomorrow we find out more." / "Go and tell someone what you learnt." / "Namaste. The house is always open." | "Bye! Don't forget the assignment!" / "See you tomorrow, I'll be first!" / "Wait, one more question… okay, bye!" | "Woof-bye! Ball tomorrow." / "Nose says: come back." / "Yawn… bye." | "Logged. Goodbye." / "Count your sleep: ten hours." / "See you. Pattern resumes tomorrow." | "Hmmm. Sleep like the seeds." / "Goodbye, little one." / "The shade will wait for you." | "Bye bye! Maa!" / "Come back! Come back!" / "Sleepy… bye." | "Good night, Mitthu sleeps." / "Bye, bye, bye!" / "Tomorrow, say it again." |

Rules: a reaction never names the child's score; incorrect reactions always invite another
attempt; the audio engine never plays the same line twice in a row for the same character.

---

## 10. Mitthu's Echo – the revision mechanic

Purpose: spaced repetition that feels like a game, not a drill. Mitthu repeats; Gopu listens
and repeats; the child repeats with Gopu. Mitthu never teaches anything new.

### Triggers

| Trigger | Rule |
|---|---|
| Lesson count | After every third completed lesson in the same subject (configurable per age band: A1–A2 every 2, A3–A5 every 3). |
| End of topic | Once when the last lesson of a topic is completed, covering the topic's key clauses. |
| Mastery dip | When the assessment engine (`16-assessment.md`) marks a concept as "needs revision", the next session opens with an Echo on that concept. |
| Parent request | A parent can start "Revision with Mitthu" for any completed topic from the parent dashboard. |
| Return after absence | If the child has not opened DADU for three or more days, the first session begins with a short Echo of the last topic. |

### Format

1. Mitthu's three-note bell plays; Mitthu flies to Dadaji's shoulder ("Tick-tock, revision
   o'clock").
2. Dadaji: "Mitthu, say it again for us."
3. Mitthu repeats a **key clause** (one short sentence, under twelve words, tagged
   `echo_clause` in the lesson script) in its sing-song pattern, two times.
4. Gopu repeats the clause once, with a small exaggeration or gesture.
5. The child is invited to repeat (microphone optional; a tap on "I said it" or a drag-and-drop
   of the clause's picture cards for A1–A2; for A3–A5 a fill-the-blank of the clause).
6. Steps 3–5 repeat for up to three clauses.
7. Dadaji closes: "Shabash. Now it is in your pocket for ever."

Duration: 30–60 seconds for A0–A2, 60–90 seconds for A3–A5. Never longer; never more than
three clauses.

### Authoring rules

Every lesson script must tag one to three `echo_clause` lines. Clauses are written to be
repeatable: concrete, rhythmic, no subordinate clauses ("Plants make food from sunlight",
"Eight times seven is fifty-six", "Wash hands before you eat").

---

## 11. Guest characters

Specialists and guests (a cricketer, a scientist, a librarian, a dancer, a village farmer) may
appear in a lesson under these rules:

- Dadaji introduces them by name and relationship ("My friend Asha didi coaches cricket").
- Dadaji stays in frame and asks the guest questions on the child's behalf.
- The guest demonstrates; Dadaji explains the why.
- Dadaji closes the lesson and conducts the assessment.
- Guests never appear in two consecutive lessons, and never in the first lesson of a subject.
- Guests are original characters; they are not real public figures.

---

## 12. Artist "do not" list and review checklist

Do not:

- Copy, trace or reference the characters, costumes, colour schemes or poses of Khan Academy
  Kids, Lingokids, ABCmouse, Toca Boca, SplashLearn, Prodigy, Epic, ScratchJr, Tynker,
  Minecraft or any other product.
- Use stock vector characters or AI-generated characters without a redesign pass and legal
  clearance.
- Add hard black outlines, flat corporate icon style or photographic textures.
- Draw religious symbols on the characters' bodies or clothing.
- Give Gopu a gendered uniform, jewellery or hairstyle that fixes a gender.
- Show any character using a phone or watching a screen.

Review checklist (every new asset):

1. Proportions match section 1.2 (measure heads).
2. All colours are palette tokens or tints/shades of them.
3. Signature silhouette is readable at 48 px.
4. Spectacles, cowlick, folded ear, garland, tuft, slate head: the identifying props are present.
5. The expression is one of the named expressions, or a new one has been added to this file.
6. Mouth shape matches a viseme in `14-voice-audio.md` if the frame is a talk frame.
7. No text, logos or brand marks in the asset.
8. The asset has been exported at 1x, 2x and 3x (raster) or as a Rive/SVG source.
9. The character is doing something with a learning purpose, or an approved reaction.
10. Filed under the naming convention in `22-assets.md`.
