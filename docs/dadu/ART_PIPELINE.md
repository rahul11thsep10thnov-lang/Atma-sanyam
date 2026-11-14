# DADU art pipeline: make the pictures in ChatGPT, drop them in, the app shows them

The vector art in the app is placeholder quality. This pipeline replaces it with painted pictures
you make in ChatGPT (or any artist makes), without rewriting the app. Every place that draws
something first looks for a picture in `assets/dadu-art/`. If one exists it is used. If not, the old
vector drawing stays. So you can replace things one at a time and the app never breaks.

| What the child sees | Folder | File name | Count in the lists |
|---|---|---|---|
| Objects and buildings in the walkable world (isometric) | `props/` | `<sprite_key>.png` | 197 (97 are grey placeholder crates today) |
| Rooms and places when the camera switches to side view | `rooms/` | `<file_name>.png` | 24 |
| Story pictures | `story/` | `<art_file_name>.png` | 36 |
| The seven characters | `characters/<key>/` | `idle.png`, `talk.png`, `happy.png`, ... | about 8 to 9 pictures each |

The full lists with exact file names, where each thing is used and what states it needs are in
`docs/dadu/art-brief/`: `objects.csv`, `rooms-side-view.csv`, `story-pages.csv`, `iso-locations.csv`.
Open them in Excel. The first column of each is the file name you must use.

## What to expect (be realistic)

- **Looks:** this will lift the look a lot. Painted objects, rooms and story pages next to a painted Dadaji.
- **Consistency is the hard part.** ChatGPT does not remember a character between requests. Every new
  picture must start from your style reference picture (see Step 1), and you will redo some.
- **Animation becomes simple.** Painted characters swap between a few pictures (idle, talking, happy)
  with a small breathing and walking bob added by the app. It will feel like a picture book that
  moves a little, not like a cartoon. Smooth animation needs an animator rigging the same pictures
  in Rive later. Nothing you make now is wasted for that.
- **Floors and walls of the isometric rooms** are still drawn by the app. The new objects will sit
  on them. If you want painted floors and walls too, that is a second round, once objects work.

## Order of work (stop whenever the look is good enough)

1. Step 1: the style reference picture.
2. The six main characters and Mitthu (about 55 pictures). This changes the feel most.
3. The 39 priority-1 props in `objects.csv` (sofa, TV wall, bookshelf, bed, kitchen island, the villa, stalls, shed, slide and so on).
4. The 24 side-view rooms.
5. The 36 story pages.
6. The remaining props (priority 2, then 3).

## Step 1: make one style reference picture

In ChatGPT, ask for a "style board": one image with Dadaji's head, Chintu's head, one object (a
sofa), one background corner and a colour palette. Keep asking until you love it. Save it as
`style.png`. **Attach this picture to every later request** and say "in exactly the same art style
as the attached picture".

Use this fixed text at the start of every prompt (the "style line"). Do not change it between requests:

> Premium chibi-anime children's game art. Soft painterly shading with clean highlights, warm cinematic
> light from the upper right, rounded friendly shapes, rich but balanced colours, modern Indian family
> home setting. No text, no logos, no watermark.

> Easiest on a phone: open the **DADU Prompt Book** page. It has every prompt below already written out in full, with a Copy button on each. The same prompts are in `docs/dadu/art-brief/chatgpt-prompts.json`. Regenerate them with `python3 tools/dadu/gen_prompt_book.py`.

## Step 2: prompts

Work in one conversation per asset type, one request at a time. Ask for square or 3:2 images.

### Characters (7 characters, about 8 pictures each)

First a **character sheet** (front, side, back, six faces), attached to every later request for that character.

> {style line} Character reference sheet of **Dadaji**, an elderly Indian grandfather in chibi proportions:
> bald crown, white hair only at the sides and back, a thick curved white moustache, large rectangular
> slightly tinted spectacles, forehead wrinkles, lean build, cream kurta, white dhoti, green traditional
> sandals, no waistcoat, no scarf, no cap. Show front view, side view, back view and six face
> expressions on a plain white background. Match the attached photo for the face.

Attach his real photo for Dadaji. The other descriptions are in `docs/dadu/00-visual-canon-v3.md`
section 3 (Chintu, Buddy the golden dog, Chikki the white rabbit with pink ears, Gauri the white
cow with brown patches, Nandu the brown-and-white calf, Mitthu the green parrot with a slate-blue head).

Then each **pose**, with the sheet and the style picture attached:

> {style line} The same character, same outfit, same proportions as the attached character sheet.
> Pose: **{pose}**. Full body, centred, the whole figure visible with empty space around it, square
> image, on a perfectly flat solid pure magenta (#FF00FF) background. No ground, no shadow on the
> background, no magenta anywhere on the character.

Poses to ask for, and the file name to give each:

| File name | What it is |
|---|---|
| `idle.png` | standing, relaxed, mouth closed, the default |
| `talk.png` | same pose, mouth open (the app alternates it with idle while speaking) |
| `happy.png`, `think.png`, `sad.png`, `surprised.png`, `sleepy.png` | expressions |
| `walk.png` | mid-step walking pose |
| `wave.png`, `teach.png` | Dadaji's finger-raised teaching pose, and a wave |
| `side_idle.png`, `side_walk.png` | side view, if you want it (otherwise the front pictures are mirrored) |
| `face.png` | head and shoulders, used in speech bubbles |

Keep the figure the same size and in the same position in every picture of the same character. The
animals only need `idle`, `talk`, `happy`, `walk`, `face`.

### Objects and buildings (props)

Ask for a **sheet of 9 at a time** (3 by 3). One sheet keeps the style uniform and is cheaper than 9 requests.
Take the 9 names from `objects.csv` in order (use one category at a time).

> {style line} A 3 by 3 grid sprite sheet of 9 separate objects for an isometric children's game:
> **1 sofa, 2 armchair, 3 bed, 4 desk, 5 floor lamp, 6 wall clock, 7 carrom board, 8 radio, 9 brass diya**.
> Every object is drawn from the same isometric three-quarter view from above, front and right,
> lit from the upper right. Each object sits alone in the centre of its own equal square cell with wide
> empty space around it. Perfectly flat solid pure magenta (#FF00FF) background everywhere, no ground,
> no shadows on the background, no grid lines, no text, no magenta on the objects.

For large buildings (villa, shed, library) ask for one object per image. If an object has states
(a light that is on, a box that is open) make a second picture of the same object and name it
`<name>@on.png` or `<name>@open.png` (allowed: on, open, full, clean, ready). Plant beds can have
`@seed`, `@seedling`, `@growing`, `@mature`, `@flowering`, `@fruiting`, `@harvest`.

### Side-view rooms (24)

> {style line} A straight-on side view of a **modern Indian villa living room** like a stage set, as the
> background of a children's game. Empty of people and animals. Wide 3:2 image. The floor line, where
> characters will stand, is about 83 percent of the way down the picture, with a clear open floor area
> in front of it. Keep the main items in the middle so the edges can be cropped. No text.

Names and what each room should hold: `rooms-side-view.csv` and the room descriptions in `docs/dadu/05-room-designs.md`.

### Story pages (36)

> {style line} Picture-book illustration, wide 3:2 image, no text. Scene: **{scene_text_en from story-pages.csv}**.
> Characters in this scene: {who}. Keep the same characters and colours in every page of this story.

Ask for the whole story in one conversation so the look carries across pages.

## Step 3: cut out and name the pictures (you run this)

Install Python 3.9 or newer, then once: `pip install pillow numpy`. Put raw downloads in a folder `raw/`.

```bash
# a single picture on magenta (add --keep for characters so every pose keeps the same frame, and --holes 60 to also clear magenta trapped between an arm and the body)
python tools/dadu/art_import.py chroma raw/sofa.png assets/dadu-art/props/sofa.png
python tools/dadu/art_import.py chroma raw/chintu_idle.png assets/dadu-art/characters/chintu/idle.png --keep --holes 60 --max 640

# a 3 by 3 sheet, names in reading order; use - for an empty cell
python tools/dadu/art_import.py slice raw/sheet1.png --grid 3x3 \
  --names sofa,armchair,bed,desk,floor_lamp,clock,carrom,radio,diya --out assets/dadu-art/props

# rooms and story pages are fitted to the app frame automatically
python tools/dadu/art_import.py scene raw/living.png assets/dadu-art/rooms/living.png
python tools/dadu/art_import.py scene raw/page1.png  assets/dadu-art/story/river_tree.png

# see what is still missing, and rebuild the list the app reads
python tools/dadu/art_import.py check
python tools/dadu/art_import.py manifest
```

If the edges look rough, run again with `--tol 90` (stronger) or `--tol 50` (gentler). If ChatGPT
returns a checkerboard or white instead of magenta, ask again with "solid flat magenta".

For a prop that sits too high, too low or too large, add a file next to it, for example
`assets/dadu-art/props/sofa.json` containing `{"scale": 1.2, "dy": 4}` (`scale` bigger or smaller,
`dx` and `dy` nudge in pixels). Then run `manifest` again.

## Step 4: see it, and send it to me

Run the app (`npm start`). Anything you added replaces the old drawing straight away.

To have me do the work, give me the pictures in any one of these ways:

1. **Attach the raw pictures in this chat**, up to about ten per message, and say what each one is.
   I cut them out, name them, add them, test in the app and push.
2. **Put the folder `assets/dadu-art/` into your clone**, run `git add`, `git commit`, `git push` on
   the branch `ccr-391ecc43-qfpbk8`, then tell me. I pull and review.
3. **Zip the folder and attach it.**

I will check every batch on screen at the real sizes and tell you what to redo (wrong size, rough
edges, a character that looks different from the sheet).

## Rights and safety

- Make sure the prompts name no existing character, brand or living artist. Describe the look in words.
- Keep the prompts and the style picture you used. They are your record of where each picture came from.
- OpenAI's terms have given users the rights to what they generate (read the current terms), but whether an AI-made picture can be protected by
  copyright in India is unsettled, and you cannot stop others from making something similar. A lawyer
  should confirm before you rely on these pictures for a trademark or an exclusive licence.
- Children's pictures: no real children's photos, no faces of real people except Dadaji's reference, which
  should be the picture of someone who agreed to it.

## How the app uses the pictures (for developers)

`src/dadu/art/manifest.generated.ts` is written by `art_import.py manifest`. `spriteFor`
(`render/iso/tiles/index.ts`) returns a bitmap sprite when `ART.props[name]` exists. `SideScene` draws
`ART.rooms[background]` instead of the vector background. `StoryScreen` shows `ART.story[page.illustration]`.
Every character rig is wrapped by `withArt` (`render/characters/artRig.tsx`), which picks a picture with
`pickCharacterImage` (`art/logic.ts`), adds breathing and walking motion, and falls back to the vector
rig. Unit tests: `src/dadu/__tests__/art.test.ts`.
