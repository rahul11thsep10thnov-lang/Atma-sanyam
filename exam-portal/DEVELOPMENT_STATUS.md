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

## Phase 4 — Public layout ✅ (this delivery)

- [x] Design tokens (Section 32): an original teal/amber/slate palette
      defined as Tailwind v4 `@theme` CSS variables in `globals.css` —
      deliberately not the red/orange associated with existing
      government-jobs sites.
- [x] `(public)` route group (`src/app/(public)/`) wraps the homepage and
      search page with a shared `Header`/`Footer`; `/admin/*` and
      `/api/*` stay outside it, unaffected.
- [x] `Header` (logo/brand, desktop nav, `SearchBar`) and `MobileNav`
      (hamburger menu, client component) — Section 33's Header/Navbar/
      MobileNavbar/SearchBar components.
- [x] `SearchBar` is a plain `<form method="GET">` — no client JS
      required to search (Section 25: minimal JavaScript).
- [x] `Footer` with an "independent, unofficial" disclaimer (Section 42:
      never let real/fabricated/editorial content blur together —
      applies to the site's own framing too).
- [x] Homepage rebuilt per Section 7's section list: Latest Jobs,
      Latest Results, Latest Admit Cards, Latest Answer Keys, Popular
      Exams, Popular Organizations, Browse by State, Closing Soon
      (announcements), Articles. Every section is backed by a real
      Prisma query in `src/lib/services/home.ts` (PUBLISHED-only,
      capped `take`, minimal `select`) — nothing hard-coded.
  - "Popular Exams" is honestly labelled as ordered by closest
    application deadline, not a fabricated popularity score — real
    click-based ranking needs Phase 17's analytics.
  - "Closing Soon" is derived from `applicationEndDate` rather than a
    separate hand-curated "announcements" content type the schema
    doesn't define.
  - Every section has a real empty state (`EmptyState`) when nothing is
    published yet — verified live (Results/Answer Keys/Articles all
    correctly show their empty state against the current seed data).
- [x] `JobCard`, `ExamCard`, `ResultCard`, `AdmitCard`, `AnswerKeyCard`,
      `ArticleCard` (Section 33) render as previews (not links) for now
      — their detail pages (`/jobs/[slug]` etc.) don't exist until Phase
      5+, and linking to them today would just be a dead link from our
      own UI. `Chip` previews Organizations/States the same way.
- [x] Minimal cross-content search (`src/lib/services/search.ts`,
      `/search`) — title-only, Exam + Job, no filters/pagination —
      exists only so the header search bar isn't a dead end before
      Phase 11 builds the real thing. Verified live: a real query
      ("clerk") finds the seeded demo exam/job; a non-matching query
      shows its own empty state.
- [x] Custom `not-found.tsx` (Section 35) instead of the Next.js default.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] Verified end-to-end via `npm run dev` + curl: homepage renders all
      sections with real data and correct empty states; search finds
      real matches and handles no-match; custom 404 returns a real 404
      status; `/admin` and `/api/health` still work unchanged.

## Phase 5 — Exam & Job system ✅ (this delivery)

- [x] `src/lib/services/workflow.ts`: the DRAFT → IN_REVIEW → APPROVED →
      PUBLISHED → ARCHIVED workflow (Section 17) as one shared,
      role-checked state machine, reused by both Exam and Job (and
      every future content type from Phase 6 on) instead of
      reimplementing it per type.
- [x] `src/lib/services/ownership.ts`: AUTHOR may create content and
      edit only their own drafts; EDITOR/SUPER_ADMIN may edit anything;
      REVIEWER reviews/approves/rejects but doesn't edit fields directly
      (Section 16) — enforced in the Server Actions, not just the UI.
- [x] `src/lib/services/contentVersion.ts`: editing or transitioning an
      already-PUBLISHED record snapshots the previous row first
      (Section 21A Step 16) — verified live: edited a published job's
      vacancy count, and the prior value (250) landed in
      `ContentVersion.snapshot` while the new value (999) went live.
- [x] Every create/update/publish/approve/reject/archive action records
      an `AuditLog` row (Section 27) — verified live via direct DB query
      after a full create → review → approve → publish run.
- [x] Full Exam admin CRUD (`/admin/exams`, `/new`, `/[id]/edit`) and
      Job admin CRUD (`/admin/jobs`, ...), both with Zod-validated
      Server Actions (`src/lib/validation/exam.ts`, `job.ts`), unique
      slug generation (`src/lib/slug.ts`), and `StatusActions` buttons
      driven server-side by `availableTransitions(status, role)`.
- [x] Public `/exam/[slug]` and `/jobs/[slug]` detail pages, `/jobs`
      index with pagination, and `/organization/[slug]`,
      `/category/[slug]`, `/state/[slug]` listing pages — all reading
      only `PUBLISHED` content.
- [x] Section 9's Job page template: `ImportantDates`,
      `InformationTable` (renders "Not specified in the available
      notification." for unknown fields, never a guess), selection
      process, important links, deterministic `FAQ`
      (`src/lib/faq.ts` — every answer traces to a real stored field,
      no invented content), `RelatedContent` (other jobs under the same
      exam).
- [x] Homepage/`JobCard`/`ExamCard`/state & organization `Chip`s now
      link to their real detail pages (Phase 4 had these as
      non-clickable previews); Result/AdmitCard/AnswerKey/Syllabus
      still render as `UpcomingContentList` previews since those
      phases (6–9) haven't shipped pages yet — linking to them today
      would be a dead link from our own UI.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] **Verified end-to-end with a real headless-browser run** (not just
      curl): logged in, created an Exam, ran it through
      Submit for Review → Approve → Publish, confirmed it appeared on
      the public exam page and homepage; created a Job under that exam,
      ran the same workflow, and confirmed the published job page
      rendered the real vacancy count, qualification, selection process,
      FAQ, and Apply/Official Website links — then confirmed `/jobs`
      and the exam page both link to it.

## Phase 6 — Results ✅ (this delivery)

- [x] `src/lib/services/results.ts`: admin CRUD, the same shared
      `workflow.ts`/`ownership.ts`/`contentVersion.ts` (no new logic
      needed — this is exactly what building those shared modules in
      Phase 5 was for), plus public `listPublishedResults` (paginated)
      and `getPublishedResultBySlug`.
- [x] Admin `/admin/results` (list/new/edit) with `ResultForm`, including
      "Related Admit Card"/"Related Answer Key" selects populated from
      whatever `AdmitCard`/`AnswerKey` rows already exist (those models
      have existed since Phase 2; their own admin CRUD is Phases 7/8).
- [x] Public `/results` (paginated) and `/results/[slug]` per Section
      10: organization/exam, result date, important information, result
      link, official website, related admit card/answer key, related
      exam. A related Admit Card/Answer Key only renders (as a
      **preview**, not a link — their detail pages are Phases 7/8) when
      it's itself `PUBLISHED`, so a result never surfaces a draft
      record's title to the public.
- [x] `ResultCard` now links to `/results/[slug]` (was a preview since
      Phase 4); the exam page's "Results" section upgraded from
      `UpcomingContentList` to real `RelatedContent` links.
- [x] Header/mobile nav "Results" and the admin sidebar's "Results" now
      point to the real pages.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] **Verified end-to-end with a real headless-browser run**: created
      a Result under the existing demo Exam, linked it to the
      already-published demo Admit Card, ran it through Submit for
      Review → Approve → Publish, and confirmed the public result page
      renders the real description/date/links, shows the related admit
      card as a preview, and that the result now appears on the exam
      page, `/results`, and the homepage's Latest Results section.

## Phase 7 — Admit Cards ✅ (this delivery)

- [x] `src/lib/services/admitCards.ts`: admin CRUD, the same shared
      workflow/ownership/versioning/audit modules (again, no changes
      needed to any of them), plus public `listPublishedAdmitCards`
      (paginated) and `getPublishedAdmitCardBySlug`.
- [x] Admin `/admin/admit-cards` (list/new/edit) with `AdmitCardForm`.
- [x] Public `/admit-card` (paginated) and `/admit-card/[slug]` per
      Section 11: exam/organization, release date, exam date, download
      link, official website, instructions, related result (via the
      schema's real `Result.relatedAdmitCardId` back-relation), related
      answer key. There's no direct FK from AdmitCard to AnswerKey in
      the schema, so "related answer key" is derived from sharing the
      same exam — the same central-entity pattern used throughout,
      never a keyword match (Section 21A Step 8).
- [x] `AdmitCard` card component now links to `/admit-card/[slug]` (was
      a preview since Phase 4).
- [x] Two previews upgraded to real links now that the target page
      exists: the Result page's "Related Admit Card" and the exam
      page's "Admit Cards" section (both were `UpcomingContentList`,
      now `RelatedContent`). "Related Answer Key" on both pages stays a
      preview — Phase 8's job.
- [x] Header/mobile nav "Admit Cards" and the admin sidebar's "Admit
      Cards" now point to the real pages.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] **Verified end-to-end with a real headless-browser run**: created
      an Admit Card under the demo Exam, ran Submit for Review →
      Approve → Publish, confirmed the public page renders the real
      release/exam dates, download link, and instructions, and that it
      appears on the exam page, `/admit-card`, and the homepage.
      Separately confirmed the earlier Result (linked to the seeded
      demo Admit Card) now renders "Related Admit Card" as a real,
      working link instead of Phase 6's preview.

## Phase 8 — Answer Keys ✅ (this delivery)

- [x] `src/lib/services/answerKeys.ts`: admin CRUD, the same shared
      workflow/ownership/versioning/audit modules (third content type
      in a row needing zero changes to any of them), plus public
      `listPublishedAnswerKeys` (paginated) and
      `getPublishedAnswerKeyBySlug`.
- [x] Admin `/admin/answer-keys` (list/new/edit) with `AnswerKeyForm`.
- [x] Public `/answer-key` (paginated) and `/answer-key/[slug]` per
      Section 12: exam/organization, answer key date, question paper
      information (`description`), official answer key link, objection
      information, objection deadline, related result (via the
      schema's real `Result.relatedAnswerKeyId` back-relation), related
      admit card (derived from sharing the same exam — no direct FK
      between AnswerKey and AdmitCard in the schema, same
      central-entity pattern used since Phase 7).
- [x] `AnswerKeyCard` now links to `/answer-key/[slug]` (was a preview
      since Phase 4). Three previews upgraded to real links now that
      the target page exists: the Result page's "Related Answer Key",
      the Admit Card page's "Related Answer Key", and the exam page's
      "Answer Keys" section (all were `UpcomingContentList`, now
      `RelatedContent`). The exam page's "Syllabus" section is the only
      one still a preview — that's Phase 9's job.
- [x] Header/mobile nav "Answer Keys" and the admin sidebar's "Answer
      Keys" now point to the real pages.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] **Verified end-to-end with a real headless-browser run**: created
      an Answer Key under the demo Exam, ran Submit for Review →
      Approve → Publish, confirmed the public page renders the real
      description/dates/objection info/link, that it appears on the
      exam page, `/answer-key`, and the homepage, and that the derived
      "Related Admit Card" correctly links to the Admit Card sharing
      the same exam. Separately confirmed the Admit Card page's
      "Related Answer Key" now renders as a real, working link instead
      of Phase 7's preview.

## Phase 9 — Syllabus ✅ (this delivery)

- [x] `src/lib/services/syllabi.ts`: top-level admin CRUD reuses the same
      shared workflow/ownership/versioning/audit modules unchanged
      (fourth content type in a row). New here: structural mutations
      (`addPaper`/`deletePaper`/`addSubject`/`deleteSubject`/
      `addTopic`/`deleteTopic`) for the nested Paper → Subject → Topic
      tree (Section 13) — each checks the same `canEditContent`
      ownership rule, snapshots the whole tree via `contentVersion` if
      the syllabus is already `PUBLISHED`, and records an `AuditLog`
      entry, so the tree's structure gets the same guarantees as any
      other content field.
- [x] Admin `/admin/syllabi` (list/new/edit). The edit page pairs the
      usual meta form (title/exam/description) with
      `SyllabusTreeEditor` — a **read-only-until-submitted** tree view
      where every add/remove is its own small `<form>` bound to a
      dedicated Server Action (full-page redirect, no client
      JavaScript), consistent with the no-JS-required pattern used
      everywhere else in this admin console rather than reaching for a
      client-side drag-and-drop tree builder.
- [x] Public `/syllabus` (paginated) and `/syllabus/[slug]` rendering
      the structured tree read-only (Section 13: never one text blob).
      An empty tree renders the spec's exact
      "Not specified in the available notification." copy.
- [x] The exam page's "Syllabus" section — the last `UpcomingContentList`
      preview left in the whole site — is now a real `RelatedContent`
      link. Removed `UpcomingContentList` entirely (dead code, no
      remaining callers after this).
- [x] Header/mobile nav and the admin sidebar's "Syllabus" now point to
      the real pages.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] **Verified end-to-end with a real headless-browser run**: created
      a Syllabus under the demo Exam, added a Paper, a Subject under
      it, and a Topic with comma-separated subtopics — each via its own
      no-JS form submission — then ran Submit for Review → Approve →
      Publish. Confirmed the public page renders the full tree
      (paper/subject/topic/subtopics) correctly, and that it appears on
      the exam page and `/syllabus`.

## Phases 10–20

Not started. See `PROJECT_PLAN.md` for the full ordered list
(articles/admissions/scholarships → search → SEO → PDF/document system →
AI extraction pipeline → human verification → notifications → analytics
→ testing/security/performance → production deployment → Android API
readiness).

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
- The Exam/Job workflow (`workflow.ts`) and ownership rules
  (`ownership.ts`) are exercised live as SUPER_ADMIN, which bypasses
  every role restriction. The role-boundary logic itself (AUTHOR can
  only submit/edit their own drafts; REVIEWER can approve/reject but
  not create/edit; only EDITOR/SUPER_ADMIN can publish/archive) is
  implemented and code-reviewed but not yet exercised end-to-end with
  actual AUTHOR/EDITOR/REVIEWER accounts — worth a real multi-account
  pass in Phase 18 (testing) rather than assuming the unit logic is
  sufficient.
- Every exam-scoped content type (Job, Result, AdmitCard, AnswerKey,
  Syllabus) now cross-links on both the exam page and each other's
  detail pages with real `href`s — no `UpcomingContentList` previews
  left anywhere in the site.
- The header/mobile nav's "Articles" link is the last homepage anchor
  (`/#articles`) — swaps for a real index page in Phase 10, mirroring
  Phases 5–9.
