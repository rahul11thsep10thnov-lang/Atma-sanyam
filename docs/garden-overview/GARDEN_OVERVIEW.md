# Garden overview redesign

The Garden tab now opens a **Garden overview**: a miniature isometric island, focus statistics under it, and
(tap the island) the chronological **Planting Record**. The painted garden scene is unchanged and one tap away
("Garden scene"); a freshly grown plant still opens it so it is welcomed as before.

## Plant and tree artwork is untouched
* Every plant on the island is the existing sprite (`assets/paradise`, via `PARADISE_IMAGES` / `spriteFor`) for its
  species and growth size, with the existing thumbnail used when small. Only position and scale change.
* `original-artwork-baseline.sha256` is the SHA-256 of all 1,358 files in `assets/paradise` taken before the work;
  the same listing taken after is identical (`diff` empty). No file in `assets/`, `src/paradise/` or `src/growth/` changed.
* The earlier Solarpunk / 3D Botanical World work was removed (commit "Remove the Solarpunk…"); the tree is
  byte-identical to the state before it.

## Files
New: `src/garden/overview/{stats.ts, layout.ts, GardenIsland.tsx, charts.tsx, PlantingRecordSheet.tsx, GardenOverviewScreen.tsx}`,
`src/garden/overview/__tests__/stats.test.ts`.
Changed: `src/navigation/RootNavigator.tsx` (Garden tab wrapper), `package.json` (`test:garden`), `.gitignore`.

## Data and storage
Read-only: the saved session history (`puzzlefocus.history.v1` + archives) and the saved plants (`focus.paradise.v1`).
**No new storage, no migration, nothing written.** One completed session already creates one plant (existing
`plantFromSession`, keyed by session id), so counts and the record cannot duplicate.

What a session record holds: start, end, planned minutes, outcome. The app has no pause (leaving the app or giving up
ends the session as failed), so a completed session's focused time equals its minutes and there is no paused time to
subtract. Start–End is the real elapsed time; "N min focused" is the focused time.

## Features
* Day / Week (Mon–Sun) / Month / Year with previous / next across month, year and week boundaries; the island,
  counters, distribution and record follow the period. Island = plants earned in the period (a plant earned in the
  period, by its planting date). Plant and tree counters are from saved data, plus all-time totals.
* Focused Time Distribution: hourly (Day), 7 days (Week), days of the month (Month), 12 months (Year); tap a bar for
  exact time; sessions crossing an hour, midnight or a year boundary are split correctly.
* Most focused weekday and hour (line charts with the peak marked), focus trend (this year to date vs the same dates in
  the two previous years, difference in minutes and %), sessions, streaks, averages, longest session, best and quietest day, monthly totals.
* Planting Record: newest first, grouped by date, original plant thumbnail, start–end, focused minutes, expandable details,
  filter by the selected period or all time; abandoned sessions are listed as "Stopped early · no plant".
* Animations: island entrance, fade on period change, bars grow in; all skipped with Reduce Motion.

## Limitations (honest)
* **The three reference screenshots did not reach me** (no image was attached to the message), so the layout follows the written
  description. Please compare and tell me what to adjust.
* **Task / category:** sessions do not record one, so every card says "Unset" and there is no focus-by-task chart.
* More than 140 plants in one period: the island draws the 140 largest; the record lists all.
* Plants from sessions on the balcony count in totals like any plant.
* Not tested on a real Android phone; checked in a browser (software rendering).

## Tests
* `npm run test:garden` — 11 tests pass (periods, navigation across boundaries, bucket counts, hour/midnight/year splitting,
  weekday/hour peaks, equal-range year trend, streaks and extras, empty history, stable island layout).
* `npm run typecheck` passes.
* Browser run with 80 plants and 90 sessions (some abandoned): all four filters, tap-a-bar, scrolling, planting record,
  scene button and back.

## Run
```powershell
git pull
npm install
npx expo start
```
Open the Garden tab on the phone with Expo Go.
