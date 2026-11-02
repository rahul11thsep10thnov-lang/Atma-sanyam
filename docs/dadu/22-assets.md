# DADU – Asset requirements

Everything the product needs that is not code: characters, environments, object sprites, the UI
kit, fonts, audio, story illustrations, lesson media, localisation strings and video. Follows
`00-canon.md` for names, locations, sections and languages. Phases refer to `21-roadmap.md`.
Costs for producing these assets are in `23-costs.md`.

The guiding constraint is the **budget Android target** from `01-product-architecture.md`:
2 GB RAM, Android 10, a 720 × 1600 or 1080 × 2400 screen. Every asset is authored at a high
resolution once and exported to the budgets below. Nothing is shipped at authoring size.

---

## 1. Global rules

| Rule | Detail |
|---|---|
| Originality | Every character, environment, object, sound and tune is made for DADU. No art, rig, sound or text from any other product. Reference boards are for mood only and are never traced. |
| Licensing | Every asset carries a `licence` record in the CMS (`20-admin-cms.md`): author, date, licence type (`work_for_hire`, `ofl`, `cc0`, `cc_by`, `licensed`), source URL where applicable, attribution text if required. No asset without a record reaches a content pack. |
| Naming | `<domain>/<location-or-owner>/<slug>__<variant>@<scale>.<ext>`, lower-case, underscores inside slugs, double underscore before variants. Examples: `char/dadaji/idle__blink.riv`, `env/house.lab/bg_mid__night@2x.webp`, `obj/house.living_room.telescope/state_highlight@2x.webp`, `vo/hi/dadaji/academic.math.counting.03/step02.opus`. |
| Scale suffixes | `@1x` (720-class phones), `@2x` (1080-class), `@3x` (tablets, authored only for hero scenes). The app picks by device pixel ratio. |
| Formats | Raster: WebP (lossy q80 for backgrounds, lossless for UI). Vector: SVG (UI, icons) and Rive (`.riv`) for characters and animated objects. Audio: Opus in Ogg at 48 kbps mono for voice, 96 kbps stereo for music. Video: H.264 MP4 720p, only where animation cannot do the job. |
| Authoring size | Environments at 4096 × 2304 px; characters at 2048 px tall; objects at 1024 px square; icons at 128 px grid. |
| Review | Nothing is "done" until it passes the QA checklist in section 13 and the art consistency checklist in `02-character-bible.md`. |

---

## 2. Character art

Seven permanent characters: Dadaji, Gopu, Kim, Molly, Gauri (name proposed, pending approval),
Dhanu, Mitthu. Specifications live in `02-character-bible.md`; this section counts the
deliverables.

### 2.1 Per character

| Deliverable | Quantity per character | Format | Notes |
|---|---|---|---|
| Model sheet (turnaround) | 1 sheet, 5 views (front, 3/4, side, back, 3/4 back) | PNG + source (.procreate/.psd/.clip) | Height in heads, colour swatches by palette token, prop callouts |
| Expression sheet | 12 expressions (canon list) | PNG + source | Used as rig reference and as static fallbacks |
| Rive rig | 1 rig file | `.riv` | Bones, mesh deformation, state machine with inputs `state`, `emotion`, `talk`, `lookX`, `lookY` |
| Animation states | 14 canon states + character-specific | inside `.riv` | idle, walk, run, sit, laugh, talk, think, clap, dance, surprised, correct, incorrect, sleepy, wave |
| Character-specific states | 3–6 | inside `.riv` | e.g. Dadaji `adjust_spectacles`, `point`, `read`; Kim `tail_wag`, `dig`, `fetch`; Molly `write_note`, `ear_flip`; Mitthu `echo_sway`, `fly_short`, `perch` |
| Lip-sync visemes | 9 mouth shapes (rest, A, E, I, O, U, M, F, L) | inside `.riv` | Driven by the viseme track in `14-voice-audio.md` |
| Static poses (fallback) | 8 | WebP @1x/@2x | For reduced-motion mode, thumbnails, parent dashboard |
| Costume variants | 4 | `.riv` skins | Festival (Diwali/Pongal/Onam/Eid-neutral "festival" set), rain, winter, sports |
| Portrait icon | 1 | SVG | Dialogue bubble avatar, 96 px round |

### 2.2 Totals for characters

| Item | Count |
|---|---|
| Model sheets | 7 |
| Expression drawings | 84 |
| Rive rigs | 7 |
| Animation states | 98 canon + about 30 specific = ~128 |
| Static fallback poses | 56 |
| Costume skins | 28 |
| Portrait icons | 7 |

Guest characters (librarian, cricketer, scientist, musician, nurse, farmer, astronaut, and up to
ten regional storytellers for `08-temple-courtyard.md` and `13-story-library.md`) use a lighter
spec: model sheet, 6 expressions, 6 animation states, 1 rig each. Plan 16 guests.

Production method: in-house lead character artist for all seven permanent characters (consistency
is the whole point); contracted riggers for Rive; guest characters contracted after the style is
locked. Generative tools may be used for mood boards only, never for shipped character art.

Phase: model sheets and rigs for all seven in Phase 1; costume skins in Phase 8; guests from
Phase 5 onwards.

---

## 3. Environments

Each environment is a layered scene: back (sky or wall), mid (architecture, furniture), front
(foreground objects for parallax), plus an overlay layer for time of day and a season layer where
relevant (`03-miniverse-map.md`). Each layer is exported separately.

### 3.1 List

| Environment | Location ID | Layers | Time-of-day variants | Season variants | Notes |
|---|---|---|---|---|---|
| Miniverse overview map | `miniverse` | 4 + minimap | 3 (day, dusk, night) | 4 | The world as seen zoomed out; reserved animal-shelter plots drawn as fenced grass |
| Veranda | `house.veranda` | 3 | 3 | 2 | Swing, Mitthu's perch |
| Living room | `house.living_room` | 3 | 3 | 1 | Main teaching room |
| Study and library | `house.study` | 3 | 3 | 1 | |
| Science laboratory | `house.lab` | 3 | 2 | 1 | |
| Music room | `house.music_room` | 3 | 2 | 1 | |
| Art room | `house.art_room` | 3 | 2 | 1 | |
| Kitchen | `house.kitchen` | 3 | 2 | 1 | |
| Dining room | `house.dining` | 3 | 2 | 1 | |
| Bedroom | `house.bedroom` | 3 | 3 | 1 | Night variant is the bedtime-story set |
| Playroom | `house.playroom` | 3 | 2 | 1 | |
| Bathroom | `house.bathroom` | 3 | 1 | 1 | |
| Cow shed and pet-care | `house.cowshed` | 3 | 3 | 2 | |
| Storage and gardening | `house.store` | 3 | 1 | 1 | |
| Private garden | `house.garden` | 5 (adds plant-bed layer and sky layer) | 3 | 4 | Plus growth-stage sprites, section 4.2 |
| Public garden | `town.public_garden` | 4 | 3 | 4 | |
| Public library | `town.library` | 3 (exterior) + 3 (interior) | 2 | 1 | Twelve sections drawn as shelf clusters |
| Temple courtyard | `town.temple` | 3 (courtyard) + 10 shrine alcoves + 1 regional gallery + 1 shared-heritage wing | 2 | 1 | Respectful, see `08-temple-courtyard.md` |
| Excursion: museum | `town.excursions.museum` | 3 | 1 | 1 | |
| Excursion: forest | `town.excursions.forest` | 4 | 2 | 2 | |
| Excursion: mountains | `town.excursions.mountains` | 4 | 2 | 2 | Mitthu's home region |
| Excursion: ocean | `town.excursions.ocean` | 4 | 2 | 1 | Surface and underwater |
| Excursion: monuments | `town.excursions.monuments` | 3 × 6 monuments | 1 | 1 | Taj Mahal, Qutub Minar, Hampi, Konark, Sanchi, Meenakshi temple exterior |
| Excursion: archaeological site | `town.excursions.archaeology` | 3 | 1 | 1 | Harappan-style dig site |
| Excursion: space | `town.excursions.space` | 4 | 1 | 1 | Solar system, ISS-style station, Moon surface |

### 3.2 Totals for environments

| Item | Count |
|---|---|
| Distinct environments | 31 (including six monuments and twelve temple alcoves and wings counted as sub-scenes) |
| Base layer paintings | ~115 |
| Time-of-day overlays | ~55 |
| Season layers | ~30 |
| Exported files (@1x, @2x) | ~400 |

Format and budget: WebP q80, `@1x` 1440 × 810 per layer, `@2x` 2880 × 1620. Target under 350 KB
per layer at `@2x`, under 1.2 MB per complete scene at `@2x`. Scenes are tile-free single paintings
to keep draw calls low on budget devices; parallax is done by layer offset only.

Production: contracted background painters working from in-house layout sketches and the floor
plans in `04-house-floor-plan.md`, `05-room-designs.md`, `06-garden-designs.md`. Generative
assistance is permitted for under-painting and texture passes with a mandatory human finish and a
human-drawn layout; the final file is always edited by the artist. Phase: Miniverse map, veranda,
living room, garden in Phase 1; remaining rooms Phase 2; town locations Phase 2 and 6; excursions
Phase 5 and 6.

---

## 4. Interactive object sprites

### 4.1 Count

`10-interactive-object-map.md` defines the object database. Counting from the canon locations:

| Location group | Objects |
|---|---|
| Veranda, living room, study | 26 |
| Lab, music room, art room | 30 |
| Kitchen, dining, bedroom, bathroom, playroom | 34 |
| Cow shed, store | 14 |
| Private garden | 28 |
| Public garden | 18 |
| Public library | 12 |
| Temple courtyard | 14 |
| Excursions | 24 |
| **Total** | **200** (plan for 150–180 at launch, 200 with Phase 6 excursions) |

### 4.2 Per object

| Deliverable | Quantity | Format |
|---|---|---|
| States | 3 minimum: `idle`, `highlight` (glow/wiggle hint), `active` (in use) | WebP @1x/@2x or Rive for animated objects |
| Animation | 1 short Rive loop for about 40 percent of objects (telescope turning, piano keys, kettle steam) | `.riv` |
| Completion marker | shared sprite (a small saffron star ribbon) | SVG |
| Thumbnail | 1 for the parent dashboard and achievements | WebP 256 px |

Growth-stage sprites for the private garden are a special set: 40 plant species × 6 growth stages
× 2 health states = 480 sprites, plus 12 seasonal decoration sets. Budget 24 KB per sprite.

Totals: ~600 object state sprites, ~80 object Rive loops, ~480 plant sprites, ~200 thumbnails.

Production: in-house for the first 40 (style lock), then contracted prop artists. Phase: Phase 2
for house objects, Phase 5 and 6 for town and excursion objects, garden plant stages in Phase 2.

---

## 5. UI kit

| Item | Quantity | Format | Notes |
|---|---|---|---|
| Section icons (hand-drawn style) | 8 sections + 4 companions (stories, tests, achievements, parents) = 12, each in 3 sizes | SVG | Motifs from the canon table |
| Navigation tab illustrations | 12 painterly tiles for the illustrated tabs | WebP + SVG frame | Little and Explorer sizes |
| System icons | ~140 (play, pause, repeat, slower, simpler, advanced, back, home, map, settings, volume, captions, parent gate, download, offline, and so on) | SVG, 24 px grid, 2 px stroke | One family, no mixing |
| Buttons | 5 variants (primary, secondary, tertiary, destructive-calm, Little jumbo) × 4 states | Figma components + SVG decorations | 9-slice backgrounds painted once |
| Cards and panels | 8 frames (paper card, chalk slate, leaf card, lab card, story page, certificate, speech bubble, parent card) | SVG 9-slice | |
| Stars, coins, badges | 1 star (3 sizes), 1 coin, 1 gem, 120 badge designs (`15-real-world-assignments.md`, `16-assessment.md`, gamification) | SVG + WebP | Badges on a shared frame with a painted centre |
| Certificates | 8 templates | SVG with text slots per script | Rendered to PDF on the device for parents |
| Progress and mastery widgets | 6 (garden-growth meter, star jar, concept flower, weekly path, streak-free calendar, subject petals) | SVG + Rive | No streak-loss mechanics |
| Decoration catalogue (house and garden rewards) | 150 items | WebP @1x/@2x | Lanterns, rugs, flowerpots, instruments, art supplies, books, character accessories |
| Splash, app icon, store listing art | 1 icon set (adaptive Android, iOS), 1 splash, 8 store screenshots per language in 2 device sizes (14 languages = 224 screenshots), 1 feature graphic | PNG | Replaces the Tame icon set in `assets/` |
| Empty states and error illustrations | 16 | WebP | Dadaji-centred, calm |

Totals: ~12 section tiles, ~140 system icons, ~120 badges, ~150 decorations, ~250 store and
marketing images.

Production: in-house UI designer, with the icon set drawn by the lead character artist for
consistency. Phase 1 for the core kit; badges and decorations grow through Phases 8 and 10.

---

## 6. Fonts

All fonts are under the SIL Open Font Licence, bundled in the app, no runtime download.

| Script | Heading (cartoon) | Body | Dyslexia-friendly body | Size budget |
|---|---|---|---|---|
| Latin (en) | Baloo 2 | Nunito | Atkinson Hyperlegible, Lexend | ~450 KB |
| Devanagari (hi, mr, sa) | Baloo 2 | Noto Sans Devanagari | Noto Sans Devanagari with wider tracking | ~600 KB |
| Bengali, Assamese (bn, as) | Baloo Da 2 | Noto Sans Bengali | same with tracking | ~500 KB |
| Odia (or) | Baloo Bhaina 2 | Noto Sans Oriya | same | ~400 KB |
| Gujarati (gu) | Baloo Bhai 2 | Noto Sans Gujarati | same | ~350 KB |
| Gurmukhi (pa) | Baloo Paaji 2 | Noto Sans Gurmukhi | same | ~300 KB |
| Tamil (ta) | Baloo Thambi 2 | Noto Sans Tamil | same | ~350 KB |
| Telugu (te) | Baloo Tammudu 2 | Noto Sans Telugu | same | ~450 KB |
| Kannada (kn) | Baloo Tamma 2 | Noto Sans Kannada | same | ~450 KB |
| Malayalam (ml) | Baloo Chettan 2 | Noto Sans Malayalam | same | ~400 KB |
| Perso-Arabic (ur, RTL) | Baloo Bhaijaan 2 | Noto Nastaliq Urdu (body), Noto Sans Arabic (UI) | Noto Sans Arabic | ~900 KB |

Deliverables: 11 heading families, 11 body families, 2 accessibility families, each subset to the
glyphs the app uses (the `tools/` directory gains a font-subset script), at 2 weights for headings
and 3 for body. Total bundled font budget: under 6 MB; language packs can carry non-default fonts
on demand to keep the base install small. Phase 3.

---

## 7. Audio

Specification and engine in `14-voice-audio.md`. This section counts.

### 7.1 Character voice lines

A "line" is one recorded sentence or short utterance. Counts are per language; the launch
languages are 14, but recording is staged.

| Content | Lines per language | Notes |
|---|---|---|
| Reaction system (greeting, correct, incorrect, encouragement, transition, goodbye, 3 samples each, 7 characters) | ~130 | Recorded once per language in Phase 3 |
| Object introductions (200 objects × 3 age variants) | ~600 | Dadaji mostly, animals as second voice |
| Lessons: 8 sections, launch target 480 lessons × ~22 lines × 2 register variants (Little, Explorer) | ~21,000 | The bulk of the recording effort |
| Stories: 60 unlicensed launch stories × ~45 lines × 2 age adaptations | ~5,400 | Dadaji narrates, characters interject |
| Assessments: Dadaji as quiz master, ~2,400 items × 2 lines | ~4,800 | Question read-aloud plus feedback |
| Real-world assignments: 60 × 10 lines | ~600 | |
| Mitthu's Echo: generated from lesson key clauses, ~3 per lesson | ~1,440 | Recorded by Mitthu's voice, then Gopu's repeat |
| Parent dashboard and system prompts | ~250 | Adult register, neutral narrator or Dadaji |
| **Total per language** | **~34,000 lines, ~45 hours of finished audio** | |

Staging by phase and language:

| Phase | Languages recorded | Lines |
|---|---|---|
| 3 | English, Hindi | reaction system, object introductions, system prompts (~1,000 each) |
| 4 | English, Hindi | Academic lessons and assessments (~9,000 each) |
| 5–6 | English, Hindi | remaining sections and stories (~24,000 each) |
| 7–8 | Tamil, Telugu, Bengali, Marathi | full set (~34,000 each) |
| 10 and post-launch | Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Sanskrit | full set, prioritised by demand |

Format: Opus 48 kbps mono, 48 kHz source recorded at 24-bit WAV and archived. Average line 4 s,
24 KB. A full language pack of voice is ~800 MB, so voice is always delivered in per-section
packs (`01-product-architecture.md`, offline strategy), never in the base install. The base
install carries only the reaction system and the first-run content (~15 MB of voice).

Production: human voice actors for all seven characters in English and Hindi (one actor per
character; Dadaji and Mitthu may share an actor with different processing, but Gopu must be a
child or a convincing adult child-voice specialist). For the remaining languages,
`14-voice-audio.md` recommends licensed neural TTS with a per-language native proofreader
listening to every line, and human actors for Dadaji and Gopu once a language passes 10 percent
of active children. Lip-sync visemes are generated automatically from the recording.

### 7.2 Music

| Set | Tracks | Length | Format |
|---|---|---|---|
| Instrumental beds (flute, piano, santoor, sitar, veena, guitar, ambient) | 7 families × 3 tracks | 3–4 min loops | Opus 96 kbps stereo |
| Nature beds (birds, garden, rain, night-time relaxation) | 4 × 2 | 5 min loops | Opus 96 kbps |
| Section stingers (enter a section, lesson start, lesson complete) | 8 × 3 | 2–6 s | Opus |
| Bedtime lullabies | 6 (two per launch language group) | 2–3 min | Opus |
| Bhajans and devotional pieces for the temple courtyard | 12 original or public-domain compositions, newly recorded | 2–4 min | Opus |
| Title and story-corner themes | 4 | 30–60 s | Opus |
| **Total** | **~75 tracks, ~4 hours** | | |

All music is original work-for-hire or public-domain compositions newly recorded; no stock loops
without a perpetual, worldwide, app-distribution licence on file. Phase 3 for the first 20 tracks.

### 7.3 Sound effects

| Group | Count |
|---|---|
| Character SFX (Kim's bark and bell, Molly's pencil scratch, Gauri's bell and "hmmm", Dhanu's hop, Mitthu's chirps and wing flutter, Dadaji's chuckle and chappal steps, Gopu's giggle and sneakers) | ~70 |
| UI (tap, confirm, back, star earned, coin, badge, page turn, drawer, parent gate) | ~40 |
| Objects (telescope turn, piano, tabla strokes, kettle, water, seeds, spade, carrom strike, book) | ~200 |
| Environment ambience (room tone per room, garden, library hush, temple bells at a distance, excursions) | ~40 |
| Assessment feedback (gentle correct, gentle "try again", timer-free transitions) | ~12 |
| **Total** | **~360** |

Opus 48 kbps mono, under 60 KB each. Original recordings or CC0 with records kept. Phase 2 for
objects, Phase 3 for the rest.

---

## 8. Story illustrations

Per `13-story-library.md`, 60 launch stories need no licensing; up to 100 more follow rights
clearance.

| Deliverable | Per story | Format |
|---|---|---|
| Key illustrations (one per scene) | 8 for Little adaptation, 10 for Explorer | WebP @1x/@2x, 1440 × 900 |
| Animated panels (parallax or Rive) | 4 | `.riv` or layered WebP |
| Cover | 1 | WebP 600 × 800 |
| Character cameo frames (Gopu and animals in the story) | 3 | layered WebP |
| Vocabulary cards | 6 | SVG frame + WebP |

Totals for launch: 60 stories × ~22 pieces = ~1,300 illustrations and ~240 animated panels.
Budget per story under 6 MB at `@2x`. Contracted illustrators under the style lead; generative
under-painting permitted with human finish and full human composition. Phase 6.

---

## 9. Lesson media

| Item | Launch quantity | Notes |
|---|---|---|
| Lesson hero illustrations | 480 lessons × 1 | WebP |
| Concept diagrams (labelled, per language via text slots) | ~1,200 | SVG preferred so labels localise |
| Activity sprites (counters, letters, shapes, coins, fraction pieces, circuit parts, musical notes, yoga poses, sports movements) | ~900 | SVG or WebP |
| Animated demonstrations (experiments, dance steps, sports technique, instrument fingering) | ~180 Rive | `.riv` under 300 KB each |
| Virtual lab kits (magnetism, circuits, floating and sinking, plant cell, solar system, simple machines, sound waves, colour mixing) | 8 kits × ~25 pieces | Rive + SVG |
| Maps (India states, world continents, regional traditions) | 6 base maps + 40 overlays | SVG |
| Photo-real references (real animals, plants, monuments, scientists) | ~500 | WebP, licensed CC BY or CC0 with attribution screen; the existing `ingest:wikimedia` pipeline in `backend/` is reused |

Phase 4 for academic media, Phase 5 for the rest. SVG everywhere text appears so the fourteen
languages do not multiply the raster count.

---

## 10. Localisation strings

| Group | Keys at launch | Words (English) | Notes |
|---|---|---|---|
| UI, settings, parent dashboard, errors | ~1,600 | ~9,000 | Built on the existing `src/i18n` structure |
| Object introductions and reaction scripts | ~1,300 | ~15,000 | |
| Lessons (text of every step, Little and Explorer) | ~21,000 | ~180,000 | |
| Assessments | ~7,000 | ~60,000 | |
| Stories | ~5,400 | ~70,000 | |
| Real-world assignments | ~900 | ~12,000 | |
| Temple and cultural courtyard | ~1,500 | ~25,000 | Needs sensitivity review per language |
| Store listing and legal | ~200 | ~6,000 | |
| **Total per language** | **~39,000 keys** | **~377,000 words** | |

Across 14 languages that is about 5.3 million translated words over the whole roadmap, which is
why `21-roadmap.md` stages languages and `23-costs.md` treats translation as a top cost driver.
Each language has a professional translator and a separate proofreader; Urdu needs RTL review of
every screen. Strings ship as versioned JSON in language packs, not in the binary, except English
and Hindi.

---

## 11. Video

Video is the exception, not the rule. Rive and layered scenes handle almost everything.

| Item | Count | Notes |
|---|---|---|
| Parent onboarding and consent explainer | 1 per language (voice-over swap) | 90 s, H.264 720p, ~12 MB |
| Store preview videos | 2 per language group | 30 s |
| Sports and dance technique references (real demonstrators, child-safe, permission on file) | ~40 | 15–40 s, streamed only, never in packs |
| Excursion establishing shots (real-world footage of monuments, forests, oceans, licensed) | ~24 | 10–20 s, streamed |

Phase 5 for technique videos, Phase 9 for parent explainers, Phase 10 for store previews.

---

## 12. Total asset count

| Category | Count at launch | Count by end of roadmap |
|---|---|---|
| Character model and expression sheets | 91 | ~190 with guests |
| Rive character rigs | 7 | 23 |
| Animation states | ~128 | ~230 |
| Environment layer paintings (with variants) | ~140 | ~200 |
| Exported environment files | ~280 | ~400 |
| Object state sprites | ~450 | ~600 |
| Object Rive loops | ~60 | ~80 |
| Plant growth sprites | 480 | 480 |
| UI icons, tiles, frames | ~300 | ~320 |
| Badges and decorations | ~150 | ~270 |
| Store and marketing images | ~250 | ~250 |
| Font families (subset) | 24 | 24 |
| Voice lines (English + Hindi) | ~68,000 | ~476,000 across 14 languages |
| Music tracks | ~40 | ~75 |
| Sound effects | ~360 | ~360 |
| Story illustrations and panels | ~1,540 | ~4,100 |
| Lesson media pieces | ~3,200 | ~5,000 |
| Localisation keys | ~39,000 × 2 languages | ~39,000 × 14 languages |
| Videos | ~45 | ~90 |

Install-size consequence: base APK/AAB target under 60 MB (Miniverse map, veranda, living room,
garden, all seven characters, English and Hindi UI, reaction voice, first lessons). Everything else
is a downloadable pack of 5–40 MB, managed from the parent dashboard (`19-parent-dashboard.md`).

---

## 13. Asset QA checklist

Every asset passes all applicable lines before its CMS status moves past "audio review" or
"copyright verification" (`20-admin-cms.md`).

**Rights and provenance**

1. Licence record complete: author, date, licence type, source, attribution text.
2. No resemblance to characters, logos, art or sounds of any existing product; a second reviewer confirms.
3. Model release on file for any real person in video or photo.
4. Public-domain or CC claims checked against the source, with a screenshot of the licence page archived.

**Consistency**

5. Character proportions, colours (by palette token) and props match the model sheet.
6. Expression matches the named expression on the expression sheet.
7. Rive inputs follow the shared contract (`state`, `emotion`, `talk`, `lookX`, `lookY`); every canon state is present and loops cleanly.
8. Environment lighting matches the time-of-day overlay set; parallax layers register at all three scales.
9. Object sprites have all three states and align to the same anchor point.

**Technical**

10. Exported at `@1x` and `@2x`, within the byte budget for its category.
11. WebP quality check on a 720 × 1600 device at arm's length: no banding on skies, no haloing on outlines.
12. Rive files under budget and tested at 60 fps on the reference budget device (Android 10, 2 GB RAM); fallback static pose present.
13. Audio: peak -1 dBTP, loudness -18 LUFS for voice and -23 LUFS for music, no clipping, silence trimmed to 80 ms head and 200 ms tail.
14. Voice line matches the script exactly in the target language; pronunciation checked by a native proofreader; emotion tag matches delivery.
15. SVG text slots render in every script, including Urdu RTL, with no overflow at the Little-mode font size.

**Child safety and sensitivity**

16. No frightening imagery for A0–A2 content; no weapons, no unsupervised danger shown as normal.
17. Religious and cultural art reviewed by the sensitivity panel (`08-temple-courtyard.md`); labelled as history, mythology or belief where it appears.
18. Inclusive representation across regions, skin tones, abilities and family types in background characters.

**Accessibility**

19. Colour contrast of any text over art at least 4.5:1, or the UI supplies a backing plate.
20. Caption text and audio description note attached to every voice line and animated demonstration.

**Localisation**

21. Asset contains no baked-in text (text lives in SVG slots or strings).
22. Culturally specific items (food, festivals, clothing) are tagged so the CMS can vary them by region where needed.
