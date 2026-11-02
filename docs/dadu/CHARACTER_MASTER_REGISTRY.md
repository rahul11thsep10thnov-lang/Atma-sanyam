# DADU – Character master registry

Status of every character rig in `src/dadu/render/characters/`. One rig per character is used
in both camera views (`CharacterSprite` for the isometric view and dialogue, the same rig inside
`SideScene`). Legacy keys resolve through `canonicalCharacter` (gopu → chintu, kim → buddy,
molly → chikki, dhanu → nandu). The grandfather reference image named in the master prompt was
not present in this session; Dadaji follows the written description.

## Implemented across all rigs

| Item | Status |
|---|---|
| Views | front, side, back implemented; three-quarter = front with a 3-unit offset and side glance (counts as a view variant, not a separate drawing) |
| Poses | stand, walk, run, sit, sleep, wave, think, clap, teach, graze (animals: sit = lying, teach = stand; Mitthu: walk/run = hop) |
| Expressions | neutral, happy, laugh, surprised, think, sad, sleepy, proud, oops, listen, talk, wink (shared `Face` parts; Mitthu uses eye shapes and beak opening) |
| Animation | idle breathing (3 s), blink every 4.6 s, walk/run cycles, tail wag (dog, cow, calf), ear twitch (rabbit), wing flap (parrot), swing/talk mouth cycle; all off under reduced motion |
| Interaction poses | wave, clap, teach (finger up), think (hand to chin); animals: paw up on wave |
| Height chart | `HEIGHT_CHART` from `core/characters.ts` (Dadaji 1.00, Gauri 0.76, Chintu 0.57, Nandu 0.43, Buddy 0.38, Chikki 0.29, Mitthu 0.19) |
| Colour specification | `characterColours` and `skin` in `render/palette.ts` |
| Transparent exports | The rigs are vector components; a transparent PNG/SVG export tool is not written yet |
| Rigging-ready assets | Limb groups are named in code (head, arms, legs, tail, wing) but no Rive/Lottie file exists |

## Per character

| Key | File | Box (w × h) | Distinguishing features implemented | Missing |
|---|---|---|---|---|
| `dadaji` | `Dadaji.tsx` | 100 × 130 | Bald crown, white side and back hair, thick curved white moustache, large rectangular tinted spectacles with bridge and temples, forehead wrinkles, nose, lean build, cream kurta with placket and buttons, white dhoti with folds, green sandals; no gamchha, waistcoat, cap or scarf | Festival costume skins; walk cycle shows feet only (dhoti hides legs by design) |
| `chintu` | `Chintu.tsx` | 100 × 100 | Messy black hair with cowlick, large brown eyes, yellow T-shirt with a mango print, blue shorts, red and green sneakers | Alternate outfits; gendered features deliberately absent |
| `buddy` | `Buddy.tsx` + `quadruped.tsx` | 140 × 100 | Golden-brown coat, cream belly and muzzle, floppy ears, curled wagging tail, red collar with tag, tongue on happy | Sitting on hind legs (currently lying) |
| `chikki` | `Chikki.tsx` | 100 × 100 | White fur, pink inner ears (one ear folds in think), white tummy, pink nose, whiskers, green scarf, hop on walk/run | Side-view ears cover part of the face at some sizes |
| `gauri` | `Gauri.tsx` + `quadruped.tsx` | 140 × 100 | White coat with three brown patches, horns, cow ears, pink muzzle, red collar with brass bell, swishing tail, graze pose | Udder omitted (chibi simplification) |
| `nandu` | `Nandu.tsx` + `quadruped.tsx` | 140 × 100 | Brown coat with white patches and belly, forehead tuft, small horns absent (calf), big eyes, bouncy walk | Follow-Gauri behaviour belongs to simulation, not the rig |
| `mitthu` | `Mitthu.tsx` | 80 × 80 | Green body, slate-blue head, red-orange beak that opens when talking, blue-green tail, perch, wing flap on wave/clap/run | Flight pose |

## Review checklist for new art

1. Compare the head model sheet against the approved reference image when it is supplied (moustache curve, spectacle tint, wrinkle pattern).
2. Keep proportions from `00-visual-canon-v3.md` (1:2.2 children and animals, 1:2.6 Dadaji).
3. Outlines are darker shades of the fill, never black.
4. Every new pose or expression is added to `SPRITE_POSES` / `SPRITE_EXPRESSIONS` and shown in `RenderPlayground`.
