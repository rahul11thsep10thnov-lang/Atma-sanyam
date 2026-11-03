# DADU – Asset completion matrix

Status of every asset category from `22-assets.md` against what exists in the repository after
this pass. "Vector in code" means the asset is a react-native-svg component drawn procedurally
(no bitmap file), which is the production approach chosen in `HYBRID_CAMERA_ARCHITECTURE.md`
for budget Android devices (small bundle, resolution-independent, themeable by time and season).

| Category | Required (22-assets.md) | Exists | Where | Status | Missing / next |
|---|---|---|---|---|---|
| Character rigs | 7 characters, 4 views, 10 poses, 12 expressions, animation sheets, height chart, colour spec | 7 rigs × front/side/back (+ three-quarter variant) × 10 poses × 12 expressions, animated | `src/dadu/render/characters/` | COMPLETE AND VERIFIED (visual harness) | Rive/Lottie rigs, transparent PNG export tool, festival costume skins |
| Character model sheets / expression sheets | per character | `RenderPlayground` renders every pose and expression as a living sheet | `src/dadu/render/RenderPlayground.tsx` | IMPLEMENTED | Static exported sheets for artists |
| Environments (isometric) | 31 environments | 32 locations with backdrops and default prop layouts; 4 times of day × 5 weathers × 5 seasons via shared code | `src/dadu/render/iso/` | COMPLETE AND VERIFIED (visual harness) | neighbourhood street, greenhouse glass interior, workshop interior |
| Environments (side-view) | activity backgrounds | 26 backgrounds | `src/dadu/render/side/backgrounds.tsx` | COMPLETE AND VERIFIED | driveway, festival dressing |
| Interactive object sprites | 120–180 objects × 3 states | 103 named props (37 interior, 38 outdoor, 23 town/map, 5 villa) + plant beds in 8 stages + trees in 5 seasons; flags open/on/full/clean/ready render as state variants where the prop defines them; unknown sprite keys fall back to a generic prop | `src/dadu/render/iso/tiles/` | PARTIALLY IMPLEMENTED | ~60 of the 167 content object sprite keys use the generic fallback; per-state art for every prop |
| UI kit | icons for 8 sections + companions, buttons, cards, tabs, badges, stars, coins, certificates | buttons, cards, chips, tiles, speech bubbles, keypad, progress, toast; section and tab icons drawn in screens | `src/dadu/ui/` | IMPLEMENTED | certificate artwork, badge art beyond icon glyphs |
| App icon, adaptive icon, splash, notification icon, favicon | 1 set | generated (chibi Dadaji on saffron) | `assets/*.png`, `tools/dadu/gen_icons.mjs` | COMPLETE | Store feature graphic, screenshots (see RELEASE_READINESS) |
| Fonts | Baloo family per script + Nunito + Noto Sans | Baloo 2 (Latin + Devanagari) and Nunito bundled via `@expo-google-fonts`; system fonts for other scripts | `App.tsx` | PARTIALLY IMPLEMENTED | Baloo Da 2 / Bhai 2 / Paaji 2 / Thambi 2 / Tammudu 2 / Tamma 2 / Chettan 2 / Bhaina 2 / Bhaijaan 2 and Noto Sans per script (add when those languages are translated) |
| Character voice lines | ~34,000 lines, 14 languages | none recorded; device text-to-speech reads every line in en/hi with per-character pitch and rate | `src/dadu/audio/narrator.ts` | BLOCKED BY EXTERNAL DEPENDENCY (voice actors, studio) | all recorded audio and the audio packs |
| Music and ambience | 75 tracks, ambience loops | none bundled; mixer, ducking and ambience keys implemented | `src/dadu/audio/mixer.ts` | BLOCKED BY EXTERNAL DEPENDENCY (composer / licensing) | original or licensed tracks |
| Sound effects | ~360 | none | — | MISSING | — |
| Story illustrations | ~1,540 at launch | 12 stories use side-view backgrounds plus character rigs as scenes; no per-page illustration files | `src/dadu/content/stories.ts` (illustration keys) | PARTIALLY IMPLEMENTED | per-page illustrations |
| Lesson media | ~3,200 pieces | activity pictures from the inline SVG icon set in `screens/activities/icons.tsx` | | PARTIALLY IMPLEMENTED | subject illustrations, diagrams |
| Localisation strings | ~39,000 keys, 14 languages | en + hi complete for UI, 52 lessons, 12 stories, 51 assignments, 167 objects; other 12 languages 0 % | `src/dadu/i18n`, `src/dadu/content` | PARTIALLY IMPLEMENTED | 12 languages (CMS translation workflow exists) |
| Video | minimal | none | — | MISSING (not required for launch) | — |
| Offline packs | core, language, world, section, stories, audio | pack build and publish on the server (manifests of published items); no downloadable binary packs because all content is bundled in the app today | `backend/src/routes/admin/dadu.ts` | PARTIALLY IMPLEMENTED | pack download/install UI, binary audio packs |

## Asset QA

- Every rig and location was rendered in a server-side harness during this pass (see
  `CHARACTER_MASTER_REGISTRY.md`, `ENVIRONMENT_MASTER_REGISTRY.md`).
- `catalog.validate()` (unit test) checks that every object's sprite key is a string and every
  object belongs to a known location; it does not yet assert that the sprite exists in
  `SPRITE_NAMES`. Adding that assertion is the next QA step once the fallback count is reduced.
- Licence provenance: every bundled asset is original code written in this repository; fonts
  are SIL OFL via `@expo-google-fonts`.
