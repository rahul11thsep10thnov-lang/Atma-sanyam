# Backend Reliability Specification

How the API keeps an exam attempt correct under retries, races, crashes, bad networks and wrong device clocks. Code: `backend/src/services/attemptService.ts`.

## Attempt states

```
            start                      submit (in time)
  (none) ─────────▶ in_progress ─────────────────────────▶ submitted
                         │
                         │ deadline + grace passed (sweeper, late submit,
                         │ resume or result request)
                         ▼
                   auto_submitted   (late = true; only answers saved in time count)
```

`submitted` and `auto_submitted` are final. No transition leaves them.

## Invariants and how they are enforced

| Invariant | Mechanism |
|---|---|
| At most one open attempt per user and test | Partial unique index `test_attempts_one_open_uq (user_id, mock_test_id) WHERE status = 'in_progress'`; a race that hits it returns the existing attempt as resumed |
| Free quota / plan cannot be exceeded by parallel starts | `pg_advisory_xact_lock(hashtext('attempt:' + userId))` around the check and the insert, in one transaction |
| An attempt is scored once | One routine (`finalizeLocked`) under `SELECT … FOR UPDATE`; if already final, it returns without change. Submit, autosave-after-deadline, the sweeper and result reads all use it |
| Scores are never taken from the client | The client sends option letters only; extra fields (`score`, `correct`) are ignored |
| The answer key cannot change under a running attempt | At start each served question's key and version are copied to `test_answers.correct_option_snapshot` / `question_version`; scoring uses the snapshot |
| A slow or tampered client cannot buy time | Submissions after `deadline + ATTEMPT_GRACE_SECONDS` (default 120 s) are not accepted as given; the attempt is finalised as `auto_submitted` from answers saved before the deadline |
| An older save never overwrites a newer one | Each answer carries a client version; the server updates only when the new version is greater (`version < incoming`) |

## Autosave

`PUT /api/attempts/:id/answers` with `[{questionId, selectedOption, markedForReview, timeSpentSeconds, version}]`. Response: `saved` (versions now stored), `stale` (the server has a newer version: the client re-reads state), `serverTime`, `deadlineAt`. After the deadline + grace it answers `409 attempt_closed` and the attempt is finalised.

The client version is the time of the change on the server clock in ms since the attempt began (strictly increasing per question), so changes from two devices order correctly.

## Expiry sweeper

`server.ts` runs `finalizeExpiredAttempts` every 60 s (up to 200 attempts per pass, unref'd timer, cleared on shutdown). Results are also finalised lazily when read. Running several API instances is safe: finalisation is idempotent under the row lock.

## Idempotency summary

| Request | Repeat behaviour |
|---|---|
| `POST /mock-tests/:id/start` | Returns the open attempt (`resumed: true`, status 201 both times for compatibility) |
| `POST /mock-tests/:id/submit` | Returns the stored result |
| `PUT /attempts/:id/answers` | Same or older versions are ignored |
| `POST /me/progress/events` | Each event id is applied once (`progress_events` primary key) |

## Guest to account merge

On Supabase sign-in from a guest session, inside one transaction holding both users' attempt locks: guest attempts move to the account; where both have an open attempt on the same test, the guest's is finalised first. Progress rows are merged (bookmarks union, mistake counts added, points added, the later streak kept, event ids carried over).

## Logging

Structured JSON logs. Abuse events log counts and scope only. Passwords, tokens, raw IPs, device ids, emails and phone numbers are never logged.

## Verified by

`tests/attempts.integrity.test.ts` (races, double submit, versions, late rules, sweeper), `tests/progress.test.ts`, `tests/flow.integration.test.ts`; run on PGlite and PostgreSQL 16. See [TestingAndAcceptanceReport.md](TestingAndAcceptanceReport.md).
