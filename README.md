# Indian Taash

*"Classic Indian Card Games"* — a native Android app (Kotlin + Jetpack Compose) styled after a
traditional Indian village courtyard: players seated around a woven jute charpai, antique
gold-bordered cards, brass nameplates, warm lantern light. "Indian Taash" is a temporary internal
name; see [Renaming the app](#renaming-the-app) to change it.

This is **not** a real-money gambling app. All scoring uses non-monetary points.

## Status

Phases 1–6 of the build plan are implemented, plus a full visual redesign pass (village-courtyard
theme) and a language/rules/multiplayer-scaffold pass on top of them. This README describes only
what exists today:

| Phase | What | Status |
|---|---|---|
| 1 | Project foundation (Gradle, manifest, app scaffold) | ✅ |
| 2 | Theme (heritage color palette, typography, shapes) | ✅ |
| 3 | Card engine (models, deck, card/back renderers, styles) | ✅ |
| 4 | Home screen (featured/popular/more games grid) | ✅ |
| 5 | Navigation (Compose Navigation, bottom nav, setup/table routes) | ✅ |
| 6 | Game table shell (wooden table, header, hands, score panel) | ✅ |
| — | Village-courtyard visual redesign (charpai table, antique cards, brass plaques, animation) | ✅ |
| — | Language picker + 8-language UI translation (English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Punjabi) | ✅ |
| — | Rules scroll popup with real researched rules content for all 9 games | ✅ |
| — | Per-game vector emblem + one-clause summaries on game tiles | ✅ |
| — | Classical tally-mark score display; gated Undo (AI games only, 3 uses) | ✅ |
| — | Multiplayer architecture scaffold (`GameRoom`/`PlayerConnection`/`GameSynchronizer` interfaces; vs-Computer and Pass & Play modes functional; Nearby/Online shown as "coming soon") | ✅ (scaffold) |
| 7+ | Individual game engines (Solitaire, Spider, Rummy, Teen Patti, Flush, 29, Coat Piece, Dehla Pakad, Lakadi) | not started |
| — | Real Nearby (WiFi/Bluetooth) and Online (internet) multiplayer implementation | not started |

### The redesign, specifically

- **Charpai game table** (`ui/components/WoodenTable.kt`, `TableStyle.CHARPAI`): a procedurally
  drawn woven jute-rope lattice inside a thick wooden frame, replacing the plain wooden panel.
- **Antique cards** (`ui/cards/CardRenderer.kt`, `CardBackRenderer.kt`, `SuitMotifs.kt`): parchment
  face, double gold-rule border with corner flourishes, stylized suit motifs (lotus / ornamental
  diamond / paisley leaf / spear-leaf) alongside the small conventional ♠♥♦♣ corner glyph, and a
  maroon-and-gold mandala card back.
- **Brass/wood player nameplates and buttons** (`PlayerAvatar.kt`, `ScorePanel.kt`,
  `ClassicalButton.kt`): wood-and-brass plaques instead of modern bubbles/flat buttons, with a
  press-down scale animation on buttons.
- **Typography** (`ui/theme/Type.kt`): real bundled Cinzel and Marcellus fonts (see
  [Typography & fonts](#typography--fonts)) for the ornate title/headers, gold-colored with a
  subtle shadow, framed by a small `OrnamentalDivider` flourish.
- **Animation**: cards glow gold and lift slightly when selected; the local player's hand deals in
  with a staggered fade/slide/rotate-settle; a warm gold-to-dark vignette sits over the table.
- **Honest limitation**: the brief also asked for illustrated Mughal-miniature-style King/Queen/Jack
  portraits. There is no image-generation tool available in the authoring environment to paint real
  character artwork, so face cards instead get an ornamental vector crest (crown / diadem / plume —
  see `FaceCardCrest` in `SuitMotifs.kt`) rather than a painted portrait. Swapping in real
  illustrated art later means replacing that one composable's body — no calling screen changes.

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
├── data/
│   └── local/     # LanguagePreferences (SharedPreferences-backed language choice)
├── domain/
│   ├── model/     # PlayingCard, Suit, Rank, Player, GameCatalog, AppLanguage, PlayMode, RulesContent
│   ├── game/      # Deck, DeckManager, CardGameEngine + GameState/GameAction contracts
│   └── multiplayer/ # GameRoom/PlayerConnection/GameSynchronizer — architecture scaffold, unimplemented
├── ui/
│   ├── theme/     # Color.kt, Type.kt, Shape.kt, Dimens.kt, Theme.kt — design tokens live here
│   ├── cards/     # PlayingCardView/CardFace/CardBack renderers, SuitMotifs, CardStack, Hand, CardStyle
│   ├── background/# BackgroundType enum + BackgroundManager (brush per scene)
│   ├── components/# Shared widgets: ClassicalButton, GameTile, GameEmblem, WoodenTable, GameHeader, OrnamentalDivider, ...
│   ├── language/  # LanguageSelectionScreen, locale-wrapping utilities
│   ├── rules/     # RulesDialog — the scroll-styled "how to play" popup
│   ├── home/, games/, history/, settings/, setup/, table/   # screens
├── navigation/    # Routes.kt, BottomNavItem.kt, RangEPatteNavHost.kt
├── MainActivity.kt
└── RangEPatteApplication.kt
```

Each future game (Phase 7+) gets its own top-level package alongside these
(`com.rangepatte.app.game.rummy`, `.game.teenpatti`, etc. per the original architecture spec) with
an `*Engine.kt`, `*Rules.kt`, and `*Screen.kt` — never touching the shared shell.

## How to add a new game

1. Add a `GameInfo` entry to `domain/model/GameCatalog.kt` (name/description string resources,
   min/max players, a `GameEmblem` case — see below). It automatically appears in Home and Games
   grids and becomes navigable — `setup/{segment}` and `table/{segment}` resolve through the
   catalog with no new route needed.
2. Add a `GameRules(...)` entry for it in `domain/model/RulesContent.kt` — that's what the rules
   scroll popup renders; without one it falls back to a "rules coming soon" placeholder.
3. Implement a `CardGameEngine` (see `domain/game/CardGameEngine.kt`) with its own `GameState`/
   `GameAction` types, under a new `com.rangepatte.app.game.<yourgame>` package.
4. Build a screen that renders your engine's state using the existing card/table components
   (`PlayingCardView`, `Hand`, `CardFan`, `WoodenTable`, `ScorePanel`, ...) instead of
   `GameTableScreen`'s demo content, and wire it into `RangEPatteNavHost.kt` in place of the shared
   `GameTableScreen` call for that route.
5. Add a `when` branch for the new `GameId` in `ui/components/GameEmblem.kt` with a `draw*Emblem`
   function for its tile icon (procedural vector, matching the existing games — no image asset
   needed).

## How to add a new card design

Card face/back painting lives entirely in `ui/cards/CardStyle.kt` (`CardPalette`),
`CardRenderer.kt` (`CardFace`), `CardBackRenderer.kt` (`CardBack`), and `SuitMotifs.kt` (the
lotus/diamond/paisley/spear-leaf suit emblems and the King/Queen/Jack ornamental crests). Add a new
`CardStyle` enum value and its `CardPalette` in `CardStyle.kt` for a new color scheme, or edit the
`draw*` functions in `SuitMotifs.kt` for new motif shapes — no other file needs to change, since
every screen renders cards through `PlayingCardView`.

## Typography & fonts

`ui/theme/Type.kt` defines three role tokens — `DisplayFont` (titles/headers), `TitleFont`
(buttons/player names), `BodyFont` (scores/settings/small text) — used everywhere instead of
inlining a `FontFamily`. `DisplayFont`/`TitleFont` are backed by two real font files bundled under
`app/src/main/res/font/` (Cinzel, a variable font, and Marcellus, static regular) — both fetched
from Google's open-source `google/fonts` repository and licensed SIL OFL 1.1; see
`THIRD_PARTY_NOTICES.md` and `licenses/fonts/` for the full license text and provenance.
`BodyFont` stays on the zero-cost platform serif for legibility at small sizes without adding a
third bundled font. To swap either font, replace the `.ttf` under `res/font/`, update the
`Font(R.font....)` reference in `Type.kt`, and update the license notice accordingly.

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

## Languages

The app opens on a language picker (`ui/language/LanguageSelectionScreen.kt`) before anything
else, per the design brief — the chosen language is saved (`data/local/LanguagePreferences.kt`,
plain `SharedPreferences`, since it must be read synchronously in `Activity.attachBaseContext()`
before Compose exists yet) and can be changed again later from Settings. All UI chrome — nav,
buttons, headers, setup, settings, and every game's name and one-clause summary — is fully
translated into all 8 supported languages: English, Hindi, Tamil, Telugu, Kannada, Marathi,
Bengali, Punjabi (see `domain/model/AppLanguage.kt`).

**Scope note:** the rules-scroll content (`domain/model/RulesContent.kt`) is English-only for now.
Translating that many detailed rule bullets (~150 lines) into 7 languages accurately needs native-
speaker review this environment can't provide, so — unlike the rest of the UI — it was deliberately
left out of the translation pass rather than shipped with unreviewed machine translations for
content this detailed. The 8-language string translations that *are* included (all `values-*/strings.xml`
files) were also produced without native-speaker review and should get one before shipping, same
as any machine-assisted localization.

### How to add another language

1. Add a case to `AppLanguage` in `domain/model/AppLanguage.kt` (locale tag + its name in its own
   script + its English name).
2. Create `res/values-<languageCode>/strings.xml` (e.g. `values-hi/strings.xml` for Hindi) with the
   same string names as `res/values/strings.xml`, translated — every existing translation file is a
   ready template for the exact key set expected.
3. For a script Android's default fonts don't already cover well, add a compatible font (e.g. Noto
   Serif Devanagari or Tiro Devanagari, both on Google's `google/fonts` GitHub repo under OFL) to
   `res/font/` and reference it from `BodyFont`/`DisplayFont` in `ui/theme/Type.kt` — see
   [Typography & fonts](#typography--fonts) for how the existing Cinzel/Marcellus fonts were
   sourced and licensed the same way. (The 7 languages already added render through Android's
   built-in system font fallback and needed no extra font bundled.)

No other code changes are needed — every user-facing UI string already goes through
`stringResource(R.string...)`.

## Renaming the app

- Display name: `app_name` in `res/values/strings.xml`.
- Package/applicationId: currently `com.rangepatte.app`, set in `app/build.gradle.kts`
  (`namespace`, `defaultConfig.applicationId`) and mirrored in the Kotlin package structure.
- Launcher icon: `res/drawable/ic_launcher_background.xml` / `ic_launcher_foreground.xml` (adaptive
  icon vectors — replace with real artwork if desired, or regenerate via Android Studio's Image
  Asset tool).

## Multiplayer roadmap

`domain/model/PlayMode.kt` and `domain/multiplayer/Multiplayer.kt` hold the current state of this:

- **Working today:** `VS_COMPUTER` (play against AI) and `PASS_AND_PLAY` (multiple local players,
  same device) — both purely local, no networking involved.
- **Scaffolded, not implemented:** `NEARBY` (WiFi-Direct/Bluetooth, for players near each other
  without internet) and `ONLINE` (internet play). Both appear in the setup screen already, disabled
  with a "coming soon" label. `GameRoom`, `PlayerConnection`, and `GameSynchronizer` in
  `domain/multiplayer/Multiplayer.kt` are the interfaces a real implementation would fill in — no
  transport, server, or Nearby Connections code exists yet.
- **Why scaffold-only:** real networking needs a backend/transport decision (Firebase vs. a custom
  server vs. Android's Nearby Connections API) and, critically, a second physical device to test
  against — neither was available in the environment this was authored in. Building it blind would
  have meant shipping untested networking code.
- **To implement Nearby:** build a `GameRoom`/`PlayerConnection` pair backed by Android's Nearby
  Connections API (handles both WiFi and Bluetooth transport selection automatically), wire it into
  a `GameSynchronizer`, and flip the two disabled `FilterChip`s in `GameSetupScreen.kt` back on.
- **To implement Online:** the same interfaces, backed by a chosen realtime backend (Firebase
  Firestore/Realtime Database is the lowest-setup option — no server to host).

## Legal / product design notes

- No real-money betting, deposits, withdrawals, or gambling wallets exist or are planned in the
  offline single-player/AI experience. Only non-monetary points.
- The app works fully offline for all single-player, AI, and Pass & Play games — no `INTERNET`
  permission is requested yet. That permission, and any networking code, only gets added once real
  Nearby/Online multiplayer (see above) is actually implemented, so it never breaks offline play.
