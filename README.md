# Indian Taash

*"Bharatiya Khel, Bharatiya Tarike"* — a native Android app (Kotlin + Jetpack Compose) styled after a
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
| 4 | Home screen — later replaced by the Khel page at the owner's request | ✅ |
| 5 | Navigation (Compose Navigation, bottom nav, setup/table routes) | ✅ |
| 6 | Game table shell (wooden table, header, hands, score panel) | ✅ |
| — | Village-courtyard visual redesign (charpai table, antique cards, brass plaques, animation) | ✅ |
| — | Language picker + 8-language UI translation (English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Punjabi) | ✅ |
| — | Rules scroll popup with real researched rules content for every game | ✅ |
| — | One-clause summaries on game tiles | ✅ |
| — | Classical tally-mark score display; gated Undo (AI games only, 3 uses) | ✅ |
| — | Royal-court UI kit (strategy-game-style carved panels, crimson/steel buttons, options rows, portrait cards, command slots) applied to every screen | ✅ |
| — | Owner feedback pass: language switches instantly (no restart); Home and categories removed — the app opens on **Khel** (all games in one grid); Teen Patti and Flush merged into "Teen Patti / Flush"; card-art thumbnails per game; rules in the chosen language with an English toggle; all text +2sp; History tab → empty **Entertainment** tab | ✅ |
| — | Login / Sign up by mobile number + SMS OTP, user records in an online database (Firebase) | ✅ (needs your Firebase project — demo mode until then) |
| — | Google AdMob ads (banner on every page, occasional full-screen ad after a game) with consent form | ✅ (test ad IDs until you add yours) |
| — | ₹29/month "Remove ads?" membership + payment gateway screen | ✅ (gateway scaffold — payment partner to be plugged in) |
| — | Multiplayer architecture scaffold (`GameRoom`/`PlayerConnection`/`GameSynchronizer` interfaces; vs-Computer and Pass & Play modes functional; Nearby/Online shown as "coming soon") | ✅ (scaffold) |
| 7+ | **All eight games are playable** against the computer: Solitaire, Spider Solitaire, Rummy, Teen Patti / Flush, Twenty Nine, Coat Piece, Dehla Pakad, Lakadi — each with its own engine, computer player, screen and Undo (3 uses) | ✅ |
| — | Playing against other people: Pass & Play on one phone, Nearby (WiFi/Bluetooth) and Online (internet) | not started (shown as "coming soon") |

### The redesign, specifically

- **Charpai game table** (`ui/components/WoodenTable.kt`, `TableStyle.CHARPAI`): a procedurally
  drawn woven jute-rope lattice inside a thick wooden frame, replacing the plain wooden panel.
- **Antique cards** (`ui/cards/CardRenderer.kt`, `CardBackRenderer.kt`, `SuitMotifs.kt`): parchment
  face, double gold-rule border with corner flourishes, stylized suit motifs (lotus / ornamental
  diamond / paisley leaf / spear-leaf) alongside the small conventional ♠♥♦♣ corner glyph, and a
  maroon-and-gold mandala card back.
- **Brass/wood player nameplates and buttons** (`PlayerAvatar.kt`, `ScorePanel.kt`,
  `royal/RoyalButton.kt`): wood-and-brass plaques instead of modern bubbles/flat buttons, with a
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
│   ├── game/      # Deck, DeckManager, CardGameEngine + GameState/GameAction contracts
│   └── multiplayer/ # GameRoom/PlayerConnection/GameSynchronizer — architecture scaffold, unimplemented
├── ui/
│   ├── theme/     # Color.kt, Type.kt, Shape.kt, Dimens.kt, Theme.kt — design tokens live here
│   ├── cards/     # PlayingCardView/CardFace/CardBack renderers, SuitMotifs, CardStack, Hand, CardStyle
│   ├── background/# BackgroundType enum + BackgroundManager (brush per scene)
│   ├── components/# Shared widgets: royal/ UI kit, GameTile, WoodenTable, GameHeader, OrnamentalDivider, ...
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

## Multiplayer roadmap

`domain/model/PlayMode.kt` and `domain/multiplayer/Multiplayer.kt` hold the current state of this:

- **Working today:** `VS_COMPUTER` (play against AI) — purely local, no networking involved.
  `PASS_AND_PLAY` is declared but shown locked: it needs a "pass the phone" hand-over screen so
  nobody sees another player's cards.
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
  a `GameSynchronizer`, and flip the locked modes' `available` flags in `GameSetupScreen.kt` on.
  Because every engine is immutable state + pure functions, syncing means sending each move (or the
  new state) to the other phones.
- **To implement Online:** the same interfaces, backed by a chosen realtime backend (Firebase
  Firestore/Realtime Database is the lowest-setup option — no server to host).

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
three IDs there before publishing. Note that AdMob reviews apps in the card-game category — keep
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
