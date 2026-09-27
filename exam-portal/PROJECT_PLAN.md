# PROJECT_PLAN.md — Exam Portal

## What this is

An original, mobile-first, SEO-friendly Indian government examination
information portal — similar in **functional scope** to sites like
SarkariResult (jobs, results, admit cards, answer keys, syllabus,
admissions, scholarships, exam calendars, articles) but with its own
design, copy, branding and code. No text, layout, logo or code is copied
from any existing site.

This product lives at `exam-portal/` in the `atma-sanyam` repository,
**separate from the existing FOCUS app** (mobile app + `backend/` +
`admin/` at the repo root). The two products share a git history and CI
pipeline but not a codebase, database, or deployment.

## Why a fresh sub-project instead of extending FOCUS

FOCUS is a finished, unrelated product (a puzzle-assembling focus timer)
with its own Express/Drizzle backend and Next.js admin console. There is
no meaningful code, schema, or UI to reuse between a focus-timer app and a
government-jobs information portal, so building this as a new top-level
directory keeps both products independently deployable, testable, and
maintainable — nothing in FOCUS is modified by this work.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server rendering for SEO, one codebase for public site + admin CMS + API |
| Styling | Tailwind CSS v4 | Fast, consistent, mobile-first utility styling |
| Database | PostgreSQL | Relational integrity for interlinked exam/job/result data |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) | Type-safe queries, migrations, matches the spec's preference |
| Auth | NextAuth (Auth.js) v4, credentials + bcrypt | Established, works with the current stable Next.js/React combination |
| Validation | Zod | Server-side validation for every form/API input |
| File storage | S3-compatible object storage (provider-agnostic) | PDFs/images never hard-coded to local disk |
| Deployment | Vercel (app) + Neon (Postgres) | Matches the spec; also works on any Node host |

`prisma@8` is a release-candidate at the time of writing and pulls in a
bundled AI/agent toolchain with several high-severity transitive
vulnerabilities (see `npm audit`). We pinned to the stable `prisma@7.10.0`
/ `@prisma/client@7.10.0` line instead. Prisma 7 also changed how the
`DATABASE_URL` is wired in (via `prisma.config.ts` + a driver adapter,
not a `url =` line in `schema.prisma`) — the foundation already reflects
that.

## Development order

Following the spec's Section 46 exactly:

1. **Project inspection & architecture** ← *this phase*
2. Database schema (full normalized design)
3. Authentication & admin foundation
4. Public layout
5. Exam & Job system
6. Results
7. Admit Cards
8. Answer Keys
9. Syllabus
10. Articles / Admissions / Scholarships
11. Search
12. SEO
13. PDF / document system
14. AI extraction pipeline
15. Human verification workflow
16. Notifications
17. Analytics
18. Testing / security / performance hardening
19. Production deployment
20. Android API readiness

Each phase: explain → inspect → implement the smallest complete version →
typecheck/lint/build/test → fix → update `DEVELOPMENT_STATUS.md` → stop
and report before continuing to the next phase.

## What Phase 1 (this delivery) includes

- This document, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` (full target
  design), `DEVELOPMENT_STATUS.md`.
- A working Next.js + TypeScript + Tailwind app scaffold at `exam-portal/`.
- Prisma wired to a real local PostgreSQL database, with one placeholder
  model (`AdminUser` + `AdminRole`/`ContentStatus` enums) proving the
  connection, migration, and codegen all work.
- A homepage that renders and performs a live database round-trip, plus
  a `/api/health` endpoint.
- `.env.example`, `.gitignore` entries, `postinstall` codegen script.

Full schema, auth, and every content type come in later phases — see
`DEVELOPMENT_STATUS.md` for the live checklist.
