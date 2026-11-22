# API Documentation (changes in this work)

Base path `/api`. JSON in and out. Errors: `{ "error": { "code", "message", "details"? } }`. Student endpoints use `Authorization: Bearer <session token>` (guest or signed in). Admin endpoints use an admin session and permissions. The website also sends `X-Device-Id` (a random id; the server stores only a keyed hash of it). The endpoints that existed before and did not change (auth, enrolment, taxonomy, generation, imports, PDFs, settings) are documented in `backend/README.md`.

## Student

### `GET /mock-tests/:id` — changed
Details for everyone: `title`, `durationMinutes`, `totalQuestions`, `marksPerQuestion`, `negativeMarks`, `language`, `examName`, `sections: [{subjectId, subjectName, count}]`, `paperLocked`. `questions` is `[]` unless the caller is signed in and has an attempt (any status) on this test; then it holds the paper without keys or explanations and is sent `Cache-Control: private, no-store`.

### `POST /mock-tests/:id/start`
`201 {attemptId, startedAt, deadlineAt, serverTime, resumed, totalQuestions}`. Idempotent: an open attempt is returned with `resumed: true`, and an expired one is finalised first. Refusals:
- `402 subscription_required`: free tests used up.
- `403 login_required`: guest free tests used up on this device or network; `details: {kind, scope, used, limit}`.
- `429 login_required`: too many new guest accounts (returned at guest sign-in).

### `PUT /attempts/:id/answers` — new
Body `{answers: [{questionId, selectedOption: "A"|…|null, markedForReview, timeSpentSeconds?, version ≥ 1}]}` (1–500). `200 {saved: [{questionId, version}], stale: [questionId], serverTime, deadlineAt, status}`. `409 attempt_closed` after deadline + grace (the attempt is finalised). Rate limit: 240 per minute.

### `GET /attempts/:id/state` — new
`{attemptId, status, startedAt, deadlineAt, serverTime, graceSeconds, answers: [{questionId, selectedOption, markedForReview, timeSpentSeconds, version}]}`. Not cached.

### `POST /mock-tests/:id/submit` — extended
Body `{attemptId, answers: [{…, version?}]}`. For each answer, the submitted copy is used if it has no version or a version at least the saved one. Late submissions become `auto_submitted` using saved answers. Returns the result (same shape as below). A repeat returns the stored result.

### `GET /attempts/:id` — extended
Adds:
- top level: `status`, `late`, `topics` (chapter-wise `{subjectName, chapterName, correct, incorrect, total}`);
- per question: `chapterName`, `timeSpentSeconds`, `isCorrect`;
- summary: `negativeMarksLost`, `accuracy`, `averageSecondsPerAnswered`.

Questions show the served version's wording and key.

### `GET /attempts?page&pageSize` — now paginated

### `GET /time` — new
`{serverTime}`. No auth, not cached.

### `GET /me/progress` — new
`{bookmarks: [questionKey], mistakes: [{questionKey, wrongCount, lastWrongAt}], points, streak, lastQuizDate}`.

### `POST /me/progress/events` — new
Body `{events: [1..200]}`. Each event has `id` (8–64 chars, client-made), `at` (ISO time) and one of:
- `{kind: "bookmark", questionKey, on}`
- `{kind: "answer", questionKey, correct}`
- `{kind: "mistake_clear", questionKey}`
- `{kind: "daily_quiz", date: "YYYY-MM-DD", importedStreak?}`
- `{kind: "points", amount: 1..20}`

Returns `{applied, duplicate, rejected, progress}`.

Rules:
- Events are applied in time order, each id once.
- Future times are clamped to now.
- A daily quiz counts once per day: +20 points, and the streak rises on consecutive days.
- `importedStreak` is used only for a user's first quiz record.
- Point events are capped at 100 per user per UTC day; extra ones are `rejected`.

## Admin

| Method & path | Permission | Purpose |
|---|---|---|
| `GET /admin/questions/quality?examId&subjectId&chapterId&minSample=30&flag&limit=100` | questions:read | Bank health and per-question performance with flags |
| `POST /admin/questions/bulk-edit` `{ids ≤ 500, set: {chapterId?, topicId?, difficulty?, sourceName?, sourceReference?, validAsOf?}, summary?}` | questions:write | Returns `{updated, skipped: [{id, reason}]}`; unknown fields → 400 |
| `GET /admin/questions/:id/revisions` | questions:read | `{currentVersion, revisions: [{version, snapshot, changeKind, changeSummary, changedBy, replacedAt}]}` |
| `POST /admin/questions/:id/revisions/:version/restore` | questions:write | Restores as a new version; 404 if the version doesn't exist; 422 if it fails validation |
| `GET /admin/access-policy?days=7` | settings:write | Policy and abuse report |
| `PUT /admin/access-policy` | settings:write | Update the policy (audited) |

`PUT /admin/questions/:id` now also stores the previous version (see [QuestionVersioningSpecification.md](QuestionVersioningSpecification.md)). `GET /admin/questions/:id` includes `version`.
