# Architecture Audit (Stage 0)

Scope: the website (Next.js 16, repo root), the admin console (`admin/`, Next.js) and the API (`backend/`, Express 5 + Drizzle on PostgreSQL / PGlite). This audit was made before the reliability work and drove it. Each finding links to where it was addressed.

## Architecture as found

| Layer | Role | Data |
|---|---|---|
| Website | Demo tests on built-in data; live tests from the API; practice, daily quiz, dashboard | Progress (bookmarks, mistakes, points, streak, attempts) only in `localStorage` |
| API | Auth (guest, Supabase link, admin), question bank and AI pipeline, mock tests, attempts and scoring, enrolment (Razorpay) | PostgreSQL (Neon in production), PGlite in development and tests |
| Admin | Taxonomy, bank, review, generation, imports, mock tests, analytics, settings | Through the API only |

Server-side scoring, answer keys withheld from the website, blueprint-driven test generation with an explicit shortage error, and per-account free quotas checked at start already existed and were kept.

## Findings

| # | Finding | Risk | Status |
|---|---|---|---|
| A1 | Two parallel `start` calls could create two open attempts for the same test, and could both pass the free-quota check | Quota bypass; inconsistent results | **Fixed**: per-user advisory lock, partial unique index, quota check inside the start transaction (S1) |
| A2 | Two parallel `submit` calls could both score | Double scoring | **Fixed**: one finalisation routine under a row lock; repeats return the stored result (S1) |
| A3 | Answers were sent only at submit; a crash or a closed tab lost everything | Data loss | **Fixed**: versioned autosave, local copy, resume merge (S2) |
| A4 | An expired attempt was scored as all-unanswered, even when the student had answered | Unfair result | **Fixed**: expiry scores the answers saved in time; a sweeper finishes abandoned attempts (S2) |
| A5 | Free quota per account only; a guest account is free to create, so clearing storage gave new free tests | Commercial leakage | **Fixed**: device and network grouping for guests, guest creation limits, login prompt (S-B4) |
| A6 | Progress lived only in the browser | Lost on another device or after clearing storage | **Fixed**: progress events synced to PostgreSQL (S3) |
| A7 | `GET /api/mock-tests/:id` returned the full question paper of any published test (premium too) to anyone, publicly cached | Content scraping; paid content visible for free | **Fixed**: the paper is served only to a signed-in user who has started that test (S10) |
| A8 | Editing a question changed it in place; results of tests that served the old wording / key changed | Wrong past results, no audit trail of content | **Fixed**: answer-key snapshot at start, immutable revisions, version numbers (S6–9) |
| A9 | Submit had no confirmation; no answered / not-visited counts; timer based on a local countdown | Accidental submits; wrong time after sleep | **Fixed**: confirmation with counts, deadline timer with server offset (S4) |
| A10 | No per-question performance statistics or quality view | Bad questions (wrong key, dead options) stay unnoticed | **Fixed**: quality dashboard with minimum samples (S6–9) |
| A11 | Guest sign-in → Supabase link moved attempts blindly | With the new unique index, could fail when both had an open attempt on the same test | **Fixed**: the clashing guest attempt is finished first, inside one transaction (S3) |
| A12 | API CORS did not allow the new `X-Device-Id` header | Every browser request failed preflight (found end-to-end, never shipped) | **Fixed** with a regression test |

## Kept as is (by design)

- Demo tests on built-in data remain client-side and are clearly labelled; nothing commercial depends on them.
- Points and streak are motivation only and never unlock content; they are bounded on the server, not trusted for entitlement.
- Blueprint selection already refused shortfalls with a 422 listing what was missing; no silent reduction. See [MockTestBlueprintSpecification.md](MockTestBlueprintSpecification.md).

## Not done / open

See [ImplementationRegister.md](ImplementationRegister.md) for partial and open items.
