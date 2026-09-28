# DEVELOPMENT_STATUS.md — Exam Portal

Live checklist, updated after every stage. Nothing here is marked done
until it has actually been run and verified — no feature is claimed
complete on the basis of code existing alone.

## Phase 1 — Project inspection & architecture ✅ (this delivery)

- [x] Inspected the repository: found an existing, unrelated product
      (FOCUS) at the repo root; decided (with the project owner) to build
      the exam portal as a new, separate `exam-portal/` sub-project.
- [x] `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`,
      `DEVELOPMENT_STATUS.md` written.
- [x] Next.js 16 + React 19 + TypeScript + Tailwind v4 app scaffolded
      (`create-next-app`, App Router, `src/` dir, `@/*` import alias).
- [x] Prisma 7 configured against a real local PostgreSQL 16 database
      (`examportal_dev`), using the `@prisma/adapter-pg` driver adapter
      required by Prisma 7's new config model.
- [x] Foundation schema (`AdminRole`, `ContentStatus` enums + `AdminUser`
      model) migrated successfully (`prisma migrate dev`) and Prisma
      Client generated.
- [x] Centralized DB client (`src/lib/db/client.ts`) — the only place
      `PrismaClient` is instantiated, per Section 3.
- [x] Validated environment variables (`src/lib/env.ts`, Zod).
- [x] `.env.example` documents every variable this project will need
      through Phase 16, with no real secrets.
- [x] Homepage performs a real server-side Prisma query
      (`prisma.adminUser.count()`) and renders the result — proves the
      full request → Next.js → Prisma → PostgreSQL path works.
- [x] `/api/health` route handler checks live DB connectivity.
- [x] `npm run typecheck` — passes (0 errors).
- [x] `npm run lint` — passes (0 errors/warnings).
- [x] `npm run build` — production build succeeds.
- [x] `npm run dev` — verified the homepage renders and `/api/health`
      returns `{"status":"ok","database":"connected"}`.
- [x] Verified responsive baseline (Tailwind mobile-first utilities;
      no fixed-width layout).
- [x] Cleaned up unwanted scaffold files that `prisma init`/`next dev`
      generate by default (`.claude/`, `.agents/`, `.windsurf/`,
      `CLAUDE.md`, `AGENTS.md`, `skills-lock.json` inside `exam-portal/`)
      — not part of this project.
- [x] Checked `npm audit`: pinned Prisma to the stable `7.10.0` line
      instead of the `8.0.0-rc` tag after the RC pulled in a bundled
      agent toolchain with high-severity transitive vulnerabilities.
      4 remaining high-severity findings are all in Prisma CLI's
      (dev-only, never deployed) bundled MySQL introspection driver —
      accepted as out of scope since this project only uses PostgreSQL.

## Phase 2 — Database schema ✅ (this delivery)

- [x] Implemented the full `DATABASE_SCHEMA.md` design in `schema.prisma`:
      `User`, `Organization`, `Category` (self-referencing tree), `State`,
      `Tag`, `Exam`, `ExamTag`, `Job`, `Result`, `AdmitCard`, `AnswerKey`,
      `Syllabus`/`SyllabusPaper`/`SyllabusSubject`/`SyllabusTopic`,
      `Admission`, `Scholarship`, `Article`, `ImportantLink`,
      `RelatedContent`, `Notification`/`NotificationDelivery`,
      `AuditLog`, `ContactMessage`, `Document`, `ExtractionJob`,
      `ExtractionResult`, `FieldOverride`, `ContentVersion` — 29 tables
      plus the existing `AdminUser`.
- [x] `npx prisma validate` and `npx prisma format` pass.
- [x] Migration (`full_schema`) generated and applied against the live
      local `examportal_dev` database with `prisma migrate dev`.
- [x] Prisma Client regenerated; `npm run typecheck` passes against the
      full model set (every relation/field reference type-checks).
- [x] Seed scripts added and run successfully against the live database:
  - `prisma/seedAdmin.ts` (`npm run seed:admin`) — bootstraps the first
    `SUPER_ADMIN` from env vars, idempotent (re-run is a no-op unless
    `--reset-password`).
  - `prisma/seedContent.ts` (`npm run seed:content [-- --with-samples]`)
    — seeds all 28 states + 8 union territories + `ALL_INDIA`, a starter
    category tree, and starter tags; `--with-samples` additionally
    creates one clearly-labelled **`[DEMO]`** organization/exam with a
    Job, AdmitCard, Result, and a full Syllabus → Paper → Subject → Topic
    tree, proving every relation in the schema round-trips correctly.
    Verified idempotent: running it twice does not duplicate rows
    (checked via row counts).
- [x] `npm run typecheck` / `npm run lint` / `npm run build` all pass
      after the schema change.
- [x] Homepage now also displays a live `Exam` count via Prisma.

## Phase 3 — Authentication & admin foundation ✅ (this delivery)

- [x] NextAuth (Auth.js) v4 credentials provider against `AdminUser`,
      configured in `src/lib/auth/config.ts` with a JWT session (12h),
      route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- [x] Password hashing via `bcryptjs` (`src/lib/auth/password.ts`,
      cost 12), reused by both the login flow and `seed:admin`.
- [x] Account lockout (`src/lib/services/adminAuth.ts`): 5 consecutive
      failed attempts locks the account for 15 minutes; a bcrypt
      comparison always runs, even for an unknown email, so response
      timing can't reveal which admin emails exist. Verified live: 5
      wrong-password attempts set `lockedUntil`, and the correct
      password is then also rejected until it expires.
- [x] Server-side role checks: `requireAdmin`/`requireAdminApi`
      (`src/lib/auth/session.ts`) are the single sanctioned way to check
      "signed in" / "allowed to do this" — every admin page and future
      Server Action/API route calls these directly (Section 16: never
      rely on the UI just hiding a button).
- [x] `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` —
      followed AGENTS.md's instruction to heed this project's
      breaking-change notices) redirects unauthenticated visitors away
      from `/admin/*` before the page renders. This is a UX layer only;
      the real authorization boundary is `requireAdmin` in the layout.
- [x] `seed:admin` script to bootstrap the first SUPER_ADMIN (built in
      Phase 2, ahead of schedule, since it was needed to seed demo
      content attributed to a real admin) — now also clears any lockout
      on `--reset-password` and shares the same `hashPassword` helper.
- [x] Admin login page (`/admin/login`) + protected `/admin` shell
      (`src/app/admin/(protected)/layout.tsx`) with a role-aware sidebar
      (`AdminSidebar`) previewing the full CMS nav, a header showing the
      signed-in admin + role, and a working sign-out button.
- [x] `/admin/forbidden` page for role-mismatch redirects.
- [x] Every admin/audit route is `noindex, nofollow` (Section 45: draft/
      admin content is never publicly indexable).
- [x] `AuditLog` `LOGIN` entry recorded on every successful sign-in —
      verified live via a direct database query after signing in.
- [x] `npm run typecheck` / `npm run lint` / `npm run build` all pass.
- [x] End-to-end verified via `npm run dev` + curl (full NextAuth
      CSRF → credentials → session-cookie flow, not just unit-level):
      unauthenticated `/admin` → 307 to `/admin/login`; correct
      credentials → session cookie that renders the real Overview page
      (live counts); 5 wrong attempts → account locked; correct password
      then also rejected while locked.

## Phases 4–20

Not started. See `PROJECT_PLAN.md` for the full ordered list
(public layout → exam/job system → results → admit cards → answer keys →
syllabus → articles/admissions/scholarships → search → SEO →
PDF/document system → AI extraction pipeline → human verification →
notifications → analytics → testing/security/performance →
production deployment → Android API readiness).

## Known follow-ups / decisions to revisit

- `prisma@8` will move out of RC eventually — re-run `npm audit` and
  consider upgrading once it's the stable `latest` tag and the bundled
  agent-toolchain dependency situation is resolved upstream.
- CI: add an `exam-portal` job to `.github/workflows/ci.yml` once there
  are tests to run (Phase 18), mirroring the existing `backend`/`admin`/
  `mobile` jobs.
- Decide on the object-storage provider (S3 / R2 / Supabase Storage) at
  the start of Phase 13, based on the project owner's existing accounts.
- Decide on the AI extraction provider/model at the start of Phase 14.
- Login brute-force protection today is per-account lockout only (5
  attempts / 15 min), which is DB-backed and works across instances.
  There's no additional per-IP rate limit yet — revisit in Phase 18
  (security hardening) if abuse patterns call for one (e.g. Upstash
  Redis-backed limiter, since in-memory limiting doesn't survive
  serverless cold starts/multiple instances).
- `EDITOR`/`AUTHOR`/`REVIEWER` permissions are defined as an enum today
  but not yet exercised by any content mutation (there isn't any yet) —
  `requireAdmin(allowedRoles)`/`requireAdminApi(allowedRoles)` are ready
  to be called with the right role list as each content type's
  create/edit/publish/approve actions are built from Phase 5 onward.
