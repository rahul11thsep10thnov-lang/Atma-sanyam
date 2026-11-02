# Rankings, coins, rewards and the daily challenge

## Coins (server-authoritative)

Every change to a child's balance is one row in `coin_transactions` (append-only, with
`idempotency_key` unique) written in the same transaction as `children.coins`
(`backend/src/services/coinService.ts`). Nothing the app sends decides an amount: the server
derives it from its own record of what happened.

| Event | Default | Idempotency key |
|---|---|---|
| Finished a How to Play tutorial | 5 | `tutorial:<child>:<game>` |
| Finished a game | 5 | `session:<id>:complete` |
| Won a board game (Ludo, Chess, Checkers, Connect Four, Snakes & Ladders) | 10 | same |
| Solved a puzzle (puzzles, matching, numbers, words categories) | 5 – 15 by difficulty | same |
| Daily challenge | 10 | `daily:<child>:<day>` |
| Finished a craft | 10 | `craft:<child>:<craft>` |
| Finished a lesson | 10 | `lesson:<child>:<lesson>` |
| Correct quiz answer | 5 | `quiz:<child>:<question>` |
| Discovered a fact | 1 | `fact:<child>:<fact>` |

Values live in the `rewards` setting (admin console → Feature flags & config) and reach the app
through `/v1/config`. A daily cap (default 150) applies per child; guardians may lower it per
child. A retried request, a double-ended session or a double-tapped purchase never pays twice.

## Reward shop (cosmetic only)

`reward_items`: hats and accessories, themes, board skins, backgrounds, badges, effects, token
designs, craft templates. Prices are in coins; nothing can be bought with money; there are no
loot boxes, timers or random rewards. Purchases are validated server-side (price, ownership,
premium-only items for subscribers, guardian's shop switch). Guardians can close the shop per
child; admins can close it globally, edit prices and add items.

## Rankings

Only games with a scoring rule take part (`backend/src/services/rankingService.ts`):

- **wins**: Ludo (30/win, ×1.5 for four players), Snakes & Ladders (20), Connect Four (20),
  Checkers (25); finishing without winning = 5.
- **rating**: Chess — Elo-style rating (K = 32) against the computer level (tutorial 600,
  easy 800, normal 1100, hard 1400) plus 40 points per win.
- **score**: puzzles, quizzes and sports with a validated maximum per game.

Server validation: a result is written **once per session** (unique `session_id`) when the
session ends, from the server's own duration and outcome; abandoned games, games shorter than
the rule's minimum, and scores outside the game's range are rejected. Leaderboards
(`GET /v1/player/rankings/:gameId?window=week|month|all&bracket=`) show nickname and avatar
only, exclude children whose guardian turned rankings off (`parental_controls.rankings_enabled`)
and paused profiles, and show the scoring rule under every board. Admins can switch rankings
off globally (feature flag) and see result counts per game.

## Verified results (anti-cheat)

A result is never taken on the app's word for the games that can be replayed. The server deals
each session's **seed** (`POST /sessions/start` → `seed`), the app logs every action the child
takes, and `POST /sessions/:id/end` carries that log as `proof: { restart, actions[] }`
(`restart` counts mid-game restarts, each a new deal derived from the seed). The server replays
the log through the **same game code the app runs** and records, ranks and pays what the replay
shows (`backend/src/services/replayService.ts`).

| Verdict | When | Effect |
|---|---|---|
| `verified` | the replay reproduces the claimed outcome, score and stars | recorded, ranked and paid as claimed |
| `corrected` | the log is valid but the claim differs | the replay's outcome, score and stars are used |
| `rejected` | no proof, malformed proof, the moves never finish the game, or the engine errors | recorded as abandoned; no coins, no ranking |
| `unverified` | the server could not check it (worker timeout or busy, session without a seed) | result kept, but no ranking and no win bonus; the child is not punished for our failure |
| `not_applicable` | an abandoned game, or a game that cannot be replayed | the older bounds-only checks apply |

- **Replayed** (16 ranked games): chess, chess tactics, memory cards, jigsaw, sudoku, word search,
  anagram builder, connect four, checkers, science quiz, geography quiz, maze runner, Ludo,
  Snakes & Ladders, match-3, block puzzle.
- **Not replayed**: cricket (timer-driven), bowling and football penalty (analogue aim and
  power measured on the device). They keep the score-range and minimum-time checks only.
- **Pass-and-play** (Ludo, Snakes & Ladders, chess "two players on this device") is verified but
  never ranked and never paid as a win, because one child plays both sides.
- The replay runs in a worker thread with a memory limit and an 8 s timeout, at most two at a
  time; a log may hold at most 3000 actions and 30 restarts, and the end route accepts a 256 KB
  body (all other routes keep 100 KB).
- The server code that replays games is **generated from the app's own game code**:
  `cd backend && npm run engines:build` rewrites `backend/src/games/engines.generated.ts`, and CI
  runs `npm run engines:check` so the two can never drift apart. Run `engines:build` and commit
  the result whenever you change a replayable game or `src/games/logic`.

**What this does not stop.** A log is still produced by the child's device. Someone who runs the
game's real code can produce a *legal* log (for example by solving the dealt sudoku, or by
playing chess with an outside engine). What it does stop is forged results: claiming a win that
was never played, editing scores, truncated or impossible games, or playing both sides in
pass-and-play for ranking points. Minimum game lengths and daily coin caps still apply.

## Daily challenge

One game per day per bracket (seeded by date), picked from what the child may play, shown on
Home with its coin bonus; finishing it pays the bonus once (`daily:<child>:<day>`).

## Guardian controls

Per child: rankings on/off, shop open/closed, daily coin cap, reduced motion, plus a read-only
view of the balance, ledger, owned rewards, tutorials finished and ad-free status
(`GET /v1/guardian/children/:id/rewards`).
