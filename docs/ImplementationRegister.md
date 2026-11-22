# Implementation Register

Status per stage of the PoliceChayan master implementation brief.

- **Done**: implemented and verified by executed tests.
- **Partial**: some of the scope is in place; the rest is listed.
- **Not done**: not implemented.

Branch: `claude/policeexams-website-build-pl5ccq` (repository `Atma-sanyam`).

| Stage | Item | Status | Evidence / notes |
|---|---|---|---|
| 0 | Architecture audit | Done | [ArchitectureAudit.md](ArchitectureAudit.md) |
| 1 | Guest / free-quota abuse protection | Done | Device + network grouping (hashed), guest creation limits, login prompt, admin policy and report. `access-policy.test.ts`, browser check |
| 1 | Demo vs. live separation, server-authoritative access | Done | Demo tests stay client-side; live access decided at start; paper served only after start |
| 2 | Progress sync to PostgreSQL | Done | Tables + events API, idempotent ids, outbox on the website, guest → account merge. `progress.test.ts`, browser check |
| 2 | Progress pages for live questions | Partial | Bookmarks and mistakes of **live** questions sync, but the Bookmarks / Mistakes pages list only built-in questions (they need the question text, which the API does not serve outside a test) |
| 3 | Atomic attempt creation | Done | Advisory lock, partial unique index, quota check inside the transaction |
| 3 | Idempotent submission, state machine | Done | `in_progress → submitted / auto_submitted`; single locked finalisation |
| 3 | Offline recovery | Done | Local copy, versioned autosave, retry with backoff, pending-submit retry, resume merge |
| 4 | Exam runner: header counts, palette states, controls, confirmation | Done | Answered / Not answered / Marked / Not visited; Clear Response; confirmation dialog |
| 4 | Server-synced timer | Done | Deadline + offset, refreshed every 2 min and on tab focus |
| 4 | Configurable policies | Partial | Grace period (env), marks and negative marks per test, access policy in admin. Section-wise timers and navigation locks **not done** |
| 4 | Versioned answer persistence | Done | Per-answer versions; stale saves ignored |
| 4 | Mobile UX | Done (emulated) | Checked at Pixel 7 size; not on real devices |
| 5 | Result analytics | Done | Negative marks, accuracy, average time, subject and chapter breakdown (weakest first), solution filters, per-question time, bookmarks |
| 5 | Retake | Done (existing) | Retry button; a new attempt after the previous one is final |
| 5 | Percentile / rank across students | Not done | Needs enough attempts per test and a decision on display rules |
| 6 | Question taxonomy and data model | Done (existing, extended) | Version column, revisions |
| 6 | Bulk management | Done | Bulk status actions (existing); bulk metadata edit (new) |
| 7 | Versioning with immutable snapshots | Done | Revisions on edit, restore and bulk edit; results show the served version. `question-versioning.test.ts` |
| 8 | Blueprint builder and selection engine, no silent shortfall | Done (existing, audited) | 422 with a per-section report; difficulty substitutions reported as warnings |
| 8 | Topic-level quotas in blueprints | Not done | Chapter level only |
| 9 | Quality dashboard | Done | Content health + performance flags with minimum sample; admin page |
| 9 | Import | Done (existing) | Console and CLI, dry run, idempotent by external id |
| 9 | Bank export (CSV / JSON) | Not done | Only PDF question papers |
| 9 | Source verification | Partial | Source materials and approval exist; dashboard counts missing / stale sources. No per-question "verified by / on" workflow |
| 9 | Performance intelligence | Done | Accuracy, skip rate, average time, option distribution, flags |
| 10 | Migrations, non-destructive and documented | Done | 0006–0008, [DatabaseMigrationRegister.md](DatabaseMigrationRegister.md) |
| 10 | API design and documentation | Done | [APIDocumentation.md](APIDocumentation.md) |
| 10 | Security review | Done | [SecurityAudit.md](SecurityAudit.md). Fixed paper exposure, CORS header, per-IP limits on shared networks |
| 10 | Tests | Done | 198 / 198 on PGlite and PostgreSQL 16; browser end-to-end for website and admin. [TestingAndAcceptanceReport.md](TestingAndAcceptanceReport.md) |
| 10 | Production deployment of this version | Not done | Not deployed. Migrations not yet run on Neon |

## Before going live

1. Create a Neon branch from production and start the new API against it, so migrations 0006–0008 run on a copy of real data. Then smoke-test a live test (start, answer, reload, submit).
2. Set `ABUSE_HASH_SECRET` in Render (any long random string).
3. Deploy the API and then the website and admin together. The old website cannot open live tests against the new API (the paper is withheld until start).
4. Watch Admin → Settings → Access policy for a few days. If students on shared networks see the login prompt too often, raise the network multiplier.
5. Run `npm audit` in all three apps.

This version is **not production-ready until steps 1–3 have been done and checked**. The tests above were all run in a development container.
