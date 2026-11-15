# Typography audit (Phase 1 — no source code changed yet)

## Framework and architecture
Kotlin + Jetpack Compose, Material 3. Central theme in `ui/theme/Type.kt` (`RangEPatteTypography`,
`RoyalTitleStyle`, `RoyalLabelStyle`). No XML layouts; all text is Compose `Text`.

## Current fonts
| Token | Font | Notes |
|---|---|---|
| `DisplayFont` | Cinzel (variable TTF, `res/font`) | Latin only — **no Devanagari glyphs** |
| `TitleFont` | Marcellus (regular TTF) | Latin only |
| `BodyFont` | platform serif | Hindi falls back to whatever the phone provides |
Hindi therefore renders in each phone's own fallback font, so Hindi weight and metrics vary by device.

## Measured usage
- `MaterialTheme.typography.*` references: 160+ (bodyMedium 39, bodyLarge 31, bodySmall 23, labelLarge 19, titleMedium 15, labelMedium 13, titleLarge 8, labelSmall 6, headlineMedium 3, headlineSmall 2, displayLarge 2).
- `RoyalLabelStyle` 34 uses, `RoyalTitleStyle` 21 uses (both Cinzel, letter-spaced).
- 101 `.sp` literals in 24 files; 14 are the theme itself. **Hard-coded sizes outside the theme** (~60 `fontSize =`) are concentrated in: `LudoYardPlaques` (10), `GameTile` (6), `NotificationUi` (3), `LudoSetupScreen` (3), `GameSetupScreen` (2), `LobbyScreen` (2), `RoyalControls` (2), `TableTalkUi` (2), and one each in results tables, bottom nav, top bar, buttons, login, audio panel, orientation picker.
- Sizes in use: 10, 11, 12 (x11), 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 30, 40, 64.
- **19 `.uppercase()` calls** on UI labels: game-name plaque, bottom navigation, top bar chips, buttons, panel titles, headers, notification and audio labels, brand title. (A few others are code/ID handling and stay.)
- Sizes drawn from geometry (board numbers, card ranks, Lakadi score sheet) scale with the board and are **not** part of the type scale.

## Findings against the brief
1. Game names are 14 sp Cinzel, uppercase, one line (`GameTile.NamePlaque`) — brief asks 20–22 sp.
2. Body/descriptions are 14 sp serif, capped at 2 lines — brief asks 15–16 sp.
3. Navigation labels are 12 sp Cinzel uppercase, which crowds "ENTERTAINMENT" and long Hindi labels.
4. Small text goes down to 10 sp (results tables, notification badge).
5. No tabular numerals anywhere; timers, scores and counts can jitter.
6. Hindi has no declared font.
7. Several players' names in plaques are 12–14 sp (`LudoYardPlaques`, results tables).

## Features in the brief that this app does not have
Wallet, coins/rewards, betting, tournaments, leaderboards and an admin interface do not exist in
this project (searched the source). Chat is preset phrases and emoji only. Their typography needs no change.

## Proposed token mapping (sizes in sp)
| Token | EN font / weight | HI font / weight | Size |
|---|---|---|---|
| BrandDisplay | Cinzel Bold | Noto Sans Devanagari Bold | 34 |
| ScreenTitle | Noto Sans SemiBold | Noto Sans Devanagari SemiBold | 21 |
| SectionTitle | Marcellus Regular | Noto Sans Devanagari SemiBold | 23 |
| GameTitle | Noto Sans Bold | Noto Sans Devanagari Bold | 21 |
| PlayerName | Noto Sans SemiBold | NSD SemiBold | 16 |
| BodyText / GameplayText | Noto Sans Regular | NSD Regular | 15 |
| ScoreText | Noto Sans SemiBold, tabular numerals | NSD SemiBold | 17 |
| PrimaryButton | Noto Sans SemiBold | NSD SemiBold | 15 |
| SecondaryLabel | Noto Sans Medium | NSD Medium | 13 |
| NavigationLabel | Noto Sans Medium | NSD Medium | 12 |
| Metadata | Noto Sans Medium | NSD Medium | 12 |
Line height about 1.3x for titles and 1.5x for body (Devanagari needs the extra height for matras).

## Implementation plan (after approval)
1. Add `noto_sans*.ttf` and `noto_sans_devanagari*.ttf` to `res/font`; update `THIRD_PARTY_NOTICES.md` (SIL OFL 1.1).
2. Rewrite `Type.kt` with the tokens above, language-aware (Hindi uses the Devanagari family), keep the old names as aliases so nothing breaks.
3. Replace the 60 hard-coded sizes with tokens; remove `.uppercase()` from game names, navigation, buttons and titles (keep it only for the brand).
4. Tables and plaques: let game-name plaques hold two lines at a fixed height so tiles stay level; descriptions up to 4 lines.
5. Add JVM tests for the token table (sizes inside the ranges) and a test that game titles use the 20–22 sp token.
6. Build in Android Studio (not possible in this sandbox), test on devices, fix issues.
