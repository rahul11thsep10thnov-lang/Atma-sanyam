# 14 – Voice and audio architecture

How DADU speaks, sings and listens. Character definitions are in `02-character-bible.md`;
languages and the `audio` module name are in `00-canon.md`; the CMS workflow that approves
audio is in `20-admin-cms.md`; the caching strategy sits inside the offline design of
`01-product-architecture.md`.

---

## 1. Goals

1. Every character sounds the same in every lesson, story, test and assignment, in every
   language.
2. Dialogue plays in sequence with the right emotion, the right mouth shapes and the right
   pauses, at the speed the parent chose.
3. Music never fights speech.
4. Everything the child hears today is still playable on a train tomorrow with no network.
5. Nothing is recorded from the child's microphone without explicit, revocable parental
   consent, and nothing is ever uploaded.

---

## 2. Voice profiles

### 2.1 Per character

| Character | Pitch | Pace at Normal (words/min) | Timbre notes | Signature tics |
|---|---|---|---|---|
| Dadaji | Low-mid male, elderly | 110 | Warm, slightly husky, soft consonants, rises on questions | Chuckle "heh-heh", "hmm" before a thought |
| Gopu | High child, ungendered | 150 | Bright, breathy, quick | Giggle, "wait wait wait" |
| Kim | Mid, energetic | 140 | Breathy, bouncy | Bark layered under first syllable |
| Molly | Light, clear | 135 | Crisp consonants, precise | Tiny "ting" when a pattern is spotted |
| Gauri | Low female, resonant | 95 | Slow, calm, long vowels | Opening "Hmmm" |
| Dhanu | Very high, small | 100 | Squeaky, simple | "Maa!" closer, giggle-snort |
| Mitthu | Bright, nasal, musical | 120 | Parrot timbre, repetition with rising melody | Whistle closer, three-note bell |

### 2.2 Per language

Each character needs a voice in each of the 14 languages, giving 98 character-language
voices. Two strategies are compared.

| | Human voice actors | Licensed neural TTS with custom voices |
|---|---|---|
| Quality and warmth | Highest; essential for Dadaji's character | Good for narration; weaker for humour and emotion |
| Cost per language per character | High (studio, actor, direction) | Low per line after voice set-up |
| Turnaround for new content | Days to weeks | Minutes |
| Consistency across years | Depends on actor availability | Perfect |
| Children's data risk | None | None if generated server-side at build time, never on device from child input |
| Pronunciation of names and regional words | Excellent | Needs lexicon work per language |

**Recommendation (hybrid):**

- Dadaji, Gopu and Mitthu: human voice actors in all 14 languages for the core library
  (greetings, reactions, story narration, lesson introductions), because these three carry
  the emotional identity of the product. Record a reference set of 600 lines per language.
- Kim, Molly, Gauri, Dhanu: human actors for English and Hindi; licensed custom neural
  voices trained from a short human session for the other twelve languages, reviewed by a
  native speaker before approval.
- Long-tail content (new lessons, quiz feedback, assignment steps): licensed neural voices
  cloned, with consent and a written licence, from each actor, generated at content-build
  time on the server and stored as ordinary audio files. The device never calls a TTS API.
- Device-side TTS (the operating system's engine) is used only as an accessibility fallback
  for text the content team has not yet voiced, labelled as such in the interface.

Verification steps for every voice line before it reaches the approval step:

1. Automatic: loudness normalised to -16 LUFS integrated, true peak -1.5 dBTP, silence
   trimmed to 80 ms head and 150 ms tail, sample rate 48 kHz source.
2. Automatic: transcript alignment; a line is rejected if alignment confidence is below 0.9.
3. Human: native speaker checks pronunciation, tone and age-appropriateness and listens with
   the animation.
4. Human: the audio review step in the CMS workflow signs off (section 9).

---

## 3. Dialogue sequencing engine

The `audio` module on the device plays **dialogue scripts**: ordered lists of cues produced by
the CMS and shipped inside content packs.

### 3.1 Script format

```json
{
  "scriptId": "academic.science.plants.02.intro",
  "lessonId": "academic.science.plants.02",
  "language": "hi",
  "ageBand": "A2",
  "cues": [
    {
      "id": "c1",
      "character": "dadaji",
      "emotion": "explaining",
      "text": "बेटा, यह पत्ता देखो। यह हरा क्यों है?",
      "audio": "audio/hi/dadaji/academic.science.plants.02/c1.opus",
      "durationMs": 3400,
      "visemes": "audio/hi/dadaji/academic.science.plants.02/c1.vis.json",
      "animation": "point_with_stick",
      "camera": "focus:object:house.garden.tulsi_plant",
      "pauseAfterMs": 600
    },
    {
      "id": "c2",
      "character": "gopu",
      "emotion": "wide_eyed",
      "text": "क्योंकि उसने हरा रंग खाया?",
      "audio": "audio/hi/gopu/academic.science.plants.02/c2.opus",
      "durationMs": 2100,
      "visemes": "audio/hi/gopu/academic.science.plants.02/c2.vis.json",
      "animation": "talk",
      "pauseAfterMs": 400,
      "reactions": [{ "character": "molly", "expression": "giggle_behind_paw", "atMs": 1500 }]
    },
    {
      "id": "c3",
      "character": "dadaji",
      "emotion": "big_laugh",
      "text": "हा हा! नहीं बेटा। पत्ते में क्लोरोफिल होता है।",
      "audio": "audio/hi/dadaji/academic.science.plants.02/c3.opus",
      "durationMs": 3900,
      "echoClause": true,
      "animation": "talk",
      "subtitleEmphasis": ["क्लोरोफिल"],
      "pauseAfterMs": 800,
      "waitForTap": false
    }
  ],
  "music": { "track": "garden_morning", "duckDb": -14 },
  "ambience": ["birds_morning"]
}
```

Fields: `emotion` must be an expression from the character's sheet; `animation` must be a
state from its list; `echoClause` marks lines Mitthu may repeat (`02-character-bible.md`,
section 10); `waitForTap` holds the sequence until the child taps (used in Little mode after
questions); `reactions` fire silent expressions on other characters mid-line.

### 3.2 Timing

- Cues play strictly in order. A cue's duration comes from the audio file; `pauseAfterMs` is
  multiplied by the narration-speed pause factor (section 5).
- A cue can be interrupted only by the child (tap to skip, allowed from A3 upward and always
  for parents) or by a screen-time limit.
- Replay, "say it simpler" and "say it more" each map to alternative scripts tagged
  `variant: simpler | advanced` on the same `scriptId`; the engine swaps scripts, not cues.
- Subtitles are rendered from `text`, highlighted word by word using the viseme timeline.

### 3.3 Lip-sync

The chosen character runtime (Rive, see `01-product-architecture.md`) exposes a numeric input
`mouth` per character. Each audio line ships with a viseme track generated at build time by
forced alignment, reduced to eight visemes:

| Index | Viseme | Sounds (approximate) |
|---|---|---|
| 0 | rest | silence |
| 1 | aa | a, aa, ai |
| 2 | ee | i, ee, e |
| 3 | oo | u, oo, o |
| 4 | mb | m, b, p |
| 5 | fv | f, v, w |
| 6 | th | t, d, th, dh, n, l, s, sh, r |
| 7 | kg | k, g, kh, gh, ch, j, h |

Tracks are JSON arrays of `[timeMs, visemeIndex]` sampled every 50 ms; the engine linearly
interpolates between keyframes. Animals use a reduced four-viseme map (rest, open, half, mb).
Where alignment fails for a language, the fallback is amplitude-driven mouth opening, which is
always available because it is computed from the audio buffer.

---

## 4. Audio mixing and ducking

Five buses: `dialogue`, `music`, `ambience`, `sfx`, `ui`.

| Rule | Value |
|---|---|
| When a dialogue cue starts | Music ducks to the script's `duckDb` (default -14 dB) over 250 ms; ambience ducks -6 dB |
| When dialogue ends | Music returns over 900 ms |
| Two characters at once | Never; the sequencer serialises. Reactions are silent or short sfx |
| Sfx during dialogue | Allowed at -8 dB relative to dialogue |
| Bedtime mode | Music at -10 dB from the user setting, no sfx, Dadaji only, slower pause factor 1.5 |
| Lap mode (A0) | Dialogue and music both at the user setting; sfx limited to gentle sounds, no sudden peaks above -6 dBTP |
| Screen-time warning | `ui` bus chime at user setting, music ducks -14 dB for the warning |

Independent volume sliders exist for the five buses (sfx and ui share one slider in the
interface), plus a master mute that stops every bus and shows subtitles automatically.

---

## 5. Narration and lesson speed

Parents set narration speed separately from lesson progression and animation speed.

| Setting | Playback rate (pitch-preserved) | Pause factor | Word-highlight lag |
|---|---|---|---|
| Very Slow | 0.75 | 1.6 | 0 |
| Slow | 0.88 | 1.3 | 0 |
| Normal | 1.00 | 1.0 | 0 |
| Fast | 1.15 | 0.8 | 0 |
| Very Fast | 1.30 | 0.6 | 0 |

Rates above 1.0 are limited to A3 and above. Pitch preservation is required; a device that
cannot time-stretch without pitch change falls back to Normal and a longer pause factor.
Lesson progression speed changes how many examples and activities a lesson shows; animation
speed scales non-dialogue animation durations between 0.7 and 1.3.

---

## 6. Codec, caching and offline packs

| Item | Decision |
|---|---|
| Codec | Opus in an Ogg container, mono, 24 kbps for dialogue, 48 kbps for music; AAC fallback at matching bitrates only where Opus is unavailable |
| Source archive | 48 kHz 24-bit WAV kept in object storage; never shipped |
| Average dialogue line | 3 s, about 9 KB |
| Typical lesson (40 lines, one language) | about 360 KB audio plus 60 KB visemes |
| Story (15 min narration) | about 2.7 MB |
| Music track (3 min loop) | about 1.1 MB |
| Language pack for a section (about 120 lessons) | 45–55 MB |

Packs: `audio-core-<lang>` (reactions, greetings, system prompts, 4 MB), `audio-<section>-<lang>`,
`audio-stories-<collection>-<lang>`, `music-base` (12 tracks, 13 MB), `ambience-base` (6 MB).
The app downloads `audio-core` for the chosen languages at first run and lesson packs on
demand or by parent-managed download. Cache limit defaults to 1.5 GB with least-recently-used
eviction; completed-lesson audio is kept 30 days unless pinned. Integrity is checked by
content hash per file; a failed check re-downloads the file, never plays it.

---

## 7. Background music and ambience catalogue

All music is original and commissioned (work-for-hire with full rights) or licensed under a
perpetual, worldwide, all-media licence recorded in the CMS against each track. No
Creative Commons non-commercial tracks, no library tracks with per-download attribution
obligations the interface cannot show.

| Track key | Description | Default use |
|---|---|---|
| `flute_morning` | Bansuri, slow, Raag Bhairav mood | Living room, morning lessons |
| `flute_evening` | Bansuri, Raag Yaman mood | Veranda, evening |
| `piano_soft` | Gentle piano, major key | Dashboard, art room |
| `santoor_rain` | Santoor with soft rain | Monsoon lessons, reading |
| `sitar_calm` | Slow alaap sitar | Library, study |
| `veena_still` | Veena, slow | Temple courtyard, music room |
| `guitar_play` | Acoustic guitar, playful | Playroom, sports |
| `ambient_cloud` | Pads, no melody | Tests, concentration |
| `birds_morning` | Ambience: Indian birds | Garden |
| `garden_day` | Ambience: wind, leaves, bees | Private garden, public garden |
| `rain_steady` | Ambience: rain on tin roof | Bedroom, bedtime |
| `night_calm` | Ambience: crickets, distant owl | Bedtime mode |

Parents can choose the instrument family or ambience; children in Explorer mode can pick from
the list in the music room as an unlockable reward.

---

## 8. Accessibility

- Captions: every dialogue cue has text; captions are on by default in Explorer mode and
  available in Little mode; caption font follows the language font and the dyslexia option.
- Text-to-speech fallback: operating-system TTS reads any on-screen text that has no
  recorded audio, marked with a small "read aloud" icon.
- Audio descriptions: scenes carry a short `altText` read by Dadaji's voice on request.
- Reduced audio: a "quiet mode" lowers music to -20 dB and removes sudden sfx for children
  sensitive to sound.
- Mono mixdown option for single-ear listening.

---

## 9. Audio review in the CMS workflow

The sixth workflow step (`20-admin-cms.md`) is "Audio review". An item cannot be approved
until every cue in every enabled language has: an audio file, a viseme track, a loudness
report within tolerance, a native-speaker sign-off and a listening check with the animation.
The review screen plays the script with the character runtime and lets the reviewer flag a
cue, which returns the item to the voice stage with the cue id.

---

## 10. Microphone use

The optional microphone is used only inside Mitthu's Echo and pronunciation practice, only
when a parent has enabled it, and only on device: the audio is scored locally for presence of
speech and approximate duration, then discarded. No recording is stored or uploaded. The
interface shows a visible indicator while the microphone is live and works fully without it
("I said it" tap).

---

## 11. Asset naming convention

```
audio/<lang>/<character>/<contentId>/<cueId>.opus          dialogue
audio/<lang>/<character>/<contentId>/<cueId>.vis.json      viseme track
audio/<lang>/<character>/reactions/<category>/<nn>.opus    reaction pool
audio/<lang>/system/<key>.opus                              interface prompts
music/<trackKey>.opus                                       music loops
ambience/<trackKey>.opus                                    ambience loops
sfx/<character>/<name>.opus                                 character sfx
sfx/ui/<name>.opus                                          interface sfx
sfx/object/<location.object>/<name>.opus                    object sfx
```

`<lang>` is the two-letter code from `00-canon.md`; `<character>` is the character key;
`<contentId>` is the lesson, story or assignment id. Every file is immutable once published;
a change creates a new content version and new file paths.
