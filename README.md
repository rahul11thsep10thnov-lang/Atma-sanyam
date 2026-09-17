# Rang-e-Patte

*"Traditional Indian Card Games"* — a native Android app (Kotlin + Jetpack Compose) for classical
Indian card games, styled after a heritage drawing room rather than a casino. "Rang-e-Patte" is a
temporary internal name; see [Renaming the app](#renaming-the-app) to change it.

This is **not** a real-money gambling app. All scoring uses non-monetary points.

## Status

Phases 1–6 of the build plan are implemented and this README describes only what exists today:

| Phase | What | Status |
|---|---|---|
| 1 | Project foundation (Gradle, manifest, app scaffold) | ✅ |
| 2 | Theme (heritage color palette, typography, shapes) | ✅ |
| 3 | Card engine (models, deck, card/back renderers, styles) | ✅ |
| 4 | Home screen (featured/popular/more games grid) | ✅ |
| 5 | Navigation (Compose Navigation, bottom nav, setup/table/rules routes) | ✅ |
| 6 | Game table shell (wooden table, header, hands, score panel) | ✅ |
| 7+ | Individual game engines (Solitaire, Spider, Rummy, Teen Patti, Flush, 29, Coat Piece, Dehla Pakad, Lakadi) | not started |

The game table screen currently shows a static demo hand (cards drawn from the real `Deck` engine,
just not attached to a rules engine yet) so the rendering pipeline can be verified end-to-end before
any specific game's rules are implemented. Each concrete game replaces that demo content with its
own `CardGameEngine` while reusing the same table shell, header, and card components.

## A note on building in this environment

This project was authored in a sandboxed remote session with **no network access to
`dl.google.com` / `maven.google.com`** (blocked by the sandbox's egress policy). Since the Android
Gradle Plugin, the Android SDK, and AndroidX/Compose artifacts are only published there, a real
`assembleDebug`/`build` could not be run inside that sandbox — `./gradlew` will fail there with
"Plugin `com.android.application` ... was not found". This is an environment restriction, not a
code issue:

- All **pure Kotlin domain logic** (`domain/model`, `domain/game` — cards, deck, deck manager) was
  verified in isolation in a throwaway Kotlin/JVM Gradle module, including the unit tests in
  `app/src/test/java/.../domain/game/DeckTest.kt` — all passed.
- Every Compose/Android file was hand-reviewed for import correctness, `*Scope` receiver usage
  (`RowScope.weight`, `BoxScope.align`, etc.), and resource references (every `R.string.*` used in
  Kotlin was cross-checked against `strings.xml`).
- All XML resources were validated as well-formed.

**On a machine with normal internet access (e.g. via Android Studio), this project will resolve
and build normally** — nothing in the Gradle setup is sandbox-specific. If you hit a real compile
error there, it's a genuine bug — please file it.

## How to open the project

1. Install **Android Studio** (a recent stable release — Ladybug/2024.2 or newer is recommended).
2. `File > Open`, select this repository's root folder (the one containing `settings.gradle.kts`).
3. Let Android Studio sync Gradle and download the Android SDK platform (API 34) if prompted.

## How to build

```bash
./gradlew assembleDebug
```

Or, from Android Studio: `Build > Make Project`.

## How to run

```bash
./gradlew installDebug
```

Or press **Run** in Android Studio with a connected device/emulator (minSdk 24 / Android 7.0+).

## How to run tests

```bash
./gradlew test          # unit tests (app/src/test)
./gradlew connectedAndroidTest   # instrumented tests (app/src/androidTest), needs a device/emulator
```

## Project structure

```
app/src/main/java/com/rangepatte/app/
├── domain/
│   ├── model/     # PlayingCard, Suit, Rank, Player, GameCatalog (game metadata)
│   └── game/      # Deck, DeckManager, CardGameEngine + GameState/GameAction contracts
├── ui/
│   ├── theme/     # Color.kt, Type.kt, Shape.kt, Theme.kt — the only place raw colors live
│   ├── cards/     # PlayingCardView/CardFace/CardBack renderers, CardStack, Hand, CardStyle
│   ├── background/# BackgroundType enum + BackgroundManager (brush per scene)
│   ├── components/# Shared widgets: ClassicalButton, GameTile, WoodenTable, GameHeader, ...
│   ├── home/, games/, history/, settings/, setup/, table/, rules/   # screens
├── navigation/    # Routes.kt, BottomNavItem.kt, RangEPatteNavHost.kt
├── MainActivity.kt
└── RangEPatteApplication.kt
```

Each future game (Phase 7+) gets its own top-level package alongside these
(`com.rangepatte.app.game.rummy`, `.game.teenpatti`, etc. per the original architecture spec) with
an `*Engine.kt`, `*Rules.kt`, and `*Screen.kt` — never touching the shared shell.

## How to add a new game

1. Add a `GameInfo` entry to `domain/model/GameCatalog.kt` (name/description string resources,
   min/max players). It automatically appears in Home and Games grids and becomes navigable —
   `setup/{segment}`, `table/{segment}`, `rules/{segment}` all resolve through the catalog.
2. Implement a `CardGameEngine` (see `domain/game/CardGameEngine.kt`) with its own `GameState`/
   `GameAction` types, under a new `com.rangepatte.app.game.<yourgame>` package.
3. Build a screen that renders your engine's state using the existing card/table components
   (`PlayingCardView`, `Hand`, `CardFan`, `WoodenTable`, `ScorePanel`, ...) instead of
   `GameTableScreen`'s demo content, and wire it into `RangEPatteNavHost.kt` in place of the shared
   `GameTableScreen` call for that route.
4. Add a `RulesScreen` content variant (or extend the shared one) with real rules text.

## How to add a new card design

Card face/back painting lives entirely in `ui/cards/CardStyle.kt` (`CardPalette`),
`CardRenderer.kt` (`CardFace`), and `CardBackRenderer.kt` (`CardBack`). Add a new `CardStyle` enum
value and its `CardPalette` in `CardStyle.kt` — no other file needs to change, since every screen
renders cards through `PlayingCardView`.

## How to add a new background

Backgrounds are procedural gradients today (`ui/background/BackgroundManager.kt`) because real
photography/illustration assets weren't available to fetch in the authoring environment. To use
real artwork:

1. Add the image to `res/drawable/backgrounds/bg_<name>.<ext>`.
2. Add the matching `BackgroundType` enum value in `ui/background/BackgroundType.kt` if it's a new
   scene.
3. In `BackgroundManager`, return an `Image`/`Brush.ShaderBrush` sourced from that drawable instead
   of the gradient for that case. `WatermarkBackground` (in `ui/components/`) already handles the
   low-opacity blur + scrim so text stays readable — nothing else needs to change.

## How to add another language

1. Create `res/values-<languageCode>/strings.xml` (e.g. `values-hi/strings.xml` for Hindi) with the
   same string names as `res/values/strings.xml`, translated.
2. For Devanagari or other non-Latin scripts, swap the placeholder typefaces in
   `ui/theme/Type.kt` (currently `FontFamily.Serif` / `FontFamily.SansSerif`) for a licensed
   Devanagari-compatible font added under `res/font/`.

No code changes are needed beyond that — every user-facing string in the app already goes through
`stringResource(R.string...)`.

## Renaming the app

- Display name: `app_name` in `res/values/strings.xml`.
- Package/applicationId: currently `com.rangepatte.app`, set in `app/build.gradle.kts`
  (`namespace`, `defaultConfig.applicationId`) and mirrored in the Kotlin package structure.
- Launcher icon: `res/drawable/ic_launcher_background.xml` / `ic_launcher_foreground.xml` (adaptive
  icon vectors — replace with real artwork if desired, or regenerate via Android Studio's Image
  Asset tool).

## Legal / product design notes

- No real-money betting, deposits, withdrawals, or gambling wallets exist or are planned in the
  offline single-player/AI experience. Only non-monetary points.
- The app works fully offline for all single-player and AI games — no `INTERNET` permission is
  requested. A future networked-multiplayer mode (see the original spec's `GameRoom` /
  `PlayerConnection` / `GameSynchronizer` interfaces) will be designed as a separate, additive
  layer so it never breaks offline play.
