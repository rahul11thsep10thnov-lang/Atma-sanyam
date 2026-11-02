# Timer and reward validation

All claims here come from the code at `628f65a`, unless they are marked as tested.

## 1. Session lifecycle (as implemented)

| Event | What happens | Source |
|---|---|---|
| Start | The duration is chosen on the dial (multiples of 5, typed or dragged). The session screen opens; `startedAt = Date.now()`. The screen is kept awake until the session ends. After 10 s a running-session note is saved. | `ActiveSessionScreen.tsx`, `storage/activeSession.ts` |
| Running | Remaining time = planned time − (now − last resume), recomputed every 200 ms from timestamps. It does not count ticks, so a slow frame or a recomposition does not drift. | `useFocusTimer.ts` |
| First 10 s | "Leave" withdraws for free: no record, no penalty. | `GRACE_SECONDS = 10` in `spaces/catalog.ts` |
| App leaves the foreground (home, another app, **screen off**, incoming call) | The clock is frozen. A warning notification is sent if reminders are on. Return within 5 s (configurable 3–60 s) and the session resumes with the away time *not* counted. Stay away longer and the session **fails** (`left_app`). | `useFocusTimer.ts` |
| Give up | Confirmation dialog, then the session fails (`gave_up`). The Android back button does the same. | `ActiveSessionScreen.tsx` |
| Complete | `finish('completed')` runs once (`finishedRef`). A history record is saved, then rewards. | |
| Process killed (swipe away / system) | At the next launch the note is settled as `left_app`: failed history record, the usual penalty, and a notice. Within the free 10 s, nothing happens. | `focusEngine.settleInterruptedSession`, `InterruptedSessionNotice.tsx` |

There is **no pause and no Pomodoro**. "Paused" in the code means "abandoned" (`recordPausedSession`).

**P0-1 (screen sleep):** fixed. The screen stays on during a session, so it no longer times out into a failure. Locking the phone on purpose still counts as leaving. Not yet confirmed on a phone.

## 2. Rewards on completion (`spaces/focusEngine.ts`)

The minutes used are the **planned** minutes (a completed session ran them all). In a group session, the server's reward minutes are used instead.

| Picked | Reward |
|---|---|
| Garden plant | Coins = minutes, plus milestone bonuses. A new permanent plant of size `sizeForMinutes(minutes)` is placed automatically in its species' segment (or on the balcony if picked there and it has room). Under 15 min: coins only, no plant. |
| Picture / own photo / quote | Coins. At 15 min or more, a framed jigsaw of tier `tierForMinutes(minutes)`, after which the person picks museum / balcony wall / keep / bin. |
| Balcony | Coins. The balcony's focus plant grows. |

### Abandonment penalties

- **Plant session:** a wilted sapling in that segment.
- **Balcony or picture session:** the focus plant droops, and a wilted sapling and a broken picture appear.
- Each penalty clears for 40 coins.

## 3. Thresholds: tested, 27/27 pass

| Minutes | Size | Tested values |
|---|---|---|
| < 15 | none | 0, 1, 14, 14.99 |
| 15–29 | 1 | 15, 16, 29, 29.99 |
| 30–59 | 2 | 30, 31, 59 |
| 60–89 | 3 | 60, 61, 89 |
| 90–119 | 4 | 90, 91, 119 |
| 120–149 | 5 | 120, 121, 149 |
| 150–179 | 6 | 150, 151, 179 |
| ≥ 180 | 7 | 180, 181, 240, 600 |

Plants and jigsaws use the same table (`src/growth/size.ts`). Every jigsaw has the same ~10,000 pieces; the tier decides how large the framed picture hangs.

### Growth animation

- Progress is computed from elapsed time ÷ planned time (`growthProgress`), never from frame count.
- The seed takes the first 10 %.
- The stages then run up to the size the planned minutes will earn.

## 4. Duplicate and consistency protection

| Check | Status |
|---|---|
| Timer completion fires once | `finishedRef`: OK |
| One plant per session id | Tested OK |
| One artwork per session | Created once per `handleComplete` call. The call itself has no "already handled" guard (P2-2; only reachable twice in online group mode). |
| Coins once per session | Not idempotent by session id (P2-2) |
| Atomic writes | No: history, coins and plant/artwork are separate writes (P2-2). A crash between them leaves partial results. |

## 5. Garden: tested

- 5 segments; capacity ≥ 167 slots per segment (requirement: 150).
- Shuffle moves positions only.
- Placed plants never move except by shuffle.
- A plant that finds no slot is kept as "homeless" (`slot −1`) and re-homed later; it is never deleted.
