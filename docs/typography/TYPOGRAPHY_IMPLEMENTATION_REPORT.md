# Typography implementation report

Status: implemented in source; **not compiled or run** (this environment has no Android SDK). JVM tests pass
(161, including 7 new ones). Build and device checks are listed under "Still to verify".

## Created
- `ui/theme/TypeScale.kt` — the sizes and their allowed ranges as plain, testable numbers.
- `res/font/noto_sans_{regular,medium,semibold,bold}.ttf`, `res/font/noto_sans_devanagari_{regular,medium,semibold,bold}.ttf`
  (OFL, subset to the characters used, about 1 MB in total; licence in `licenses/fonts/OFL-NotoSans.txt`).
- `app/src/test/.../ui/TypographyTest.kt` — token ranges, game titles 20–22 sp, minimum 11 sp, no stray hard-coded sizes, tiles use the game-title style.
- `docs/typography/` — audit, previews, this report.

## Rewritten
- `ui/theme/Type.kt` — language-aware tokens (`AppType.*`), Material typography built from them, old names kept as aliases. English uses Cinzel Bold (brand), Marcellus (section headings) and Noto Sans; Hindi and Marathi use Noto Sans Devanagari throughout; other Indian scripts use Noto Sans plus Android's fonts.

## Modified (typography only)
`Theme.kt`, `GameTile.kt` (game names 21 sp Bold, two-line plaques of equal height, descriptions 15 sp up to 4 lines, no forced capitals), `GamesScreen.kt`, `BottomNavigationBar.kt`, `AppTopBar.kt`, `GameHeader.kt`, `RoyalPanel.kt`, `RoyalButton.kt`, `RoyalControls.kt`, `AudioControlPanel.kt`, `OrientationPicker.kt`, `NotificationUi.kt`, `LanguageSelectionScreen.kt`, `TableTalkUi.kt`, `LudoSetupScreen.kt`, `GameSetupScreen.kt`, `LudoYardPlaques.kt`, `LudoResults.kt`, `SnakesResults.kt`, `Plaques.kt`, `ScorePanel.kt`, `PlayerAvatar.kt`, `LoginScreen.kt`, `LobbyScreen.kt`, `README.md`, `THIRD_PARTY_NOTICES.md`.

## Hard-coded sizes
60 typed sizes outside the theme before; now only: emoji and icon glyphs (⏳ 🤖 ✎ × 💬, the poke hand, state icons), suit glyphs, the room-code and OTP entry boxes (built on `AppType.CodeDigits` with wide letter-spacing), and sizes derived from the board or a card (card ranks, board numbers, the Lakadi score sheet). `TypographyTest` fails if a new one appears elsewhere.

## Decisions to know about
- Capitals only on the brand; game names, navigation, buttons, titles and labels are sentence case.
- Letter-spacing is removed everywhere except the English brand and code boxes (it breaks Devanagari).
- Narrow places use `PlayerNameCompact` (14 sp): landscape side plaques, results tables, avatars.
- Results-table headers use 11 sp (the metadata floor) and may wrap to two lines.
- No wallet, coins, betting, tournaments, leaderboards or admin screen exist in this project, so nothing to update there.

## Still to verify on a device
1. Android Studio build (Sync Gradle, Clean, Run) — Compose code was written without a compiler.
2. Games, Entertainment and setup screens in English, Hindi and Marathi, at small, normal and large phone sizes, and with system font scale 1.3 and 2.0.
3. Ludo yard plaques at 16/14 sp on the smallest phone; landscape side plaques.
4. Results tables: the English header "Serpents" may wrap awkwardly in a narrow dialog; if so, shorten the word to "Snakes".
5. Bottom navigation with "Entertainment" at 12 sp.
