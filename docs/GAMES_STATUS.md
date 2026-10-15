# Games: implementation status

All 40 catalogue games are **playable** in this build: each has real rules, a win/loss (or
completion) condition, restart, pause, a completion screen with stars, and is registered in
`src/games/registry.ts` so the Player Console can load it. The server catalogue
(`backend/src/catalogue/games.ts`) seeds every game as `published`; an admin can move any game
to `in_development` (hidden in production unless the "show in-development games" flag is on)
or `archived` without an app release.

Each game is a `GameDefinition` (`src/games/engine.ts`): `init(ctx)` builds a serialisable
state from a seed, `reduce(state, action)` applies the rules, `status(state)` reports
playing/won/lost, score, stars and a HUD line, and `View` renders it. Because the state is plain
JSON the same `View` is rendered read-only in the Guardian Console's live mirror, a game can be
restored after a crash, and the rules are unit-tested without React (`tests/games.test.ts`).

Legend — brackets: A 3–5 · B 6–8 · C 9–10 · D 11–12. "Logic module" = pure rules in
`src/games/logic/` covered by tests.

| # | Game | id | Category | Brackets | What it does | Logic module |
|---|---|---|---|---|---|---|
| 1 | Picture Matching | `picture-matching` | matching | A B | Find the pair; 4–8 pairs by difficulty, spoken prompts | — |
| 2 | Memory Cards | `memory-cards` | matching | A B C D | Classic concentration, 4–18 pairs by difficulty, stars by moves vs par | — |
| 3 | Jigsaw Puzzle | `jigsaw` | puzzles | A B C D | Drag pieces onto a 2×2, 3×3, 4×4 or 6×6 grid; snapping, completion reveal | — |
| 4 | Shape Sorting | `shape-sorting` | matching | A | Drag shapes into matching holes; narration names each shape | — |
| 5 | Colour Matching | `colour-matching` | matching | A | Tap the object of the spoken colour; 8 rounds | — |
| 6 | Spot the Difference | `spot-the-difference` | puzzles | B C D | Two emoji scenes, 3–7 differences, miss penalty | — |
| 7 | Hidden Objects | `hidden-object` | puzzles | B C | Find listed items in a busy scene within the budget | — |
| 8 | Maze Runner | `maze-runner` | puzzles | A B C D | Generated perfect mazes 5×5 … 15×15, swipe/arrow moves, par by shortest path | `maze.ts` |
| 9 | Sliding Puzzle | `sliding-puzzle` | puzzles | B C D | 3×3 / 4×4 fifteen-puzzle with solvable shuffles | `sliding.ts` |
| 10 | Sudoku | `sudoku` | numbers | B C D | 4×4 (mini), 6×6, 9×9 with unique generated puzzles, conflict hints | `sudoku.ts` |
| 11 | Word Search | `word-search` | words | B C D | Generated grids, 8 directions, drag to select | `wordSearch.ts` |
| 12 | Anagram Builder | `anagram-builder` | words | B C D | Rearrange letters into the pictured word; hints | — |
| 13 | Tangram | `tangram` | puzzles | B C D | Drag/rotate the seven tans into silhouettes | — |
| 14 | Connect Four | `connect-four` | board | B C D | vs computer (minimax depth 1/3/5 by difficulty); win detection | `connectFour.ts` |
| 15 | Checkers | `checkers` | board | B C D | Full draughts rules incl. forced captures and kings; computer opponent | `checkers.ts` |
| 16 | Chess | `chess` | board | B C D | Legal-move chess with check/checkmate/stalemate, castling, promotion; computer opponent | `chess.ts` |
| 17 | Ludo | `ludo` | board | B C D | Four-colour Ludo vs computer, six to start, captures, safe squares | `ludo.ts` |
| 18 | Snakes and Ladders | `snakes-and-ladders` | board | B C | Classic 100-square board vs computer | — |
| 19 | Bubble Shooter | `bubble-shooter` | arcade | C D | Aim, bounce, pop groups of 3+, floating bubbles fall, rows push down | — |
| 20 | Match-3 | `match-3` | arcade | C D | Swap to match, cascades, move budget and target score | `match3.ts` |
| 21 | Block Puzzle | `block-puzzle` | arcade | C D | Place polyomino pieces, clear rows/columns, game over when nothing fits | `blocks.ts` |
| 22 | Connect the Dots | `connect-the-dots` | creative | A B | Tap numbered dots in order to reveal a picture | — |
| 23 | Colouring Book | `colouring-book` | creative | A B C | Tap-to-fill SVG pictures with a palette | — |
| 24 | Drawing Canvas | `drawing-canvas` | creative | A B C D | Free drawing with brushes, colours, stamps, undo | — |
| 25 | Origami Studio | `origami-studio` | creative | A B C D | Step-by-step animated fold diagrams for real paper (puppy, boat, frog) | models in `src/crafts/models.ts` |
| 26 | Paper Airplane | `paper-airplane` | creative | B C D | Fold guide for the classic dart, then a flight test with nose weight, wings, flaps and a seeded breeze | `flight.ts` |
| 27 | Virtual Garden | `virtual-garden` | simulation | A B | Plant, water, weed; ticks drive growth; every bed in bloom wins | — |
| 28 | Simple Physics Lab | `physics-lab` | learning | B C D | Place ramps/bumpers so the ball reaches the cup; nine levels verified solvable at par | `physics.ts` |
| 29 | Coding Robot | `coding-sequence` | learning | B C D | Program a robot with arrow and repeat blocks to reach the goal | — |
| 30 | Science Quiz | `science-quiz` | learning | B C D | 10 questions per round from a checked bank, explanations | `data/scienceBank.ts` |
| 31 | Geography Quiz | `geography-quiz` | learning | B C D | India and the world; 10 per round | `data/geographyBank.ts` |
| 32 | Animal Sounds | `animal-sounds` | learning | A B | Hear the sound (spoken), tap the animal | — |
| 33 | Cricket Batting | `cricket` | sports | B C D | Time the shot against bowled deliveries; overs, runs, wickets | — |
| 34 | Football Penalty | `football-penalty` | sports | B C D | Swipe to shoot; keeper AI by difficulty | — |
| 35 | Bowling | `bowling` | sports | B C D | Ten frames with strikes/spares, drag to aim and power | `bowling.ts` |
| 36 | Virtual Cooking | `virtual-cooking` | simulation | A B | Follow recipe cards step by step; slips counted | — |
| 37 | Farm Manager | `farm-manager` | simulation | B C D | Day-by-day economy: plant, water, feed, sell; weather forecast; coin goal by season end | `farm.ts` |
| 38 | Traffic Logic | `traffic-logic` | numbers | C D | Rush-hour style sliding puzzle with solvable hand-made layouts | `traffic.ts` |
| 39 | Chess Tactics | `chess-tactics` | board | C D | Mate-in-one/two and tactic puzzles with verified solutions | `chessPuzzles.ts` |
| 40 | Detective Mystery | `detective-mystery` | learning | C D | Seeded whodunnits where the clues identify exactly one suspect | `detective.ts` |

## Verified by tests (`npm test` at the repo root)

- Engine helpers (seeded RNG, shuffle, stars).
- Maze generation and shortest path; sliding-puzzle solvability; sudoku uniqueness/validity;
  word-search placement; traffic puzzles solvable; Connect Four win/AI; checkers legal moves and
  captures; chess legality, check/mate/stalemate and tactics puzzles; ludo movement rules.
- Physics Lab: every level is solvable with exactly its par number of pieces.
- Detective Mystery: 177 generated cases each have exactly one consistent suspect.
- Farm Manager economy (planting, weather, animals, a winning strategy), paper-airplane flight
  model, quiz banks (≥10 questions per level, distinct options), origami diagram geometry.

## Not yet done

- Multiplayer or two-device play (every game is single player vs the computer).
- Game-specific analytics beyond sessions/outcomes/scores.
- Translations of in-game text (the UI chrome is in English and Hindi; game copy is English).
