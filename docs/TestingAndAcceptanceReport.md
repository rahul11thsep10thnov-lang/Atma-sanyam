# Testing and Acceptance Report

Only results that were actually executed are recorded here. Run date: 2026-11-22, in the development container.

## Automated backend tests (Vitest + Supertest)

| Database | Command | Result |
|---|---|---|
| PGlite (embedded PostgreSQL, default) | `cd backend && npx vitest run` | **198 / 198 passed**, 19 files |
| PostgreSQL 16 (local server) | `TEST_DATABASE_URL=postgres://…/policeexams_test npx vitest run --no-file-parallelism` | **198 / 198 passed**, 19 files |

The final count includes `rate-limits.test.ts` (1 test), added last. Both databases were re-run after it was added.

### New in this work (35 tests)

| File | Tests | Covers |
|---|---|---|
| `attempts.integrity.test.ts` | 11 | 10 simultaneous starts → 1 attempt; the DB refuses a second open attempt; parallel starts cannot exceed the free quota; concurrent submits scored once; newest autosave version wins; late-submission rule; save after deadline closes the attempt; answer-key snapshot; sweeper; other users cannot read / save / submit; server clock |
| `access-policy.test.ts` | 7 | Device sharing; network grouping with a higher limit; same Wi-Fi, different phones unaffected; guest creation limit; signed-in counted per account; policy switch, validation and report without personal data; CORS preflight with `X-Device-Id` |
| `progress.test.ts` | 8 | Auth; time-ordered application; retries applied once; daily quiz and streak; imported streak only once; invalid events and point bounds; separation between users; guest → account merge of progress **and** attempts with a clashing open attempt |
| `question-versioning.test.ts` | 5 | Edit mid-attempt keeps the served wording and key in the result; restore as a new version; bulk edit with revisions and skips; quality flags only above the minimum sample; flag rules |
| `rate-limits.test.ts` | 1 | Per-session autosave budget: one session is capped at 240 per minute, another on the same IP is unaffected (fails without the change) |

Existing tests updated for intended contract changes:
- `flow.integration`: the paper is locked until start; summary checked with `toMatchObject` because fields were added.
- `figures.api` and `mocktest-edit`: read the paper with the student's session.

A test-isolation bug in `question-versioning.test.ts` (a randomly chosen question could overlap with another test's fixtures) was found on a repeat run and fixed. The file then passed 12 consecutive runs.

## Static checks and builds

| Check | Result |
|---|---|
| Backend `tsc` build | Passed |
| Website `eslint .`, `next typegen` + `tsc --noEmit`, `next build` | Passed (189 static pages) |
| Admin `eslint .`, `tsc --noEmit`, `next build` | Passed (21 pages) |
| Backend lint | No linter configured in `backend/`; type-checked only |

## End-to-end acceptance (browser)

Setup:
- Real API on PostgreSQL 16 with mock AI, website dev server.
- Playwright Chromium, Pixel 7 viewport.
- A published 5-question test (2 marks, −0.5).

| Step | Expected | Observed |
|---|---|---|
| Anonymous `GET /mock-tests/:id` | Details and sections, no questions | `paperLocked: true`, 0 questions, sections 5 |
| Instructions page | Shows 5 questions | ✓ |
| Answer Q1, Q2 | Autosaved | Server state B, C; badge "Saved" |
| Go offline, answer Q3 | Kept locally, offline badge | Badge "Offline — answers kept on this device" |
| Back online | Queued change sent | Server state B, C, D |
| Reload | Resume with answers and server deadline | Answered 3; timer continued from the deadline |
| Timer | Ticks; survives reload | 10:00 → 09:56 in 4 s; after reload continued (9:57 → 9:53) |
| Submit | Confirmation with counts, then server result | Dialog showed counts; result −1.5/10 (3 wrong × −0.5); negative marks, chapter-wise, filters shown |
| Local cache | Cleared after confirmed submit | 0 attempt / pending keys left |
| Bookmark on result + answers | One event each, uploaded | 1 bookmark + 1 answer event in DB; outbox empty |
| Guest farming | 7th free start from one network + browser refused | `403 login_required` (network 6/6); login prompt shown |
| Page errors | None | None |

### Admin console (Playwright Chromium, desktop, same API)

| Step | Observed |
|---|---|
| Sign in, open Question Quality | Content KPIs shown (12 questions, 12 without source); "5 questions have answers; 0 have at least 10" with the minimum set to 10 |
| Question Bank → select 2 → Edit details… → difficulty hard, reason | "Updated 2 question(s)." |
| Question page → Versions | "Current: v2", v1 listed as Bulk edit with the reason, expandable |
| Restore this version (confirm) | "Current: v3", success message |
| Revision content | Bulk-editing an easy question to medium stored v1 with `easy`, current `medium` |
| Page errors | None |

Defects found by the end-to-end run and fixed before release (with regression coverage where testable):
1. CORS blocked `X-Device-Id`: every live-test request failed.
2. The result could be applied twice after a late autosave, recording answers twice.
3. The bookmark toggle ran inside a state updater (double toggle in development).

## Not verified

- Real Supabase (Google / OTP) sign-in and the guest → account merge through the browser. Covered by API tests only.
- Razorpay in live mode.
- Neon / Render / Vercel deployment of this version, and migration 0006 on production data.
- Load testing (many simultaneous students). Correctness under concurrency is tested; throughput is not.
- Real mobile devices and slow 3G. Only an emulated viewport and offline toggling were tested.
