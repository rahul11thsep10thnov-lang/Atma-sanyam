# Exam Engine Specification (website)

Code: `src/components/exam/ExamRunner.tsx`, `src/components/exam/ExamResult.tsx`, `src/app/mock-test/live/[id]/attempt/page.tsx`, `src/lib/attemptSync.ts`.

## Two kinds of test

| | Demo tests (`/mock-test/[id]`) | Live tests (`/mock-test/live/[id]`) |
|---|---|---|
| Source | Built-in website data | API (published by admins) |
| Scoring | In the browser (practice only) | On the server only |
| Access control | None (free practice) | Server: free quota, plan, guest protection |
| Progress | Local, synced as progress events | Attempt on the server; local mirror for the dashboard |

The browser never decides entitlement. `localStorage` holds only conveniences: the session token, a random device id, the in-progress copy of answers and an outbox of progress events.

## Live attempt flow

1. **Instructions** page loads the test details and per-section counts (`GET /mock-tests/:id`; the paper is withheld).
2. **Start / resume**: `POST /mock-tests/:id/start`. Refusals are shown in place:
   - `402 subscription_required` → enrol prompt.
   - `403/429 login_required` → free sign-in prompt (guest limits).
3. **Paper**: `GET /mock-tests/:id` with the session, after start. A copy is cached for offline resume.
4. **Resume merge**: on `resumed`, `GET /attempts/:id/state`. Per question, the newer version (local or server) wins.
5. **Running**: every change gets a new version, is stored locally at once, and is sent within ≈0.8 s.
6. **Submit**: confirmation dialog with the counts and time left → all answers with versions and per-question seconds. The result shows only after the server replies; the request is kept as a pending submission and retried (on load and when back online) until it succeeds.
7. **Result**: from the server. The local mirror updates the dashboard and mistake notebook once per attempt.

## Timer

- The deadline comes from the server (`deadlineAt`). The device-clock offset is measured at start and refreshed every 2 minutes (`GET /time`, half the round trip added).
- Time left is computed as `deadline − (Date.now() + offset)`. It is recomputed when the tab becomes visible again, so sleep, background tabs and a changed device clock do not drift it.
- At zero the runner submits. If that submission is late, the server applies the late rule (see [BackendReliabilitySpecification.md](BackendReliabilitySpecification.md)).

## Autosave states (badge in the header)

| Badge | Meaning |
|---|---|
| Saved | Server has every change |
| Saving… | Request in flight, or changes waiting for a retry after a server error |
| Offline — answers kept on this device | No connection; retry with backoff 2 s → 5 → 10 → 20 → 30 s, and immediately on `online` |

`409 attempt_closed` while saving (time ran out, or another device submitted) → the result is fetched and shown with a note.

## Runner UI

- Header: title, answered count, sync badge, timer, palette button.
- Subject tabs with progress.
- Counts strip: Answered / Not answered / Marked / Not visited.
- Palette states: answered, not answered (visited), marked, answered + marked, not visited.
- Action bar: Previous, Mark & Next, Save & Next, Clear Response, Submit.
- Per-question time is accumulated while a question is open.
- Mobile: bottom sheet palette, sticky actions, 16 px+ text, large tap targets. Checked at Pixel 7 size end to end.

## Result screen

Score / max, accuracy (correct ÷ attempted), percentage, time taken, correct / incorrect / skipped, negative marks lost, average time per answered question, subject-wise, chapter-wise (weakest first, colour bars). Solutions can be filtered (all / wrong / skipped / correct) and show per-question time and a bookmark toggle. Late submissions are labelled.

## Configurable policies

| Setting | Where | Default |
|---|---|---|
| Grace after deadline | `ATTEMPT_GRACE_SECONDS` (API env) | 120 s |
| Duration, marks, negative marks | Per mock test (admin) | — |
| Free tests per kind, guest limits | Admin → Settings → Access policy | See [SecurityAudit.md](SecurityAudit.md) |

## Not included

Section-wise locked timers, per-section navigation locks and calculator / rough-sheet tools are not implemented (see [ImplementationRegister.md](ImplementationRegister.md)).
