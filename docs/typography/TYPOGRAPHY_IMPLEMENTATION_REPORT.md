# Typography implementation report

Status: implemented in source. The changed screens were **compiled and rendered from the app's own Compose code**
with Compose Desktop 1.7 (the same Compose version as the app's BOM 2024.09.02), using the bundled fonts and the
real English/Hindi strings — see `docs/typography/rendered/`. The Android build itself (Gradle with the Android SDK)
was not run here. JVM tests: 167 pass, 0 fail (9 typography tests).

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

## Bugs found by rendering and fixed
| # | Problem | Fix |
|---|---|---|
| 1 | Bottom tab "Entertainment" cut to "Entertainm…" at normal size (also before this work) | Tab labels step down to fit, 10 sp at the least |
| 2 | Results table: player names cut to "Mee…", "Go…" | Name column wider again; names step down to fit |
| 3 | Results table at large font: "Home" header broken as "Hom / e" | Headers fit on one line (9 sp at the least) |
| 4 | Difficulty button "Medium" cut to "Medi…" | Button text steps down to fit |
| 5 | Mode slot "Online (Internet)" lost its ")" — the row of four 72 dp slots was wider than the panel and scrolled sideways (older layout issue) | The four slots share the panel width; labels fit in up to three lines |
| 6 | Game names at 130 % font size cut to "Teen Patti / …" | Game names step down (15 sp at the least) to fit two lines whole |
| 7 | At 200 % font size game names and descriptions broke mid-word ("Rum / my", "Solita / ire") | The grid falls back to one column when text is very large (portrait capped at 200 dp) |
| 8 | Panel title "Entertainment" broke mid-word at 200 % | Panel and screen titles step down to fit |
| 9 | Top-bar "Login / Sign up" cut at 200 % | Wraps to two lines |
All nine use one new helper, `ui/components/FitText.kt`: it keeps the style's size when the text fits and steps down
only when the text would be cut with "…" or split inside a word, never below a stated floor.

Also checked: all 8 languages have all 614 strings with matching `%` placeholders; all 604 resource references in
the code exist.

## Still to verify on a device
1. Android Studio build (Sync Gradle, Clean, Run).
2. Games, Entertainment and setup screens in English, Hindi and Marathi, at small, normal and large phone sizes, and with system font scale 1.3 and 2.0.
3. Ludo yard plaques at 16/14 sp on the smallest phone; landscape side plaques.
4. Results tables on the smallest phone (headers can shrink to 9 sp).
5. Bottom navigation with "Entertainment" at 12 sp.
