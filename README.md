# Indian Taash

*"Bharatiya Khel, Bharatiya Tarike"* — a native Android app (Kotlin + Jetpack Compose) styled after a
an old royal Indian card room: an antique waxed-walnut table, aged-ivory cards with gold borders and
royal court portraits, brass nameplates, warm lantern light. "Indian Taash" is a temporary internal
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
| 4 | Home screen — later replaced by the Khel page at the owner's request | ✅ |
| 5 | Navigation (Compose Navigation, bottom nav, setup/table routes) | ✅ |
| 6 | Game table shell (wooden table, header, hands, score panel) | ✅ |
| — | Royal card-room redesign (waxed hardwood table, antique ivory deck with K/Q/J portraits, plaques) | ✅ |
| — | Language picker + 8-language UI translation (English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Punjabi) | ✅ |
| — | Rules scroll popup with real researched rules content for every game | ✅ |
| — | One-clause summaries on game tiles | ✅ |
| — | Classical tally-mark score display; gated Undo (AI games only, 3 uses) | ✅ |
| — | Royal-court UI kit (strategy-game-style carved panels, crimson/steel buttons, options rows, portrait cards, command slots) applied to every screen | ✅ |
| — | Owner feedback pass: language switches instantly (no restart); Home and categories removed — the app opens on **Khel** (all games in one grid); Teen Patti and Flush merged into "Teen Patti / Flush"; card-art thumbnails per game; rules in the chosen language with an English toggle; all text +2sp; History tab → empty **Entertainment** tab | ✅ |
| — | Login / Sign up by mobile number + SMS OTP, user records in an online database (Firebase) | ✅ (needs your Firebase project — demo mode until then) |
| — | Google AdMob ads (banner on every page, occasional full-screen ad after a game) with consent form | ✅ (test ad IDs until you add yours) |
| — | ₹29/month "Remove ads?" membership + payment gateway screen | ✅ (gateway scaffold — payment partner to be plugged in) |
| — | Multiplayer: Nearby (Bluetooth/Wi-Fi) and Online (room code) tables for six games, computer fills empty seats — see *Playing with other people* | ✅ (untested on devices) |
| 7+ | **All eight games are playable** against the computer: Solitaire, Spider Solitaire, Rummy, Teen Patti / Flush, Twenty Nine, Coat Piece, Dehla Pakad, Lakadi — each with its own engine, computer player, screen and Undo (3 uses) | ✅ |
| — | Playing against other people: Nearby (Bluetooth/Wi-Fi) and Online (room code) | ✅ built, untested on devices · Pass & Play on one phone not started (shown as "coming soon") |

### The royal card-room design system

Every game shares one look, built from a few pieces (all drawn in code — no bitmaps, so it is crisp at
any size and adds nothing to the download):

- **Antique wood table** (`ui/components/AntiqueWoodTable.kt`): `GameFrame` puts every game on one
  large waxed-walnut table — long grain with cathedral figures, a slanting wax sheen and lamp glow,
  darkened edges, a thick mahogany frame with a bevel, brass inlay line, carved groove with brass
  studs, a shadowed lip, and carved gold corner flourishes. The old woven-rope "net" is gone.
- **The antique deck** (`ui/cards/AntiqueCard.kt`, `SuitPips.kt`, `RoyalPortraits.kt`): aged ivory
  with paper grain and darkened edges, gold border with a fine inner rule, large mirrored corner
  indices, clean suit pips in standard 2–10 layouts, a medallion Ace, and **original Mughal-miniature
  style K/Q/J portraits** (jewelled turban and aigrette for the King, mukut crown, veil and nath for
  the Queen, a young prince with a peacock feather for the Jack), double-ended like a real deck. One
  renderer serves `CardView`, the game thumbnails and the legacy `PlayingCardView`.
- **Royal card back** (`drawRoyalCardBack`): burgundy, antique gold, a lotus medallion and corner buds
  — the same in every game.
- **Plaques, turn badge, buttons** (`royal/AntiquePlaque.kt`, `TurnIndicator.kt`, `RoyalButton.kt`):
  walnut nameplates with a double gold rule and brass studs (glowing on a player's turn), a gold
  pill "Your turn" badge, gold-rimmed buttons.
- **Responsive hands** (`game/common/HandLayout.kt`): `fanLayout` / `groupPlan` pick the largest cards
  that fit the table (`LocalTableArea`, provided by `GameFrame`) — one fanned row, or two overlapped
  rows for 13 cards when that makes the cards clearly bigger. Selected cards rise with a warm glow.
- **Typography** (`ui/theme/Type.kt`): bundled Cinzel and Marcellus for titles, a legible serif for
  information (see [Typography & fonts](#typography--fonts)).
- **Honest limitation**: the K/Q/J are hand-built vector illustrations, not painted artwork — there is
  no image tool here. They read as ornamental court miniatures at card size; for painted art, replace
  the body of `drawBust` in `RoyalPortraits.kt` (or draw a bitmap there); no calling code changes.

### Royal-court UI kit

Menus follow the look of classic strategy-game interfaces (the reference was Age of Empires III's
menus): dark carved-wood panels, double bevelled-gold frames with corner caps, small-caps titles
over a fading gold rule, rectangular crimson/steel buttons. Only the *style* is reproduced — every
element is drawn procedurally in `ui/components/royal/`; no artwork, logos or portraits from any
existing game are used. The building blocks:

- `RoyalPanel` / `GoldRule` — the carved container every screen is built from.
- `RoyalButton` (`CRIMSON` primary, `STEEL` secondary) — the only button style in the app.
- `RoyalSectionTitle`, `RoyalOptionRow`, `RoyalOrbToggle`, `RoyalSlider` — the Settings screen's
  options-panel rows.
- `RoyalSlot` — square command slots (play mode, player count) on the setup screen.
- `GamePortrait` / `GameTile` (`ui/components/GameTile.kt`) — framed game portraits with a crimson
  name plaque. The picture inside each portrait is `GameThumbnail` (`ui/thumbnails/`): real cards
  drawn with the app's own card style in each game's signature arrangement — a trail of aces for
  Teen Patti / Flush, K-Q-J of hearts for Rummy, J-9-A-10 of diamonds for Twenty Nine, four aces on
  their foundations for Solitaire, A→2 of clubs fanned like a hand for Coat Piece, the four tens for
  Dehla Pakad, a hand-written four-player score sheet for Lakadi, and a spades K→A cascade for
  Spider Solitaire.
- `AppTopBar` (`ui/chrome/`) — the strip on every page: "Remove ads?" call-in tab on the left,
  Login / Sign up (or the signed-in player) on the right.

The app uses one fixed dark colour scheme (`ui/theme/Theme.kt`) regardless of the system setting,
since the heritage look is its identity rather than a user preference. Grids reflow to 2/3/4
columns by width, and the setup screen goes side-by-side on screens 600dp and wider.

## The games

Each game lives in its own package under `game/<name>/` with a pure-Kotlin **engine** (rules, no
Android code, unit-tested), a **computer player** (`*Ai.kt`) and a **screen**. `ui/table/GameTableScreen.kt`
just opens the right one. Shared pieces are in `game/common/` (`CardView`, `GameFrame` with header /
Rules / Undo, result dialogs, `UndoHistory`) and `game/tricks/` (the trick-taking core — follow suit,
trumps, winner, computer card play, four-seat table, bid and trump dialogs — used by the four
trick games).

| Game | Players | How it plays here |
|---|---|---|
| Solitaire | 1 | Klondike. Tap a card, then where it goes. Easy turns 1 card, Medium/Hard turn 3. Auto-finish when all cards are face-up. |
| Spider Solitaire | 1 | Two decks. Easy 1 suit, Medium 2, Hard 4. Tap a card to pick up its run, tap a column to place it; tap the stock to deal. |
| Rummy | 2–6 | 13 cards, two decks + jokers, random wild joker. Your hand is auto-arranged into melds; Declare when all cards are grouped (pure sequence + 2 sequences). The computer works out the best melds with a bitmask search. |
| Teen Patti / Flush | 3–6 | Points only: boot, blind/seen, call, raise (stake doubles to a cap), pack, show. Hands are revealed at a show. |
| Twenty Nine | 4 (you + partner vs 2) | Bid 15–28 on four cards, secret trump chosen by the top bidder, hidden until someone can't follow suit, 28 card points. First to ±6 game points. |
| Coat Piece | 4 (you + partner vs 2) | Trump caller sees 5 cards, then 13 tricks; 7+ tricks scores a court; first to 3 courts. |
| Dehla Pakad | 4 (you + partner vs 2) | Trump is named by the first player who can't follow suit; won tricks pile up and are taken by whoever wins two in a row; capture the tens (all four = Kot). 7 hands in a row wins the match. |
| Lakadi | 4 (each alone) | Spades always trump; bid 1–13 tricks; exact bid scores the bid, +0.1 per extra trick, a miss loses the bid; five hands. |

The computers play at Easy / Medium / Hard: Easy makes occasional random plays, Hard never does.
**Pass & Play** (several people on one phone) is shown as locked for now — hidden hands need a
hand-over screen — and Nearby/Online are the next step (see below).

**Testing:** the engines have 47 JUnit tests (`app/src/test/.../game/`), including whole games played
by the computer against itself that check every card is accounted for, every move is legal and scores
add up. They run on a plain JVM — `./gradlew test`.

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
- The pure-Compose files (game thumbnails, card motifs, rules books, top bar, login / membership /
  checkout / Khel / Entertainment screens, rules dialog, royal UI kit) were type-checked against the
  real Compose 1.7 libraries in a throwaway Compose-Desktop module (Android-only pieces stubbed),
  and the thumbnails were rendered to an image to check them visually.
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
│   ├── local/     # LanguagePreferences (SharedPreferences-backed language choice)
│   ├── ads/       # AdsManager — AdMob + consent, interstitial pacing, membership gating
│   ├── auth/      # Phone OTP auth (Firebase / demo), AccountRepository, UserDirectory (Firestore "users")
│   ├── membership/# MembershipRepository + MembershipPlan (₹29 / 30 days)
│   └── payment/   # PaymentGateway interface + PlaceholderPaymentGateway
├── domain/
│   ├── model/     # PlayingCard, Suit, Rank, Player, GameCatalog, AppLanguage, PlayMode
│   ├── rules/     # RulesContent + one rules book per language (RulesEn.kt, RulesHi.kt, …)
│   └── game/      # Deck, DeckManager, CardGameEngine + GameState/GameAction contracts
├── net/           # multiplayer: lockstep sessions, lobby, Nearby + Firestore transports (see below)
├── ui/
│   ├── theme/     # Color.kt, Type.kt, Shape.kt, Dimens.kt, Theme.kt — design tokens live here
│   ├── cards/     # AntiqueCard/SuitPips/RoyalPortraits (the deck), CardBack, PlayingCardView, CardStack, Hand, CardStyle
│   ├── background/# BackgroundType enum + BackgroundManager (brush per scene)
│   ├── components/# Shared widgets: royal/ UI kit, GameTile, AntiqueWoodTable, GameHeader, OrnamentalDivider, ...
│   ├── thumbnails/# GameThumbnail, MiniCard, LakadiScoreSheet — the card art on each game tile
│   ├── chrome/    # AppTopBar ("Remove ads?" + Login strip shown on every page)
│   ├── ads/       # BannerAdSlot
│   ├── language/  # LanguageSelectionScreen, ProvideAppLocale (instant language switching)
│   ├── rules/     # RulesDialog — the scroll-styled "how to play" popup
│   ├── account/   # LoginScreen + LoginViewModel (mobile number → OTP)
│   ├── membership/# MembershipScreen ("Remove ads?") + CheckoutScreen (payment gateway)
│   ├── games/ (Khel), entertainment/, settings/, setup/, table/   # screens
├── navigation/    # Routes.kt, BottomNavItem.kt, RangEPatteNavHost.kt
├── game/
│   ├── common/    # CardView, GameFrame (header + Rules + Undo), dialogs, UndoHistory, seat plaques
│   ├── tricks/    # shared trick-taking core: engine, computer player, TrickTable, bid/trump dialogs
│   ├── solitaire/ spider/ rummy/ teenpatti/ twentynine/ coatpiece/ dehlapakad/ lakadi/
│   │              # per game: *Engine.kt (rules) + *Ai.kt (computer player) + *Screen.kt
├── AppServices.kt # app-wide singletons (membership, account, ads, payment gateway)
├── MainActivity.kt
└── RangEPatteApplication.kt
```

Each future game (Phase 7+) gets its own top-level package alongside these
(`com.rangepatte.app.game.rummy`, `.game.teenpatti`, etc. per the original architecture spec) with
an `*Engine.kt`, `*Rules.kt`, and `*Screen.kt` — never touching the shared shell.

## How to add a new game

0. (Overview) A game is three small files under `game/<name>/`: an engine, a computer player, a screen.
1. Add a `GameInfo` entry to `domain/model/GameCatalog.kt` (name/description string resources,
   min/max players, a `GameThumbnail` case — see below). It automatically appears on the Khel
   page and becomes navigable — `setup/{segment}` and `table/{segment}` resolve through the
   catalog with no new route needed.
2. Add a `GameRules(...)` entry for it to each rules book in `domain/rules/` (`RulesEn.kt` at least
   — other languages fall back to English) — that's what the rules scroll popup renders.
3. Write the engine as plain immutable Kotlin (a state class plus functions that return the next
   state) in `game/<yourgame>/`, with unit tests. For a trick-taking game, reuse `game/tricks/`.
4. Build a screen with `GameFrame` + `CardView` (see any existing `*Screen.kt`) and add one line for
   your `GameId` in `ui/table/GameTableScreen.kt`.
5. Add a `when` branch for the new `GameId` in `ui/thumbnails/GameThumbnail.kt` describing its
   signature cards (the `fan(...)` helper covers most layouts) — no image asset needed.

## How to change the card design

Card painting lives in `ui/cards/`: `AntiqueCard.kt` (the classic white face, border, indices, pip layouts, Ace, Joker and
the red lattice back `drawRoyalCardBack`), `SuitPips.kt` (the four suit shapes), `RoyalPortraits.kt` (K/Q/J) and
`CardStyle.kt` (ink and paper colours). Every screen shows cards through `CardView`
(`game/common/CardView.kt`), and the game thumbnails call the same drawing functions, so a change
there changes the whole app.

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

The app opens on a language picker (`ui/language/LanguageSelectionScreen.kt`) the first time —
the chosen language is saved (`data/local/LanguagePreferences.kt`) and can be changed again later
from Settings. A change applies **instantly**, without restarting: `ProvideAppLocale`
(`ui/language/LocaleUtils.kt`) re-provides a localized `Context`/`Configuration` to the whole
Compose tree, so every `stringResource` re-resolves on the spot. All UI chrome — nav,
buttons, headers, setup, settings, and every game's name and one-clause summary — is fully
translated into all 8 supported languages: English, Hindi, Tamil, Telugu, Kannada, Marathi,
Bengali, Punjabi (see `domain/model/AppLanguage.kt`).

The rules scroll shows each game's rules in the chosen language, with a tab to switch to English
(`domain/rules/` — one Kotlin rules book per language). **All translations (the `values-*/strings.xml`
files and the rules books) were produced without native-speaker review and should get one before
publishing**, as with any machine-assisted localization.

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

## Playing with other people

Rummy, Teen Patti / Flush, Twenty Nine, Coat Piece, Dehla Pakad and Lakadi can be played with
friends. On the game's setup page pick **Nearby** or **Online**, then **Host a table** or **Join a
table**. The host starts the game when everyone is in; any seat nobody takes is played by the
computer, at the difficulty chosen on the setup page. (Solitaire and Spider Solitaire are one-player
games; Pass & Play is still shown locked.) Undo is never offered at a table with other people.

- **Nearby (Bluetooth / Wi-Fi, no internet):** Google *Nearby Connections* in star mode — the host
  advertises, guests tap the host's name. The app asks for the Bluetooth/Nearby permissions on first
  use (location on Android 11 and older, which Android requires for Bluetooth scanning).
- **Online (internet):** the host gets a 5-character **room code** and shares it; friends type it in.
  Needs Firebase (below) **and** everyone logged in, because the room lives in Firestore.

### How it works (`net/`)

Every game is an immutable state plus pure functions, so a table is a *lockstep* session: the host
checks each move, numbers it, and sends it to everyone; every phone applies the same numbered moves
in the same order and so ends up with the same game. Shuffles are seeded, so they match too.

| File | Job |
|---|---|
| `net/core/Wire.kt` | the text messages phones send (`JOIN`, `LOBBY`, `START`, `ACT`, `DO`, `BOT`, `LEAVE`, `REJECT`; for watchers `VIEW`, `SEAT`, `HUMAN`; table talk `SAY`) |
| `net/core/Codec.kt`, `game/tricks/TrickCodec.kt` | every game state as text (`encodeState`/`decodeState`) and `redact` — the same state with other hands replaced by hidden cards |
| `net/core/SessionCore.kt`, `GameMachine.kt` | host-authoritative move numbering; a small adapter per game (`game/<name>/*Machine.kt`) |
| `net/core/Lobby.kt` | who has joined, seat assignment, filling empty seats with computer players |
| `net/Transport.kt` | "send text to the host / a peer / everyone" — all the game ever sees |
| `net/nearby/` | the Transport over Bluetooth/Wi-Fi |
| `net/online/` | the Transport over Firestore (`rooms/{code}` with `inbox`, `log`, `presence`) |
| `net/GameSession.kt` | what a game screen uses: current state, `submit(move)`, computer players, leaving |
| `ui/multiplayer/` | the lobby screen and `LobbyController` (the Android glue) |

If a player leaves mid-game the computer takes over their seat; if the *host* leaves, the table ends.

**Watching a table and joining the next round (Friends Element 10, approved Design 1).** Anyone who
joins a table that is already playing — by typing its room code, tapping it in the Nearby list, or
pressing **Watch** on a friend's profile when they are at a full online table — becomes a *spectator*:

- The host sends them `START` with seat `-1` and a **blank seed** (the real seed would reveal every
  deal), then a `VIEW` after every step: the whole game with every hand replaced by hidden cards
  (`GameMachine.redact(state, null)`). Played cards, bids, trump (once it is public), scores and whose
  turn it is are all visible; a watcher's phone never holds a card that a player across the table
  couldn't see. Spectators cannot move, bid or undo; the host ignores `ACT` from them.
- The screen is the same antique table with a gold **Watching** pill, every hand face-down, and a
  ribbon: *"You'll take a seat when this round ends · 4 tricks left"* (or *"Every seat is taken — you
  can keep watching"*) with a **Leave** button.
- At the round boundary (`GameMachine.isRoundBoundary`) the host gives each waiting watcher the lowest
  computer seat, first come first served: everyone gets `HUMAN|seat|name` (only the name changes, via
  `GameMachine.rename`, so every phone stays in step) and the newcomer gets `SEAT` with the full game
  and the real seed, and plays from then on like any other guest ("You're in!"). Up to four people can
  watch one table. A finished match counts as a boundary too, so a watcher is seated before "New match".
- Nearby hosts keep advertising after the game starts; online rooms with status `playing` can be
  joined (as a watcher). The Firestore rules above already allow this (a watcher reads `log`).
  Tested in `SpectatorCoreTest` (every game: watch, seat at the boundary, stay in sync) and
  `StateCodecTest` (every state round-trips; a redacted view carries no hidden card).

**Table talk (Friends Element 11, approved Design 1).** At any table with other people, a gold speech
button in the top-left corner of the table opens a parchment tray: ten fixed phrases ("Hello!",
"Good luck", "Nice move", "Well played", "Your turn!", "Oops", "Thanks", "Good game", "One more?",
"Back in a moment") and eight emoji (👍 😂 😮 🙏 🔥 😢 ❤️ 🃏). Nothing is typed, ever: a message is an
id (`SAY|seat|id`, `domain/talk/TableTalk.kt`), so each phone shows it in its own language and there is
nothing to moderate. Guests send to the host, the host relays to everyone (watchers included) with the
real seat; computer players never speak; solo tables have no button. A received message is a small
parchment plaque in the corner nearest the sender's nameplate for three seconds (never over the
trick or your hand), with a soft card sound. Limits, applied on the sender's phone *and* again by the
host: one message every 2 s, at most 5 in 30 s. Watchers may send emoji but not phrases. The tray's
**Mute** row silences any seat for the rest of the match on your phone only. Every emoji has a spoken
label for screen readers. Tested in `TableTalkTest`.

**Notification bell and centre (Friends Element 12, approved Design 1).** A brass bell with a crimson
unread count sits in the top bar of Khel, Entertainment and Friends for a signed-in player. Tapping it
drops a parchment scroll under the bar with the items grouped **New** (unread when it was opened) and
**Earlier**, each with its one action inline: Accept (friend request), Play (an accepted request opens
the person's page; a live play request accepts it and opens the lobby), Poke back (Element 13). Tapping
a line opens the person; × removes it; "Clear all" at the foot. The list is *derived*, not stored on a
server: `data/notifications/NotificationRepository.kt` watches the relations (requests received, requests
accepted) and play requests the app already follows, plus one-off notices other features post
(`post()`: a poke, "you have a seat"); the pure rules in `domain/notifications/Notice.kt` keep 7 days and
50 items, keep an answered request listed without its action, and never list one thing twice. Read and
dismissed ids are remembered on the phone per account, so the count survives a restart. "A friend came
online" is off until the per-friend opt-in arrives with Element 16. Tested in `NoticeBookTest`.

*Device push later:* a Cloud Function on `relations` / `playRequests` / `pokes` writes can send an FCM
message to the recipient's device token (stored on `profiles/{uid}.fcmToken`); the app would then show
the same notice. Nothing in the centre depends on it.

**Poke (Friends Element 13, approved Design 1).** On a friend's page the crimson **👉 Poke** button sits
next to Play request. It works only for a friend who is online; after a poke it turns steel and counts
down ("Poked · 9:58") and a parchment line confirms "You poked priya_q". One poke per friend every ten
minutes and at most 20 an hour, counted on the phone (`domain/pokes/Pokes.kt`, `PokesTest`) and
enforced by the rule below. A poke is one record per direction, `pokes/{fromUid_toUid}` = `{from, to, t}`
(`data/pokes/PokeRepository.kt`); the receiver's phone posts it to the notification centre ("rahul29
poked you · Poke back", which pokes straight back when allowed) and exposes it for the Element 14
animation. Demo mode: priya_q pokes back after three seconds. Rule to add:
```
match /pokes/{id} {
  allow read: if request.auth != null && resource.data.to == request.auth.uid;
  allow create, update: if request.auth != null && request.resource.data.from == request.auth.uid
    && id == request.auth.uid + "_" + request.resource.data.to
    && (resource == null || request.resource.data.t - resource.data.t >= 600000);
}
```

**Poke animation (Friends Element 14, approved Design 1).** When a poke arrives while the app is in
front, the page gives one short shiver (0.4 s, a few pixels side to side), a gold pointing hand taps
twice in the middle of the screen, and a parchment banner drops from under the top bar: the sender's
avatar and name, "poked you", and **Poke back** (same cooldown rules; disabled when not allowed).
Tapping the name opens the profile; the banner leaves after five seconds or on tap. At a game table
only the banner shows, never over the cards. With the system's animator scale at 0 ("remove
animations") the banner fades in and nothing moves. One card flick and one haptic tick accompany it
(Element 15 adds the switches). `ui/pokes/PokeOverlay.kt` + `PokeRoute.kt`, mounted over the NavHost,
which offsets its content by the shiver.

**Poke settings (Friends Element 15, approved Design 1).** A **Pokes** plaque on the Settings page,
right under Sound and music, for a signed-in player: Receive pokes, Sound, Vibration (the app's own
orb switches), a segmented **Who may poke me** row (All friends / Favourites / Nobody) and the **Muted
people** chips with × to unmute. Defaults: everything on, all friends. Kept per account on the phone
(`data/pokes/PokePrefsRepository.kt`); receive and audience are mirrored to `profiles/{uid}.pokePrefs`
so a sender is told "priya_q is not taking pokes right now" instead of poking a wall (the Firestore
store reads it before writing). A friend is starred as a **Favourite** or **muted** from the ⋯ menu on
the Friends list or from the two steel buttons on their page; stars show on the row. On the receiving
phone `PokePrefs.accepts()` (`PokePrefsTest`) drops anything from a muted person or outside the chosen
audience before it can animate or notify. Do Not Disturb is respected by Android itself for the sound
and the vibration. (Muting a person does not yet silence their table talk: table talk is muted by seat
at the table, and seats are not tied to accounts on Nearby tables.)

**My Profile (Friends Element 16, approved Design 1).** The account tab in the top bar opens the
player's own page once signed in (`ui/profile/MyProfileScreen.kt`, `MyProfileRoute.kt`): the nameplate
hero with gold pencils on the avatar (opens the Element 3 gallery) and on the name (opens the Element 2
screen in edit mode), then three plaques with the app's orb switches.
- *Privacy:* **Appear offline** (the Element 8 flag; play requests to you are refused meanwhile),
  **Let contacts find me by phone** (writes or removes the SHA-256 hash on `profiles/{uid}.phoneHash`;
  off by default), **Accept play requests** (off: each incoming request is declined at once).
- *Notifications:* friend requests and play requests on/off (the centre stops deriving them), and
  **When a friend comes online** with a chooser over your friends; the chosen ones post a notice when
  their presence turns from offline to online.
- *Account:* the phone number shown masked (`•••• 4321`) and never editable here; **Change username**
  with the 30-day rule (`domain/profile/ProfileRules.kt`, `ProfileRulesTest`): the first name is free,
  every later change waits 30 days, and the page says when the next one is allowed. A name given up is
  *released*, not deleted: `usernames/{old}` keeps `releasedAt`, and both the availability check and the
  claim transaction treat it as taken for 30 days. **Log out** asks once. **Delete account** explains
  what goes (profile, username, picture, presence, settings) and deletes the profile, username and
  presence documents, then signs out. Relations and play requests that name the deleted account should
  be swept by a Cloud Function on `profiles/{uid}` delete (not written here); demo mode deletes
  locally. Switches live on the phone per account (`data/profile/MyProfilePrefs.kt`).

**Loading, empty, error and offline states (Friends Element 17, approved Design 1).** Every Friends
list has all four (`ui/components/royal/RoyalStates.kt`): **loading** shows the page's shape — skeleton
rows with a slow gold shimmer (still rows when the system's animator scale is 0); **empty** is an
invitation with the one button that fixes it (Friends and Online → *Find*; Online with friends →
"nobody online right now · N friends"; Requests → "none waiting"; search → "no one called @…" with a
spelling hint); **error** is a plaque naming the plain cause (no connection, server did not answer,
server refused the request) with **Retry**, which reopens the relations listener
(`FriendsRepository.error/loaded/retry`); **offline** (`data/net/ConnectivityMonitor`) is a hairline
gold band at the top of the page: cached friends, requests and notices stay visible, and every send
or accept is parked — the button shows "No connection. Try again when you're back online." instead
of failing silently. A failed action (request, accept, remove, block) shows a short toast and leaves
the button pressable. Every state is announced to screen readers (live regions). Demo mode never
shows the band.

### Online play: Firebase setup

On top of the login setup below, in the Firebase console:

1. **Authentication → Phone** must be enabled (it already is for login).
2. **Firestore rules** — signed-in players may use rooms:
   ```
   match /rooms/{code} {
     allow read, create, update: if request.auth != null;
     match /{sub=**} { allow read, write: if request.auth != null; }
   }
   ```
   (Tighten this before a real launch, e.g. only the room's `host` may write `log` and update the room.)
3. **TTL policy** (Firestore → Time-to-live): collection group `rooms`, field `expireAt`, so finished
   rooms delete themselves after six hours.

### Honest limitations

- **Never tried on real phones.** The game logic and the sync protocol are covered by a simulated
  four-phone test (`MultiplayerSessionTest`: every game, shuffled/duplicated deliveries, mixed
  people-and-computer tables, players leaving). The Nearby, Firestore and lobby code is
  Android-only, and has been written but not yet run on two devices — expect first-run fixes.
- **Cards are not hidden from a hacked phone.** In lockstep every *seated* phone computes the whole
  game, including other players' hands (watchers only ever receive a redacted copy). That is fine
  among friends; a server that deals privately would be needed for strangers or stakes.
- Nearby needs both phones within a few metres; online play with a flaky connection can drop a
  table (the guest sees "Connection lost").

## Player profile (username and avatar)

After a first OTP sign-in the player picks a **username** (`ui/profile/UsernameScreen.kt`) and an
**avatar** (`AvatarScreen.kt`). Rules live in `domain/profile/Username.kt` (3–16 chars, letters/digits/_,
case-insensitive, reserved list) and are unit-tested. Uniqueness is enforced by the store
(`data/profile/ProfileRepository.kt`): in Firestore a transaction on `usernames/{lowercase}` reserves
the name, so two players can never end up with the same one; `profiles/{uid}` holds `username` and
`avatarId`. Phone numbers never leave the owner-only `users` collection. In demo mode names are
reserved on the phone only.

**Avatar artwork is not in the repository yet.** The picker shows twenty numbered coloured discs until
the PNGs are added. Drop the 20 files into `app/src/main/res/drawable/` with exactly these names
(lowercase, from `domain/profile/AvatarCatalog.kt`): `avatar_01_focused_strategist.png` …
`avatar_20_mature_mentor_female.png` (square, 512–1024 px; they are shown cropped to a circle). No
code change is needed; rebuild and they appear.

Firestore rules to add for these collections (signed-in users only; a username doc may only be
created by the user it names and never changed):
```
match /profiles/{uid} { allow read: if request.auth != null; allow write: if request.auth.uid == uid; }
match /pokes/{id} { ... }  // see the Friends section
match /usernames/{name} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

## Friends (all 17 design-approved elements built)

Relations between players are one record per pair, `relations/{lowUid_highUid}` = `{a, b, kind:
PENDING|FRIENDS|BLOCKED, by}`; every change is computed by the pure state machine in
`domain/friends/Relation.kt` (`Relations.apply`) inside a Firestore transaction, so simultaneous or
duplicated taps can never produce a half-state (unit-tested in `RelationsTest`). Search is a prefix
query on `profiles.usernameLower`; phone discovery matches `profiles.phoneHash` (SHA-256 of the E.164
number), written only when a player opts in, limited to 5 lookups a minute on the client. Demo mode has
six pretend players (`LocalFriendsStore`); "priya_q" accepts requests after two seconds. Screens:
`ui/friends/FindPeopleScreen.kt`, `RequestsPanel.kt`, `PersonRow.kt` (Design 1), to be mounted in the
Friends tab once its layout is approved. Rules to add:
```
match /relations/{id} {
  allow read: if request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid);
  allow write: if request.auth != null && (request.resource.data.a == request.auth.uid || request.resource.data.b == request.auth.uid)
               && id == (request.resource.data.a < request.resource.data.b ? request.resource.data.a + "_" + request.resource.data.b : request.resource.data.b + "_" + request.resource.data.a);
}
```

## Board games (Entertainment tab)

**Ludo stage 1 — the tile (approved Design 1).** The Entertainment tab now holds the board games in
the same two-column grid of tiles as Khel (`ui/entertainment/EntertainmentScreen.kt`,
`BoardGameTile` in `ui/components/GameTile.kt`): the gold-framed portrait, crimson name plaque,
one-clause summary and player count. Ludo's portrait (`ui/thumbnails/LudoThumbnail.kt`) is painted
like the card thumbnails: the four-colour cross board on ivory with a gold rim, two tokens on the
track and an ivory die showing a six. The catalogue is `domain/board/BoardGame.kt` (kept apart from
the card games' `GameId`). Tapping the tile opens the game's own introduction route (`board/{game}`),
which opens the setup page below.

**Ludo stage 2 — introduction and mode selection (approved Design 1).** The card games' setup page,
built for Ludo (`ui/board/LudoSetupScreen.kt`): the portrait and a two-line introduction with a Rules
button (five short rules in a dialog), the mode slots (Vs Computer, Nearby, Online; Pass & Play
locked as everywhere else), Players 2–4 with a hint about seating, AI difficulty, and a **House rules**
plaque of orb switches preset to the recommended ruleset (`domain/ludo/LudoRules.kt`): *Six to enter*,
*Extra roll on six* (three sixes forfeit), *Extra roll on capture*, *Exact roll to finish*, *Play on
for places*; the eight star squares are always safe. Start (or Host / Join) stores the choice in
`LudoSetupStore` for the board; until the board (stage 3) and the lobby (stage 6) are approved, all
Start opens the board; Host / Join open the shared lobby (stage 6).

**Ludo stage 3 — the board (approved Design 10) and the rules engine.** The board is drawn with
Canvas inside the shared game frame (`ui/board/LudoBoardCanvas.kt`): ivory playing surface with a
gold rim on waxed walnut, yards in the suits' deep red, emerald, saffron and indigo with ivory nests,
faint ruling on the track, gold stars on the eight safe squares, home columns in the yard colour and
a four-colour star under a gold medallion at the centre. Tokens carry their colour's suit symbol
(♥ ♣ ♦ ♠, so colour is never the only cue), stacks show a count, finished tokens gather around the
medallion, and the die and the Roll button sit below the board. The geometry (`domain/ludo/LudoBoard.kt`:
52-square track clockwise from red's start, five-cell home columns, eight safe stars, 2 players
opposite, 3 leave blue empty) is shared by the renderer and the engine, so a token is never drawn
where the rules say it is not. The engine (`domain/ludo/LudoEngine.kt`, `LudoEngineTest`) is pure:
`roll` and `move` return the next state or null for an illegal action, honour every house-rule switch
(six to enter, extra roll on six with the three-six forfeit, extra roll on capture, safe squares,
exact finish, play on for places), and `chooseToken` is the computer's choice (Easy random; Medium
prefers finishing, capturing, leaving the yard; Hard also weighs threats). A full bot game is run to
the end for twenty seeds in the tests with the invariant that two colours never share an unsafe
square. `ui/board/LudoSession.kt` is the solo table: dice from `SecureRandom`, bots on a short delay;
the multiplayer table comes with the lobby stage on the same lockstep engine as the card games.

**Ludo stage 4 — motion (approved Design 3, "Glide").** `ui/board/LudoMotion.kt` runs the animations
the engine's events call for, and only after the engine has decided: the die spins through random
faces for 600 ms and settles on the engine's value (a six adds a gold flash); a moved token glides
along its path with a small arc and a fading trail (90 ms a square, at least 350 ms); captured tokens
then fly home along a curve, shrinking; a safe square shines when a token lands on it. The renderer
draws the moving pieces from a `MotionFrame` instead of their resting squares, so the picture and the
state can never disagree. While anything moves the table is busy: taps are ignored and the computer
waits. With the system's animator scale at 0 the die shows its face, tokens jump and captures fade.

**Ludo stage 5 — players (approved: Design 1's plaque, placed in each player's own yard).** Over the
board, one antique plaque per player sits in the middle of their yard between the four nests
(`ui/board/LudoYardPlaques.kt`): the Friends avatar with a colour ring and suit badge (the robot disc
for the computer), the username, and four token pips that fill gold as tokens get home. The current
player's plaque glows, matching the status line; a finished player's plaque shows their place. Empty
yards (2- or 3-player games) carry no plaque. The engine's `LudoPlayer` carries `avatarId` and `isBot`
for this; nothing else in the rules changes.

**Ludo stage 6 — lobby and room creation (approved: Design 1, the card games' lobby coloured per
seat).** Host and Join on the Ludo page open the same lobby page, controller and transports the card
games use (`ui/multiplayer/`, Nearby and Firestore), so hosting, joining by code, sharing the code and
watching a table that already started work for Ludo without a second lobby. What Ludo adds
(`ui/board/LudoLobby.kt`, `LobbyDecor`): one row per seat tinted in its yard colour — the host plays
red and the first guest sits opposite in yellow, as `LobbyHost.guestSeatOrder` decides — with open
seats listed as the computer's, and a house-rules line under the room code. The rules travel as five
flags (`LudoRules.encode`) in `MatchConfig.options`, announced in every LOBBY message and fixed by
the START message, so a guest sees the host's rules before the match and every phone starts the same
game; the room document records `seats` and `options` for the friends features to come. The table
itself runs `game/ludo/LudoMachine.kt` on the lockstep session every card game uses: the host's phone
rolls (the die value comes from the step's shared random, so every phone that replays the step gets
the same number) and checks every move; guests send their taps to the host and apply what comes back;
computer seats are played by the host at a pace that leaves room for the die spin and token glide.
`LudoScreen` takes whichever table is waiting — the lobby's session (`LudoOnlineTable`) or the solo
`LudoSession` — through one small `LudoTableController` face, so the board, animations and results
dialog are shared. Ludo hides nothing, so a watcher sees the whole board; there are no rounds, so a
watcher is never seated mid-match. Ludo has an entry in `GameId` (it stays out of the card catalog)
so rooms, presence ("playing Ludo") and later play requests carry it like any other game.
Not yet: avatars at a multiplayer table (names only until the friends stage ties seats to profiles),
Ludo's own sounds (stage 9), and a rematch (stage 10). Tested in `LudoMachineTest`: four phones stay
in step through whole matches with scrambled and duplicated delivery, states and actions round-trip
as text, the lobby carries the rules to every guest, and old START messages without the options field
still decode.

**Ludo stage 7 — friends invitation and play requests (approved: Design 1, the Friends play request
with an Invite friends button in the lobby).** The play-request pieces built for the card games
(Elements 7 and 12: the card with its 60-second ring, the sender's waiting banner, the bell entry,
the game picker on a friend's profile) now know Ludo: `domain/model/GameNames.kt` names any game from
either catalog, so "playing Ludo" and "invites you to Ludo" read right, the picker lists Ludo, and
accepting (from the card or the bell) opens the Ludo lobby at the host's room through the board lobby
route; a profile request with no table makes the sender host a Ludo table with their last setup
once the friend says yes. In the Ludo lobby the host of an online room sees **Invite friends** next
to Share while seats are open (`ui/invites/InviteFriendsSheet.kt`): the Friends list ranked
online-and-free first (`domain/invites/InviteList.kt`), then already invited, then at a full table,
then offline, with an Invite pill per friend; each tap sends a play request that carries the room
code, so the friend lands in the next free seat. The request rules are the card games' (friends
only, both free, one pending request per pair, 60 seconds to answer); the sender's banner shows the
newest request and the sheet marks every pending one as Sent. Pokes at a Ludo table are reduced to
the banner like at a card table. Tested in `InviteListTest`.

**Ludo stage 8 — waiting, reconnecting and game-full states (approved: Design 1, states on the yard
plaques and parchment bands over the board).** When a player's phone drops out the host keeps their
seat for 60 seconds (`net/core/SeatKeeper.kt`): the computer plays it at once (the existing BOT
message) and everyone is told with a new AWAY message, so on every phone the player's yard plaque
dims, shows an hourglass and counts down "back in 48 s", and the status line says the computer is
playing for them; when the window closes the plaque shows the robot disc and "Computer". The dropped
phone shows a parchment band over the frozen board — "Reconnecting… your seat is kept for 48 s" —
and asks the host for its seat every three seconds (a plain JOIN); the host matches the same uid (an
online room) or the same name over a fresh link (Nearby, through the lobby's Find tables) and sends
the full position (SEAT, which a seated guest may now take as well as a watcher), so the phone is
back in step whatever it missed; "You're back!" shows for a moment. Online rooms rejoin by
themselves because Firestore keeps the move log and the uid; Nearby can rejoin only while the host is
still in range and advertising. A full lobby no longer turns a late arrival away: beside "This table
is full" there is **Watch** (JOIN with a watch flag), they see the table fill, and the host admits
them as a watcher when the game starts (Element 10 seats them when a computer seat frees up). The
host leaving still ends the table (no host migration), and there is no turn timer. The band and
dialog logic lives in `GameFrame.kt` (`ReconnectBand`, `SessionNotices`) and serves the card tables
too, so a card player who drops out gets the same window. Tested in `ReconnectTest`: the seat book's
window and matching, a seated guest brought back in step, the new messages, and the watch flow
through a full lobby. Not yet run on two real phones.

**Ludo stage 9 — quick messages, reactions and sound controls (approved: Design 1, the talk button
by the die and bubbles at the yard).** With other people at the table the Element 11 talk button sits
in the row with the die and Roll; its tray (ten phrases, eight emoji, mute per seat) opens under
that row. A message appears as a parchment bubble under the speaker's yard plaque (above it in the
two bottom yards, so it stays on the board), a watcher's over the centre star; the newest message per
seat shows for the usual few seconds (`TalkLayout.BOARD`, `TalkBubble`). The header speaker opens
the same sound panel as everywhere else. Twenty files of the supplied board-game pack are in
`res/raw` as `sfx_*` (the Snakes & Ladders ones follow with that game); `game/ludo/LudoSfx.kt` names
the sounds for one engine step, timed to the stage 4 animations — die spin, land, the bonus on a six;
a token entering, setting off, a tick a square on short glides, a capture, turning into the home
column, reaching home; "your turn"; a forfeit and a refused tap; match complete, then the victory
fanfare on the winner's phone and the defeat sting on the others — and the Roll button and tray
carry the pack's UI taps. It runs through the same once-per-step hook as the card games
(`GameMachine.sfxFor` adds which seat is listening, so "your turn" and the fanfare are personal), and
the solo table feeds every step through the same mapping. Table-talk arrival now uses the pack's
soft notification at every table. Tested in `LudoSfxTest`; the asset test now reads each WAV's
header for its length.

**Ludo stage 10 — results, statistics, rematch and return to lobby (approved: Design 5, the
statistics table).** The match ends in a table (`ui/board/LudoResults.kt`): one row per player in
finishing order with place, turns (rolls taken), sixes, captures, tokens lost and tokens home, your
row in gold; under it your lifetime record — played, won, second, third — and then **Rematch** for
the host, **Play again** alone, or "Waiting for the host to start a rematch…" for a guest or a
watcher, and Back to Khel. The engine counts the statistics as the match goes (`LudoStats` in
`LudoState`, carried by the state codec, so every phone shows the same numbers) and, when a match
ends before everyone is home (the play-on rule off, or everyone else finished), ranks the rest by
tokens home and then by how far their tokens have travelled. A rematch is a move like any other
(`LudoAction.Rematch`): only the host's seat may make it and only once the match is over; it keeps
the names, colours, computer seats and house rules and starts fresh tokens and counts, and every
phone replays it. The record lives per signed-in account on the phone
(`data/ludo/LudoRecordRepository.kt`, demo accounts included), counts each finished match once for
the seat this phone played, and shows on My Profile as "Ludo: 13 played · 6 won". Tested in
`LudoResultsTest`. With this, Ludo's ten stages are complete.

### Snakes & Ladders (Moksha Patam)

**Stage 1 — the tile (approved: Design 2, Moksha Patam).** The Entertainment tab's second tile is
the same Khel frame with the game's Indian original as its portrait (`ui/thumbnails/SnakesThumbnail.kt`):
the ivory 10×10 board inside a gold vine border with green leaf beads, a green serpent with a crimson
belly line winding down from a lotus head, two creeper ladders with gold rails and green rungs, and a
lotus at the hundredth square. The plaque says **Moksha Patam** with "Snakes & Ladders" under it
(`BoardGameInfo.altNameRes`), the clause is "Climb the ladders of virtue; the serpents bite.", 2–4
players, in the eight languages. Tapping opens the game's page, which until stage 2 is a note that
the introduction is the next design stage. The catalog entry is marked not yet playable, so the
friends' game picker does not offer it before its table exists; `GameId.SNAKES_LADDERS` is there for
the rooms, presence and lobby to use when they do.

**Stages 2–10 (Design 1, Royal court, by the owner's standing approval; the recommended rules as
the default).** Moksha Patam reuses Ludo's work wherever the two games are alike, so each stage is
the Ludo stage with the game's own board and words:

- *Setup page (2):* the board games now share one page (`ui/board/BoardSetupScreen.kt`; Ludo's
  screen is a thin wrapper). Moksha Patam's House rules plaque has six switches — Six to start (off),
  Six rolls again (on), Exact roll to finish (on), Bounce back (off), Captures (off), Play on for
  places (on) — every one honoured by the engine and tested (`SnakesEngineTest`).
- *Board and engine (3):* `domain/snakes/` holds the board (100 squares numbered back and forth, the
  classic nine serpents and eight ladders in two tables the renderer draws from), the rules and the
  pure engine: one token per player, a roll moves it at once; a six rolls again; the hundredth square
  needs the exact number (a roll that would pass it is lost, or bounces back with that switch);
  captures and play-on are switches; the first to 100 wins. `ui/snakes/SnakesBoardCanvas.kt` paints
  the ivory board on walnut with creeper ladders and lotus-headed serpents; square 0 waits left of
  square 1.
- *Animation (4):* `SnakesMotion` spins the die, glides the token square by square with a trail,
  then climbs the ladder in a straight line or slides down the serpent's own curve; reduced motion
  snaps. The engine decides first; the Roll button waits while anything moves.
- *Players (5):* one plaque per player at the corners of the board (`BoardTableLayout`, shared with Ludo since the table refresh): avatar
  with colour ring and suit badge, name, the square (or Start, or the place), a glow on the current
  player, the stage 8 away and Computer states, and the stage 9 bubbles beneath.
- *Lobby, invitations, waiting states (6–8):* the same board lobby route, decor (`snakesLobbyDecor`),
  Invite friends, seat window and Watch as Ludo; `game/snakes/SnakesMachine.kt` runs the match on the
  lockstep session (the host rolls from the step's shared random, four phones stay in step through
  whole matches in the tests, states and actions round-trip as text, rematch is a host-only move).
- *Messages and sounds (9):* the talk button in the die row with bubbles under the speaker's plaque;
  the pack's remaining seven files (`sfx_ladder_climb`, `sfx_snake_hiss`, `sfx_snake_slide_down`,
  `sfx_snakes_ladders_victory` / `_defeat`, `sfx_player_eliminated`, `sfx_victory_fanfare`) join
  `res/raw` and `game/snakes/SnakesSfx.kt` maps each step once: die spin and land, enter or move with
  a tick a square, the ladder climb, the serpent's hiss then slide, a capture, near finish, the
  finish square with the Moksha Patam victory on the winner's phone and its defeat sting on the
  others, your turn, and a lost roll as a refusal. All 35 pack and card effects are in the app.
- *Results (10):* the statistics table — place, turns, sixes, ladders, serpents, square — with the
  lifetime record (kept per account in `snakes_record`, shown on My Profile as "Moksha Patam: N
  played · M won"), Rematch / Play again / waiting line, and Back to Khel.

With this both board games are complete. Nothing has yet run on two real phones.

### Table refresh (owner's requests with reference pictures)

- **Start under Rules:** every card and board setup page has its Start (or Host) button directly
  under the Rules button as well as at the bottom (`GameInfoPanel`, `BoardInfoPanel`).
- **Slower pace:** computer players wait about 1.5–2.8 s before each move (`botDelayMs` in each
  machine, `GameSession.AUTO_STEP_DELAY_MS`, the solo Ludo / Moksha Patam sessions); played cards are
  thrown onto the table over 0.65 s (`TrickTable`); tokens glide at 160–170 ms a square.
- **Board tables (`ui/board/BoardTableLayout.kt`):** the board fills the width in portrait (about
  three quarters of the screen) with a player plaque at each corner and the die between the bottom
  two; sideways it fills the height with the plaques in two columns beside it. The player whose turn
  it is gets a larger plaque with a thick pulsing gold border and a **YOUR TURN** / **TURN** tag.
- **Ludo:** the bright standard board (coloured yards with white circles, white track, coloured
  start / safe tiles with stars, entry arrows, centre triangles) inside the royal walnut frame with
  gold rim and leaf corners; 3D pawns. The picture is turned so **your yard is always bottom-left**,
  and the setup page lets you **pick your colour** (it travels as a sixth letter in the rules
  options, `LudoRules.options`).
- **The 3D die (`ui/board/Die3D.kt`):** a rounded cube with black pips, opposite faces summing to 7,
  on a green pedestal. The secure random number decides the value first; the animation (toss →
  tumble → two bounces → settle) is then built to land on that face. A wooden clack on impact with
  two quieter clacks for the bounces (`DieTiming`). Settings → Animations off (or the phone's
  animations off) snaps it — the reduced-motion option (`ui/motion/MotionPrefs.kt`).
- **Moksha Patam:** pastel squares, a teal START tile and a gold MOKSHA lotus tile, wooden ladders and
  nine serpents of different breeds (cobra, python, krait, viper, rat snake, tree snake, coral snake,
  boa, sea krait — each with its own pattern and head), all lying slanted across columns with unequal
  lengths. No serpent's mouth is on squares 1–10 and only one ladder starts there (3 → 22).
- **Playing cards:** classic standard cards — white stock, bold corner indices, the traditional pip
  layout with the lower half upside-down, a big Ace (larger for spades), double-ended court cards in
  an ink frame — with small royal touches: a fine gold inner line, a gold ring round the Ace, the
  red lattice back with a gold lotus medallion.
- **Undo for members or after an ad:** every solo table (all card games, Solitaire, Spider, Ludo,
  Moksha Patam) has Undo. A member uses it freely; anyone else sees it locked and can unlock it for
  that game by watching a **rewarded ad of at least 30 seconds** (`game/common/UndoGate.kt`,
  `AdsManager.showRewarded`) — it counts only when the ad is watched to the end and stays on screen
  30 s or longer.
- **Landscape:** turn the phone sideways at any table and the game takes the whole screen — no app
  bar, banner or system bars (`ImmersiveSystemBars`), a slimmer header.

## Sound and music

All sound goes through one object, `audio/GameAudio.kt`, which owns the settings and is the only code
that touches Android's `SoundPool` (card effects) and `MediaPlayer` (music).

- **Card effects** — the eight WAVs in `res/raw` (`sfx_shuffle_cards`, `sfx_riffle_shuffle`,
  `sfx_deal_single_card`, `sfx_deal_multiple_cards`, `sfx_slide_present_card`, `sfx_flip_reveal_card`,
  `sfx_collect_cards`, `sfx_hand_reveal`) are the supplied pack, used as provided; they are
  synthesised placeholders, not recordings. They are not hard-wired into screens: each game's
  `*Machine` says which effect a step deserves (`GameMachine.sfx(before, after, action)`), and
  `SessionCore.onTransition` announces every accepted step exactly once on every phone, so there are
  no duplicate sounds from redraws, repeated messages or reconnects. Solitaire and Spider do the same
  in `SolitaireSfx` / `SpiderSfx`.

  | Effect | Event |
  |---|---|
  | (Ludo, stage 9) | the board-game pack, mapped in `LudoSfx` — see the Ludo stage 9 note |
  | shuffle | next round / hand begins |
  | riffle shuffle | a new table or a new match opens |
  | deal one | Rummy draw from the deck; Solitaire stock turn |
  | deal many | the deal that follows a shuffle; Spider's ten-card deal |
  | slide / present | a card is played or discarded (after the move is accepted) |
  | flip / reveal | Teen Patti *See*; a hidden trump revealed; Solitaire/Spider card turned face-up |
  | collect | a trick is cleared; Teen Patti *Pack*; hands gathered before the next hand; a Spider run removed |
  | hand reveal | a hand/round is shown: round over, Rummy declaration, Teen Patti showdown, a win |

- **Background music** — *Surreal Forest* by Meydän, one looping track that starts when the app comes
  to the front, fades in and out, pauses when the app goes to the background, and is never restarted by
  gameplay. It dips gently (to 60%) while a card effect plays. **The MP3 is not in the repository**:
  `chosic.com` was unreachable from the environment this was written in, and the `.mht` you saved
  is only a web page (no audio inside), so nothing was substituted. To add it, download the MP3 from
  https://www.chosic.com/download-audio/30330/ and save it as
  **`app/src/main/res/raw/surreal_forest.mp3`** (lowercase, underscores — Android rejects the
  original file name). Rebuild; nothing else changes. Until then the app runs without music and the
  panel says so.
- **Licence** — CC BY 4.0: commercial use is allowed **if the artist is credited**. The credit is shown
  in the sound panel and in Settings. Re-check the licence on the source page before shipping (see
  `THIRD_PARTY_NOTICES.md`).
- **Controls** — the speaker button in every game's header opens a compact panel: master volume, game
  sounds (switch + volume), background music (switch + volume) and *Hide controls*; the same controls
  are in Settings. `effective music = master × music volume`, `effective effects = master × effects
  volume`, each 0 when its switch is off; master 0 silences both without changing a switch. Choices
  are saved in `SharedPreferences` (`data/local/AudioPreferences.kt`). Hiding the panel changes nothing.

## Login, ads and payments

### Login / Sign up (mobile number + OTP) and the users database

Tapping **Login / Sign up** (top right of every page) asks for a 10-digit Indian mobile number
(and an optional name), sends an OTP by SMS, and signs the player in once the right OTP is typed.
Each signed-up player becomes one document in the Firestore collection **`users`** (phone number,
name, app language, membership end date, sign-up time, last login, app version) — open it in the
Firebase console, or export it to BigQuery / Google Sheets, for analysis.

Until a Firebase project is connected the app runs in **demo mode**: no SMS is sent, the OTP is
always `123456` (the login screen says so), and the account stays on the phone only. To go live:

1. Create a project at <https://console.firebase.google.com> and add an Android app with package
   name `com.rangepatte.app`.
2. Add your signing keys' **SHA-1 and SHA-256** fingerprints to that app (Android Studio: Gradle
   panel ▸ app ▸ Tasks ▸ android ▸ `signingReport`).
3. Download **`google-services.json`** and put it in the `app/` folder. The build detects it and
   switches Firebase on automatically (see the top of `app/build.gradle.kts`).
4. In the console: **Authentication ▸ Sign-in method ▸ Phone** → enable; **Firestore Database** →
   create. Use security rules that let a signed-in user write only their own record, e.g.
   `match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`.
5. Publish a privacy policy — Google Play requires one when an app collects phone numbers.

### Google ads

`data/ads/AdsManager.kt` runs Google AdMob: an adaptive **banner** at the bottom of every page and a
**full-screen ad** when leaving a game table (at most every 2nd exit, never within 2 minutes of the
last one). Google's consent form appears first where the law requires it (EEA/UK). Members see no
ads at all. The ad IDs in `res/values/ads_config.xml` are Google's public **test** IDs, which show
"Test Ad" and never pay; create your app and ad units at <https://admob.google.com> and replace the
four IDs there (app, banner, interstitial, rewarded) before publishing. A **rewarded** ad unlocks
Undo for one game; Google's test rewarded ad may be shorter than 30 seconds, in which case the app
correctly says it was too short — use a real rewarded unit (or a longer test creative) to see an unlock. Note that AdMob reviews apps in the card-game category — keep
everything points-only (no real-money play), as it is today.

### ₹29/month membership ("Remove ads?") and the payment gateway

The **Remove ads?** tab (top left of every page) opens the invitation to join the community for
₹29/month. Joining needs a login, then **Pay ₹29** opens the checkout page (`ui/membership/`): order
summary, choice of UPI / card / net banking / wallet, and Pay. All payment calls go through one
interface, `PaymentGateway` (`data/payment/PaymentGateway.kt`); today it is a placeholder that
charges nothing and says payments aren't live yet. Debug builds also show "Simulate successful
payment" so the ad-free flow can be tested.

To connect a payment partner later: write one class implementing `PaymentGateway` (wrapping e.g.
Razorpay, PayU or Cashfree's Android SDK) and return it from `AppServices.paymentGateway`. Confirm
each payment on a server (the partner's webhook) before granting membership.

**Important — Google Play billing policy:** removing ads is a digital benefit used inside the app,
and Google Play generally requires such in-app purchases to go through **Google Play Billing**. In
India, the *User Choice Billing* programme lets an approved developer offer an alternative payment
partner **alongside** Play Billing. Check the current Play Console payments policy before choosing
the partner; a `PaymentGateway` backed by Play Billing fits the same interface.

## Legal / product design notes

- No real-money betting, deposits, withdrawals, or gambling wallets exist or are planned. Only
  non-monetary points; the ₹29 membership only removes ads.
- Gameplay itself (single-player, AI, Pass & Play) still works offline. The `INTERNET` permission
  is now requested for ads, OTP login and the online users database.
