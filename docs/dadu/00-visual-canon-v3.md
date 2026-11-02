# DADU – Visual canon v3 (Premium Chibi Anime, Modern Indian Villa)

Supersedes the rendering style of `00-canon.md` section 4 ("Living Picture Book"). Everything else in
`00-canon.md` (languages, age bands, teaching formula, non-negotiables, content IDs) still applies
except where this file says otherwise.

## 1. Rendering style

- **Premium Chibi Anime.** Head-to-body ratio 1:2.2 for children and animals, 1:2.6 for Dadaji.
  Large expressive eyes (eye height about 28 percent of face height), small nose, soft mouth shapes.
- **Environments** are detailed anime-style illustrations with soft cinematic lighting: one key light
  (sun or lamp), a warm fill, rim light on characters, long soft shadows at morning and evening.
- **Colour** is vibrant but balanced. The v2 palette tokens (`saffron`, `peepal`, `monsoon`, `indigo`,
  `clay`, `plum`, `rose`, `marigold`, `paper`) stay as the UI and accent palette. Scenes use a wider,
  more saturated range with anime-style gradients; they do not use the hand-painted paper texture.
- **Shading**: two-tone cel shading plus one soft gradient per surface. Outlines 1.5 px, coloured a
  darker shade of the fill, never pure black.
- **Motion**: ease-out 240 ms for UI, idle breathing loops of 3 s, blink every 4 to 6 s, walk cycles of
  8 frames. Reduced-motion preference turns loops off and keeps state changes as cross-fades.

## 2. Architecture: modern Indian family villa

The home is a contemporary two-storey Indian villa, not the earlier traditional house.

- Flat roof with a terrace and a pergola; large glass windows; a first-floor balcony with planters.
- Cream and warm-white render with a teak-toned entrance, a stone-clad accent wall, a saffron
  front door, brass nameplate "DADU".
- Entrance veranda with a swing (jhoola), potted tulsi, a shoe rack and a rangoli at the threshold.
- Landscaped surroundings: lawn, paved path, a car-free driveway used for cycling and cricket.
- Interiors: living room (sofa, TV wall used for lessons, bookshelf, telescope by the window),
  kitchen (modular with an island), dining room, two bedrooms (Dadaji's and Chintu's), study,
  activity room (art, music and science corners), two bathrooms, terrace.
- The plot keeps the v2 decision of a massive garden: the villa covers about 15 percent of the plot.
  The garden holds the animal areas (Animalia) and the reserved shelter plots.

## 3. The six primary characters

| Key | Name | Legacy key | Chibi spec |
|---|---|---|---|
| `dadaji` | Dadaji | `dadaji` | Bald crown, white hair on the sides and back, thick curved white moustache, large rectangular lightly tinted spectacles, forehead wrinkles, defined nose, lean elderly build, cream kurta, white dhoti, green traditional sandals. Default costume has no waistcoat, gamchha, cap or scarf. |
| `chintu` | Chintu | `gopu` | 5 to 7 years old, messy black hair, large brown eyes, yellow T-shirt, blue shorts, colourful sneakers. Naughty, playful, affectionate, curious. Never assigned a gender in scripts. |
| `buddy` | Buddy | `kim` | Golden-brown dog, floppy ears, expressive eyes, red collar. Friendly. |
| `chikki` | Chikki | `molly` | White rabbit, pink inner ears, rounded soft proportions. Curious, a little shy. Keeps the v2 learning role (maths, puzzles, logic). |
| `gauri` | Gauri | `gauri` | White Indian domestic cow with brown patches, friendly face, distinctive horns, brass bell. Protective. |
| `nandu` | Nandu | `dhanu` | Small brown-and-white calf, large eyes, follows Gauri. Playful. |

Retained supporting character: `mitthu` (mountain parrot) for Mitthu's Echo only. Guest characters
(librarian, visiting specialists) are introduced and closed by Dadaji.

**Reference image.** The master prompt names a user-uploaded grandfather reference image as the
definitive identity source. No image was present in this session's uploads, so the character is
built strictly from the written description above. When the image is supplied, the artist compares
the head model sheet against it and adjusts the moustache curve, spectacle tint and wrinkle pattern.

Legacy identifiers stay valid everywhere through the alias map in `src/dadu/core/characters.ts`
(`gopu` → `chintu`, `kim` → `buddy`, `molly` → `chikki`, `dhanu` → `nandu`); stored content and
progress are never rewritten.

## 4. Hybrid camera

- **Isometric 2.5D (primary world view)**: 2:1 dimetric projection (tile 64 × 32 world px), used for
  the villa exterior, rooms, gardens, animal areas, neighbourhood and map. Characters are drawn as
  billboards facing one of four directions.
- **Side-view 2D (activity view)**: used inside activities (gardening, cooking, animal care, music,
  art, learning). Same character rigs, same world state. See `HYBRID_CAMERA_ARCHITECTURE.md`.

## 5. UI

- Fonts unchanged: Baloo 2 family for headings (per script), Nunito and Noto Sans for body.
- Buttons: pill or 24 px radius, two-tone with a 4 px bottom shadow; Little mode 72 pt minimum height.
- Cards: 20 px radius, white on `paper`; section tiles keep the eight section colours.
- Iconography: filled chibi-style icons with the same outline rule as the characters.

## 6. Consistency rules

1. One rig per character, used in both camera views; never redraw a character per scene.
2. Costume variants (festival clothes) are skins on the same rig; the default costume is fixed.
3. Children cannot alter the primary characters; personalisation applies to the child avatar,
   rooms, garden, toys and backgrounds only.
4. Every environment is lit from the same sun position for its time of day.
5. Text in scenes uses the UI fonts, never hand-lettering.
