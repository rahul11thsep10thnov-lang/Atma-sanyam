# FOCUS — Design system

The visual system behind every screen. Tokens live in `src/theme/`, the
component kit in `src/ui/`. A screen never hand-picks a hex colour, a font
size or a shadow; it asks the theme.

## Philosophy

Calm → Focus → Progress → Reward → Ownership. Beautiful before boring,
simple before complex, immersive before information-dense, premium before
gamified. Motion feels alive, never busy. 70% warm neutral, 20% brand
accent, 10% highlight.

## Tokens (`src/theme/`)

| Module | What it holds |
|---|---|
| `palette.ts` | Raw pigments (cream, peach, terracotta, saffron, moss, night…). Not imported by screens. |
| `colors.ts` | Semantic roles for **Golden Morning** (`lightColors`) and **Night Balcony** (`darkColors`): surfaces, ink, brand, status, lines, icons, puzzle covers. Status colours are reserved for status. The legacy `colors` / `typography` / `spacing` exports keep older code compiling and already use the new palette. |
| `typography.ts` | Manrope 400/500/600/700 (one UI family). Scale: display 36, headingLarge 28, heading 22, subheading 17, body 15, bodySmall 13, caption 12, overline 11, button 16, timer 72 tabular. Set `fontFamily`, never `fontWeight`. |
| `spacing.ts` | 4-pt scale (`space.xs`…`space.massive`), `space.screen` = 20, `space.card` = 16, touch target 48. |
| `radii.ts` | sm 12 · md 16 · lg 22 · xl 28 · hero 32 · pill. |
| `shadows.ts` | Four warm, low-opacity, large-blur levels; `shadowColor` is the bark tone. |
| `motion.ts` | fast 150 · normal 240 · expressive 420 · environmental 4000 ms; standard/decelerate/gentle curves; press scale 0.97 spring. |
| `icons.ts` | Sizes xs 16 · sm 20 · md 24 · lg 28 · xl 32 · feature 40 · hero 48; stroke 1.75. |
| `ThemeContext.tsx` | `ThemeProvider` resolves Settings → Appearance (automatic / morning / night) against the OS; `useTheme()` → `{ colors, shadow, isDark }`. |

## Kit (`src/ui/`)

| Component | Use |
|---|---|
| `AppText` | `variant` (scale) + `tone` (ink role). Text never wears a series colour. |
| `Icon` | One Lucide family, per-icon imports (`ICONS` map). No emoji, no mixed packs. |
| `Tactile` | Pressable with the press spring and a selection haptic. Every tappable surface. |
| `Button` / `IconButton` | primary · secondary · tertiary · destructive; sm 40 / md 52 / lg 56; icon buttons with a 48-pt hit area. |
| `Card` | base · raised · floating · tinted · outline; `padding`, `paddingX`, `radius`. |
| `Screen` | Themed background + safe-area padding (+ `bottomInset` for the floating bar). |
| `FloatingTabBar` / `useTabBarInset` | The rounded, elevated bottom navigation and the inset content needs to stay clear of it. |
| `SegmentedControl` | Sliding pill selector (sort orders, appearance). |
| `SettingToggle` / `SettingLink` / `SettingBlock` | Rows inside a settings card. |
| `TextField` | Label, icon, hint/error, focus ring. |

## Screens

- **Home** — greeting · balcony hero (the person's own balcony, composited live) · today's picture ("My balcony" first) · collections · dial · one breathing Start.
- **Session** — picture reveals tile by tile; FOCUS chip, hairline progress, one close; Manrope timer with glow; result sheet (bloom + sprout / calm pause).
- **Balcony** — the photographic balcony (`src/photoBalcony/`, see `docs/PHOTO_BALCONY.md`): the picture fills the screen; one smoked-glass dock (Focus · Customize · Collection · Gallery) floats above the tab bar; tapping the balcony hides every control, the tab bar included. Placement guides exist only in Customize. A balcony focus session shows no controls but the timer and close.
- **Progress** — stat tiles, seven-day bars (single series, direct labels, no grid), session pictures, planted empty state.
- **Settings** — grouped iconed cards, appearance control, calm destructive actions.
- **Library** — search, breadcrumbs, collection chips, sort control, cached grid.

## Rules

- Never mix icon families or add emoji as icons.
- Never set `fontWeight` on a Manrope style; pick the family.
- Never animate everything at once; ambient loops respect **reduce motion** (`useReducedMotion`).
- Errors are calm and useful ("Something interrupted the connection." + Try again). Never shame a paused session.
- Dark mode is a designed palette, not an inversion; check both schemes before calling a screen done.
- Minimum touch target 48 pt (`hitSlop` when the visual is smaller).

## Build order (from the master prompt)

1 tokens · 2 typography · 3 icons · 4 buttons · 5 cards · 6 navigation · 7 home · 8 timer · 9 balcony · 10 plants · 11 rewards · 12 progress · 13 settings · 14 dark mode · 15 accessibility · 16 performance.

Done: 1–14 (plus the library and auth on the kit; 9–11 are the photographic balcony, the focus plant's growth, coins and the jigsaw art wall). In progress: 15–16 (audit passes).
