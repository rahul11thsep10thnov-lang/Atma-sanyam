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

## Daily challenge

One game per day per bracket (seeded by date), picked from what the child may play, shown on
Home with its coin bonus; finishing it pays the bonus once (`daily:<child>:<day>`).

## Guardian controls

Per child: rankings on/off, shop open/closed, daily coin cap, reduced motion, plus a read-only
view of the balance, ledger, owned rewards, tutorials finished and ad-free status
(`GET /v1/guardian/children/:id/rewards`).
