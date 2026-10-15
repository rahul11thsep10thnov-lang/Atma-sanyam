# LoJi — Design system

Two identities on one token system (`src/theme/`, components in `src/ui/`):

- **Player Console** — candy-bright, chunky, animated, big tap targets, emoji and vector art,
  rounded display type. Children should *want* to tap everything.
- **Guardian Console** — calm, legible, information-dense enough for a dashboard, the same
  palette dialled down.

`ThemeProvider` resolves `{ mode: 'player' | 'guardian', scheme: light | dark }`; screens ask
`useTheme()` for `colors`, never a hex. The Player Console switches to the night palette with
the OS; the Guardian Console follows the OS too.

## Colour (`palette.ts` → `colors.ts`)

Candy pigments: bubblegum `#FF6B9D`, tangerine `#FF8A3D`, sunshine `#FFC93C`, lime `#7ED957`,
mint `#4FD1C5`, sky `#4FB3FF`, grape `#9B6BFF`, cherry `#FF5F6D`, each with a `*Deep` shade for
3D button edges; creams (vanilla, marshmallow, cloud) and inks (`ink #2E2A4A`, soft, muted);
night tones (nightSky, nightCard, nightRaised, starlight) for dark mode. Semantic roles
(`background`, `surface`, `surfaceRaised`, `primary`, `secondary`, `success`, `warning`,
`danger`, `text`, `textSecondary`, `icon`, `border`…) are defined per identity and scheme.

Game and category colours come from `src/games/registry.ts` so a game looks the same on its
card, its detail page and the guardian's mirror.

## Type (`typography.ts`)

Fredoka 600/700 for display and numerals (player), Nunito 400/600/700/800 for body (player),
Manrope 600/700 for the guardian dashboard. Scale: hero 40 · display 32 · headingLarge 26 ·
heading 21 · subheading 17 · body 16 · bodySmall 14 · caption 12 · overline 11 · button 17 ·
numeral 56 / numeralSmall 32 (tabular) · dashTitle 26 / dashHeading 19 / dashLabel 13. Set
`fontFamily`, never `fontWeight`.

## Playful kit (`ui/Playful.tsx`, player only)

`PlayfulBackdrop` (gradient with drifting shapes), `BigButton` (3D, md/lg/xl), `RoundButton`,
`CandyCard`, `Chip`, `Badge`, `Stars`, `ProgressBar`, `Confetti`, `Bob` (idle bounce), `PopIn`,
`EmojiDisc`. Motion respects *Reduce motion*.

## Shared kit (`ui/`)

`AppText`, `Icon` (Lucide, one family), `Tactile` (press scale + haptic), `Button`/`IconButton`,
`Card`, `Screen`, `FloatingTabBar` (playful variant for the player), `TextField`,
`SegmentedControl`, `SettingToggle/Link/Block`, `Avatar`, states (`LoadingState`, `EmptyState`,
`ErrorState`, `OfflineBanner`).

## Age-aware UI

Bracket A gets larger targets, spoken prompts (narration on by default), 2–3 choices and fewer
words; D gets denser boards and longer text. Games read `ctx.bracket` and `ctx.difficulty`.

## Accessibility

Every control has an accessibility label (the smoke tests rely on them), minimum 48 pt targets,
colour is never the only signal (icons + text), reduced-motion support, text-to-speech for
prompts and facts.

## Art

Emoji and SVG only (no licensed image packs): avatars in `assets/avatars` (24, original),
fold diagrams generated from data, colouring pictures as SVG regions. The image library in the
admin console is for curated, licensed illustrations for facts.
