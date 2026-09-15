# PuzzleFocus

A Forest-style focus timer where a jigsaw puzzle assembles itself while you stay on task —
instead of growing a tree, you complete a picture. Leave the app before time's up and the
puzzle stays unfinished.

## Core mechanic

- Pick a session length (5 / 15 / 25 / 45 / 60 min, or custom) and an image.
- The image is divided into a grid that scales with duration (3×3 up to ~9×9 for longer
  sessions — see `src/utils/grid.ts`).
- As the countdown runs, puzzle pieces reveal left-to-right/top-to-bottom in sync with
  elapsed time, so the picture is exactly 100% complete when the timer hits zero
  (`src/hooks/useFocusTimer.ts` + `src/components/PuzzleGrid.tsx`).
- If you background the app, you get a short grace period (5s) to return before the
  session is marked **failed** — the puzzle freezes and the attempt is recorded as
  incomplete in your history (`AppState` handling in `useFocusTimer`). An optional local
  notification warns you the moment you leave, if notifications are enabled in Settings.
- A "Give up" button on the active session screen fails the session immediately.

## Image sources

- **Art pack** — a handful of bundled placeholder images in `assets/images/art/`
  (procedurally generated gradients/shapes via `scripts/generatePlaceholderArt.js`;
  swap in real curated photos later).
- **Quote tiles** — quote + attribution rendered live as a styled `View`
  (`src/components/PuzzleContent.tsx`, data in `src/data/quotes.ts`) — no photos needed.
- **Custom upload** — pick a photo from your library via `expo-image-picker`.

## Screens

- **Home** — duration + image source picker, starts a session.
- **Active session** — puzzle grid, countdown, give-up button.
- **Garden (history)** — grid of past sessions; completed puzzles shown as small
  thumbnails, failed ones greyed out with a cracked overlay.
- **Settings** — away-from-app notification permission, sound/haptics toggle, clear history.

## Tech

- Expo SDK 57, React Native 0.86, TypeScript, React Navigation (bottom tabs + native stack).
- `react-native-svg` renders the puzzle grid overlay (covers + jigsaw grid lines) on top
  of arbitrary content (an `Image` or the quote `View`), animated per-piece with
  `Animated.Value`.
- Session history and settings persist locally via `@react-native-async-storage/async-storage`.
  No backend.

## Getting started

```bash
npm install
npm start        # then press i / a / w, or scan the QR code in Expo Go
```

To regenerate the placeholder art pack:

```bash
node scripts/generatePlaceholderArt.js
```

## Testing on a real device

`npm start` prints a QR code — scan it with the [Expo Go](https://expo.dev/go) app on
your phone (same Wi-Fi network, or run `npm start -- --tunnel` if it isn't).

For an installable build (useful for testing `expo-image-picker`, backgrounding, and
notifications outside of Expo Go), `eas.json` is preconfigured — run:

```bash
npx eas-cli login          # one-time, needs an Expo account
npx eas-cli build:configure
npx eas-cli build --profile preview --platform android   # or ios
```
