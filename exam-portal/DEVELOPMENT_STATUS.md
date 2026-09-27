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

## Phase 2 — Database schema (not started)

- [ ] Implement the full `DATABASE_SCHEMA.md` design in `schema.prisma`
      (Organization, Category, State, Exam, Job, Result, AdmitCard,
      AnswerKey, Syllabus + structured children, Admission, Scholarship,
      Article, Document, ImportantLink, Notification, Tag, ExamTag,
      RelatedContent, AuditLog, ContentVersion, ExtractionJob,
      ExtractionResult, FieldOverride, ContactMessage).
- [ ] One migration per logical group, each applied and verified.
- [ ] Seed script with clearly-marked development/demo data
      (Section 37) — a handful of example organizations/exams only.

## Phase 3 — Authentication & admin foundation (not started)

- [ ] NextAuth (Auth.js) v4 credentials provider against `AdminUser`.
- [ ] Password hashing via `bcryptjs`.
- [ ] Server-side role checks (SUPER_ADMIN/EDITOR/AUTHOR/REVIEWER) in
      middleware + every admin server action — never UI-only.
- [ ] `admin:seed` script to bootstrap the first SUPER_ADMIN.
- [ ] Admin login page + protected `/admin` shell.

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
