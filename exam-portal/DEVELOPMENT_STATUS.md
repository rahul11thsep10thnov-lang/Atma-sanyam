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

## Phase 10 — Articles / Admissions / Scholarships ✅ (this delivery)

- [x] Three standalone (not exam-scoped) content types, each with a
      service (`admissions.ts`, `scholarships.ts`, `articles.ts`) reusing
      the same shared workflow/ownership/versioning/audit modules
      unchanged, admin CRUD (list/new/edit), and public pages.
- [x] `/admission` + `/admission/[slug]`, `/scholarship` +
      `/scholarship/[slug]`, `/articles` + `/articles/[slug]`.
- [x] Article's `body` is admin-entered plain text/Markdown-ish
      paragraphs (split on blank lines) — no rich-text editor dependency
      added; `authorId` is set to the creating admin automatically, not
      a user-facing field.
- [x] `ArticleCard` now links to `/articles/[slug]` (was a preview since
      Phase 4). Header/mobile nav and admin sidebar's Admissions/
      Scholarships/Articles now point to the real pages — **every nav
      item is now a real page, no homepage anchors left**.
- [x] `npm run typecheck` / `lint` / `build` all pass (35 routes).
- [x] **Verified end-to-end with a real headless-browser run for
      Article** (create → Submit for Review → Approve → Publish →
      confirmed on `/articles/[slug]`, `/articles` index, and
      homepage). Admission and Scholarship follow the byte-for-byte
      identical CRUD/workflow pattern already proven live nine times
      over (Exam, Job, Result, AdmitCard, AnswerKey, Syllabus, and now
      Article) — verified via typecheck/build rather than a repeat
      browser run, to spend the remaining budget on the phases still
      ahead (11–20).

## Phase 11 — Search ✅ (this delivery)

- [x] `src/lib/services/search.ts` rewritten for Section 14: searches
      every content type (Exam, Job, Result, AdmitCard, AnswerKey,
      Syllabus, Article, Organization), filterable by content type,
      organization, category, and state, paginated (15/page). Only
      runs the per-type queries the `type` filter actually needs —
      never scans a table the request doesn't ask about.
- [x] `/search` rebuilt with a real filter form (type/organization/
      category/state selects, still a plain GET form — no client JS)
      and working pagination that preserves the active filters.
- [x] Fixed a real bug found while building this: `Pagination` appended
      `?page=N` unconditionally, which would have produced a malformed
      URL (`?q=x&type=y?page=2`) on any page with its own query string
      — the first page to actually have one. Fixed to use `&` when
      `basePath` already carries a query string.
- [x] `npm run typecheck` / `lint` / `build` all pass.
- [x] Verified live: an unfiltered query returns matches; `type=exam`
      returns only Exam rows (0 Job rows) for the same query; an
      `organizationId` filter correctly narrows to that organization's
      content.

## Phase 12 — SEO ✅ (this delivery)

- [x] `src/lib/siteConfig.ts`: one place for site name/description/URL,
      used by the root layout's default metadata, the sitemap,
      robots.txt, and JSON-LD.
- [x] Root layout: `metadataBase`, a `title.template` (`%s — Exam
      Portal`), default Open Graph and Twitter card metadata. Stripped
      the manual `"— Exam Portal"` suffix from all 23 pages that had
      one, so titles don't double up now that the template adds it —
      verified live (`Latest Government Jobs — Exam Portal`, not
      `... — Exam Portal — Exam Portal`).
- [x] `src/app/sitemap.ts` — dynamically generated from every published
      content type (Section 45: draft/archived content never appears).
      67 URLs live in dev right now, including every test record
      created since Phase 5.
- [x] `src/app/robots.ts` — disallows `/admin` and `/api`, points to the
      sitemap. Verified live.
- [x] JSON-LD structured data (Section 24, only where the content
      genuinely backs the schema): `WebSite` + `SearchAction` site-wide
      on every public page; `BreadcrumbList` built into the
      `Breadcrumbs` component itself (every page using it gets both the
      visual trail and the schema for free); `Article` on
      `/articles/[slug]`; `FAQPage` on `/jobs/[slug]`, only when
      `faqItems.length > 0` — never emitted on a page without real FAQ
      content.
- [x] Homepage got a `canonical` (it had none before).
- [x] `npm run typecheck` / `lint` / `build` all pass (39 routes incl.
      `/sitemap.xml`, `/robots.txt`).
- [x] Verified live: robots.txt content, sitemap URL count/content
      (including dynamic slugs), title-template correctness on a real
      page, all three JSON-LD types present on their respective pages,
      and that `/admin/login` still carries `noindex, nofollow`.

## Phase 13 — PDF/document system ✅

- `Document` model (already in the Phase 2 schema) is now backed by a
  real admin flow: `/admin/documents` lists uploaded documents with
  filters context (type, linked exam/organization), an upload form, and
  per-row verify/unverify + delete controls.
- `src/lib/documents/storage.ts` — a small `DocumentStorage` interface
  with two implementations: `LocalDiskStorage` (writes to
  `public/uploads/documents`, used automatically in dev) and
  `S3CompatibleStorage` (`@aws-sdk/client-s3`, `forcePathStyle: true`,
  works against AWS S3 or any S3-compatible provider — R2, Supabase
  Storage, MinIO, etc.). `getDocumentStorage()` picks the S3 adapter
  only when all 5 `STORAGE_*` env vars are set, and throws at startup
  in production if they're missing rather than silently falling back to
  local disk.
- `src/lib/documents/checksum.ts` — SHA-256 checksum computed on every
  upload and stored on the `Document` row, so a re-uploaded file (or a
  future AI-extraction step in Phase 14) can be checked for integrity.
- `src/lib/services/documents.ts` — validates uploads server-side
  (PDF-only via `ALLOWED_MIME_TYPES`, 20MB `MAX_FILE_SIZE_BYTES`,
  rejects empty files) independent of any client-side `accept`
  attribute, which is only a UX hint. New documents always start
  `UNVERIFIED`; an admin explicitly marks them `VERIFIED` after
  checking the content against the official source — there is no
  auto-verification path.
- Only `EDITOR`/`SUPER_ADMIN` roles can delete a document; any admin who
  can create content can upload one.
- `public/uploads` added to `.gitignore` — it's a dev-only fallback and
  is never meant to be committed; production always uses object
  storage.

### Cross-cutting bug found and fixed while testing this phase

While live-testing the verify/unverify toggle, the UI didn't update
after a click even though the database mutation was correct. Root
cause: a Server Action that calls `redirect()` back to the *exact* URL
the client was already on is treated by Next.js as a no-op client-side
navigation, which reuses the stale pre-mutation RSC payload —
`revalidatePath()` alone does not force a re-fetch in this situation
(confirmed by reproducing with a hard `page.goto()` reload, which *did*
show the correct data, isolating the bug to client-side soft-navigation
caching specifically).

Fix: append a distinguishing/cache-busting query parameter to the
redirect target so Next.js treats it as a real navigation. This was
already the pattern used by every content type's `update`/`transition`
actions (`?saved=1`), but two things were still broken:

- `documents/actions.ts`'s `toggleVerifiedAction` had no distinguishing
  param at all — fixed with `?updated=1`.
- `syllabi/actions.ts`'s six structural actions (`addPaperAction`,
  `deletePaperAction`, `addSubjectAction`, `deleteSubjectAction`,
  `addTopicAction`, `deleteTopicAction`) had no distinguishing param
  either — fixed with a shared `editUrl()` helper using
  `?updated=${Date.now()}`.
- The other 8 content types (`exams`, `jobs`, `results`, `admit-cards`,
  `answer-keys`, `admissions`, `scholarships`, `articles`) used a
  *static* `?saved=1`, which would hit the identical bug on two
  consecutive saves (same URL both times) — bulk-patched to
  `?saved=${Date.now()}` plus an explicit `revalidatePath()` call
  before the redirect, so the fix holds for arbitrarily many saves in a
  row, not just the first one after a cold page load.

Verified live with Playwright after the fix: the document verify
toggle round-trips `VERIFIED ⇄ UNVERIFIED` correctly on a real soft
navigation (no hard reload needed), and the syllabus "Add paper" form
correctly shows the new paper immediately after submit. `npm run
typecheck`, `npm run lint`, and `npm run build` all pass clean across
all 10 touched action files.

## Phase 14 — AI extraction pipeline ✅

- `src/lib/ai/provider.ts` — an `AIExtractionProvider` interface
  (`modelName`, `extractFields(input)`) so the concrete model is
  swappable without touching the pipeline. This environment has no AI
  API key configured, so the only implementation wired up is
  `MockAIExtractionProvider`, a deterministic stub that returns a
  canned, clearly-labeled field set per `DocumentType` (values like
  `"(mock) Extracted job title — review against source"`, several
  fields marked `isUncertain: true`). `getAIProvider()` reads
  `AI_EXTRACTION_PROVIDER` (default `"mock"`) and throws a clear
  `AIProviderNotConfiguredError` for anything else — it never silently
  falls back, so a deployer who sets a value expecting a real model
  gets an explicit error instead of mock data in production.
- `src/lib/services/extraction.ts` — `startExtractionJob(documentId,
  adminId)` creates an `ExtractionJob` (attempt = previous max + 1, so
  retries never collide with the `(documentId, attempt)` unique
  constraint), calls the provider, and persists one `ExtractionResult`
  row per field. A per-document-type required-field check (currently
  just `title`) lands the job on `VALIDATION_FAILED` with a message
  naming the missing field(s) if extraction came back too thin,
  `READY_FOR_REVIEW` otherwise, or `FAILED` with the error message if
  the provider itself threw. AI output only ever reaches
  `ExtractionResult` rows — nothing in this phase writes to a published
  content table; that requires the human approval step Phase 15 adds.
- Admin UI: `/admin/documents` gained an "Extraction" column showing
  the latest job's status and attempt number (or "Not run"), and a "Run
  extraction" button per row. Clicking it links through to
  `/admin/documents/extraction/[jobId]`, a read-only table of every
  extracted field with its value, confidence, source page, and an
  "Uncertain" flag — plus a standing banner clarifying this data hasn't
  been reviewed by a human and is never auto-published. Field-level
  accept/edit/reject actions are Phase 15's job, not this one.

Verified live: ran extraction on a real uploaded `JOB_NOTIFICATION`
document twice in a row — first run created attempt #1
(`READY_FOR_REVIEW`), second run created attempt #2 without touching
attempt #1, confirming the idempotency-by-attempt design actually
works end to end rather than just typechecking. `npm run typecheck`,
`npm run lint`, and `npm run build` all pass clean.

### Known limitation, called out honestly rather than hidden

The mock provider always populates `title`, so the
`VALIDATION_FAILED` path (required field missing) is implemented and
typechecked but not yet exercised by a live click — only unit-level
reasoning backs it. It will get real exercise once a non-mock provider
(or a mock configured to sometimes omit fields) exists.

## Phase 15 — Human verification workflow ✅

- `src/lib/services/extractionReview.ts` — field-level review
  (`acceptField`, `editField`, `rejectField`) and job-level review
  (`approveExtractionJob`, `rejectExtractionJob`). Every field decision
  is recorded as a new `FieldOverride` row rather than an in-place
  edit (Section 17: human-approved data always wins, and both the AI's
  original value and the human's decision stay auditable side by
  side). `approveExtractionJob` refuses to run unless every extracted
  field already has at least one override — an extraction can't be
  rubber-stamped approved without a human having looked at each field.
  `rejectExtractionJob` has no such requirement, since an obviously
  bad extraction (wrong document, garbled OCR) shouldn't need a
  field-by-field teardown to throw out. Only `REVIEWER`/`EDITOR`/
  `SUPER_ADMIN` roles may call any of these — `AUTHOR` can upload
  documents and trigger extraction but not review or approve them,
  mirroring the same separation Section 16 already establishes for
  content publishing.
- Admin UI: `/admin/documents/extraction/[jobId]` (previously
  read-only from Phase 14) is now the review screen — original PDF in
  an iframe on the left, extracted fields with Accept/Save
  edit/Reject controls on the right, and job-level Approve/Reject
  buttons at the bottom (Approve disabled until every field has a
  decision). A standing banner reiterates that none of this touches
  published content automatically.
- `ExtractionJob.status` moves `READY_FOR_REVIEW → UNDER_REVIEW`
  automatically on the first field decision, then `→ APPROVED` or
  `→ REJECTED` via the job-level actions — both role- and
  status-gated server-side, not just hidden in the UI.

### Bug found and fixed while live-testing this phase

The UI's "decision" label (Reviewed vs. Rejected) was initially
derived from whether `FieldOverride.humanValue` was `null`. That's
ambiguous: accepting a field whose AI value was itself `null` (the
extraction found nothing) also produces a `null` `humanValue`, so an
*accepted* empty field displayed as "Rejected". Fixed by recording the
decision as an explicit prefix on `reason` (`ACCEPTED: …` /
`EDITED: …` / `REJECTED: …`) instead of inferring it from the value,
and reading that prefix in the UI. Caught by live-testing rather than
by typechecking, since both code paths were type-correct — a reminder
that "compiles" and "does what the label says" are different claims.

Verified live end to end: accepted one field, rejected another with a
typed reason, confirmed "Approve job" stayed disabled until the third
field was also reviewed, then confirmed it enabled and the job
transitioned to `APPROVED`. Separately verified rejecting a whole job
before any field review works and immediately removes the review
controls. `npm run typecheck`, `npm run lint`, and `npm run build` all
pass clean.

### Known follow-up

Like the rest of the role/ownership logic in this codebase (see the
Phase 12 follow-up above), the `REVIEWER`/`EDITOR`/`SUPER_ADMIN`-only
gate on review actions is implemented and code-reviewed but has only
been exercised live as `SUPER_ADMIN`, which passes every check
trivially. Worth including in the same real multi-account pass planned
for Phase 18.

## Phase 16 — Notifications ✅

- `src/lib/notifications/dispatcher.ts` — a `ChannelDispatcher`
  interface, one implementation per channel. `WebsiteDispatcher`
  always succeeds immediately (the website feed IS the `Notification`
  row — there's nothing external to call). `UnconfiguredDispatcher`
  covers EMAIL/PUSH/TELEGRAM/WHATSAPP/ANDROID, all of which need a
  real provider (SMTP creds, an FCM/APNs key, a bot token) this
  environment doesn't have — rather than silently no-op or fake
  success, every delivery on these channels is recorded `FAILED` with
  an honest "channel not configured" reason, so the fan-out table
  never claims something went out that didn't.
- `src/lib/services/notifications.ts` — `dispatchNotification(...)`
  creates one `Notification` row and fans it out to all 6 channels via
  `NotificationDelivery` rows in parallel. `listNotificationsForAdmin`
  and `listWebsiteNotifications` (public feed query, unused by a page
  yet — public consumption is a future phase) round out the service.
- Wired into the `PUBLISH` transition of all four content types that
  have a matching `NotificationType` (Job → `NEW_JOB`, Result →
  `NEW_RESULT`, AdmitCard → `NEW_ADMIT_CARD`, AnswerKey →
  `NEW_ANSWER_KEY`). Syllabus/Admission/Scholarship/Article have no
  matching enum value and are deliberately left unwired rather than
  forced into a semantically-wrong type — extending
  `NotificationType` is a schema change for a future phase if desired.
  A notification fires only on `nextStatus === "PUBLISHED" &&
  !existing.publishedAt` — the same "genuinely first publish" signal
  the codebase already uses to decide whether to stamp `publishedAt`
  — so a republish after archive never re-notifies.
- Admin UI: `/admin/notifications` lists every notification with a
  colored badge per channel (green = sent, red = failed, with the
  failure reason as a tooltip).

### Bug found and fixed while live-testing this phase

The first implementation gated the notification on `existing.status
!== "PUBLISHED"`, which is true on *every* transition into published,
including a republish after `ARCHIVE → REOPEN_AS_DRAFT → PUBLISH`. The
comment above the code already said "never on a republish" — the
implementation just didn't match its own stated intent. Caught by
deliberately live-testing the republish path (not just the first
publish), not by typechecking. Fixed by switching the guard to
`!existing.publishedAt`, confirmed live: published a job (1
notification), then archived → reopened as draft → published it again
— still exactly 1 notification row for that job afterward.

## Phase 17 — Analytics ✅

- New `ContentViewEvent` model (migration
  `20260929133927_analytics_content_view_events`): `contentType`,
  `contentId`, `path`, `referrerHost?`, `createdAt`. Deliberately
  minimal — no IP address, no user agent, no cookie/session id, and
  only a referrer *hostname* rather than the full referring URL (which
  can carry query strings/PII). Enough to rank popular content, not
  enough to reconstruct who looked at it.
- `src/lib/analytics/track.ts` — `recordView(contentType, contentId,
  path)`, called directly from a public detail page's Server Component
  render (not client JS), so it also captures visitors with JavaScript
  disabled and never adds a network round trip. Wrapped in try/catch
  that only logs — an analytics write failure can never break a page
  that would otherwise render fine.
- Wired into all 9 public content detail pages: Job, Result, AdmitCard,
  AnswerKey, Syllabus, Admission, Scholarship, Article, Exam. The
  taxonomy pages (Category/State/Organization) are deliberately left
  unwired for now — lower value, easy to add later the same way.
- `src/lib/services/analytics.ts` — `getAnalyticsSummary()` returns
  total views, views in the last 30 days, a breakdown by content type,
  and the top 10 most-viewed items. Admin UI at `/admin/analytics`
  displays all of it.

Verified live: visited a job detail page with a Google referrer header,
confirmed the `content_view_events` row recorded `contentType: "Job"`,
the correct `contentId`, and `referrerHost: "www.google.com"` — not the
full referring URL. Visited a result page too, then confirmed
`/admin/analytics` showed "2" total views split correctly across "Job"
and "Result". `npm run typecheck`, `npm run lint`, and `npm run build`
all pass clean.

### Bug found and fixed while live-testing this phase (infra, not logic)

The first live test silently recorded nothing, even though the code
was correct. Cause: `npx prisma migrate dev` and `npx prisma generate`
ran *after* the dev server had already started, so the already-running
process still held the pre-migration generated Prisma client in memory
— `prisma.contentViewEvent` was `undefined` at runtime despite
typechecking fine (the on-disk generated types were current; the
in-memory module wasn't). Restarting the dev server picked up the
regenerated client and the pipeline worked immediately. Noted here
because it's a real gotcha for this workflow: any schema migration run
against a long-lived `npm run dev` process needs a restart, not just a
`prisma generate`.

## Phase 18 — Testing / security / performance hardening ✅

### Testing

- Added Vitest (`npm run test`) with 4 test files, 28 tests, covering
  the pure-logic modules most worth locking down: `workflow.ts`
  (every content-status transition rule and its role gating —
  including the specific cases already relied on elsewhere, like
  EDITOR publishing straight from DRAFT without a reviewer step),
  `ownership.ts` (AUTHOR can only edit their own DRAFT, EDITOR/
  SUPER_ADMIN can edit anything, REVIEWER can edit nothing directly),
  `slug.ts` (`slugify` edge cases, `uniqueSlug`'s `-2`/`-3`/…
  collision handling), and the mock AI provider (field sets are
  scoped per document type, every type includes a non-null `title` —
  the same assumption `extraction.ts`'s `REQUIRED_FIELDS` check
  depends on).
- Deliberately scoped to pure/synchronous logic rather than DB-coupled
  services — testing `transitionJobStatus` etc. end-to-end would need
  a real Postgres instance wired into CI, which is a bigger investment
  than this phase covers. Noted as a known follow-up below rather than
  silently skipped.

### Security

- `next.config.ts` gained the same security header baseline as
  `../admin/next.config.ts` (`X-Frame-Options: DENY`, a CSP with
  `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: same-origin`, a restrictive `Permissions-Policy`,
  HSTS), applied to every route — public and admin alike — plus
  `X-Robots-Tag: noindex, nofollow` on `/admin/*` only, as defense in
  depth on top of `robots.txt` (which already disallows `/admin`).
  Verified live with `curl -I` against both a public page and
  `/admin/login`: the shared headers appear on both, `X-Robots-Tag`
  only on the admin one.
- **Found and fixed a real stored-XSS vector**: `JsonLd.tsx` injected
  `JSON.stringify(data)` into a `<script>` tag unescaped. `data` comes
  from the database, not a request body, but those database fields
  (job titles, descriptions) are admin-entered free text rendered on
  *every public visitor's* page — a title containing
  `</script><script>...</script>` would have broken out of the tag
  and executed as a stored XSS against the whole site, not just
  whoever entered it. Fixed by escaping `<` to `<` before
  injection (the standard mitigation for this exact pattern — `<`
  never needs to appear unescaped in a script body, so the JSON's
  meaning is unaffected). Verified: the escaped output no longer
  contains a literal `</script>`, and still round-trips through
  `JSON.parse` to the original string.
- Reviewed and found already solid, no changes needed: password
  hashing (bcrypt, cost 12), login timing-safe against email
  enumeration (`burnPasswordCheck` runs a real bcrypt comparison even
  for unknown emails), account lockout (Phase 3), file upload
  filename sanitization (storage keys strip everything outside
  `[a-zA-Z0-9._-]`, so no path traversal via a crafted filename), and
  no other `dangerouslySetInnerHTML` usage in the codebase.

### Performance

No changes needed yet — every public listing page already paginates
(Phase 11), and Next.js's own static/dynamic route split (visible in
every phase's build output) already separates what can be prerendered
from what can't. Revisit once there's real production traffic data to
act on rather than guessing.

### Known follow-ups

- DB-coupled service integration tests (running the actual Prisma
  queries against a real Postgres instance) aren't set up yet — would
  need a test database wired into whatever CI this repo eventually
  runs.
- Still no per-IP rate limiting beyond the existing per-account
  lockout (noted since Phase 3/12) — revisit if abuse patterns
  actually show up.
- The role-boundary tests added this phase (`ownership.test.ts`,
  `workflow.test.ts`) exercise the *rules* directly and don't need a
  live multi-account pass to be trustworthy — but the live admin UI
  itself (Server Actions calling these rules) is still only ever
  exercised live as `SUPER_ADMIN`, per the Phase 12/15 follow-ups.

## Phase 19 — Production deployment ✅

- `DEPLOYMENT.md` — step-by-step: provision Postgres, provision
  S3-compatible object storage, set environment variables, run `npm
  run db:migrate:deploy` (not `db:migrate`, which is dev-only and
  interactive), build/start, bootstrap the first `SUPER_ADMIN` via
  `npm run seed:admin`. Includes a Vercel-specific section (the
  recommended host, matching the original spec) covering per-
  environment variable scoping and running migrations as a deploy
  step rather than from inside the running app.
- `ENVIRONMENT_VARIABLES.md` — every variable actually read by the
  app, cross-checked against the code that reads it (not aspirational
  documentation), split into required-everywhere,
  required-in-production-only, optional, and "reserved but nothing
  reads it yet" (the EMAIL/PUSH/TELEGRAM/WHATSAPP/ANDROID
  notification channels).
- **Fixed `.env.example` to match reality while writing this**: it
  previously listed `AI_PROVIDER_API_KEY` (the actual code reads
  `AI_EXTRACTION_PROVIDER`, a provider *name*, not an API key — no
  API key exists to read because only the mock provider is
  implemented) and `EMAIL_FROM`/`RESEND_API_KEY`/
  `ANALYTICS_WRITE_KEY` (none of which any code in this app reads —
  analytics is first-party, not a third-party service, and no email
  provider is wired up). These were placeholders written speculatively
  in an earlier phase, before Phase 14/16/17 landed and settled on
  what was actually built; leaving them unfixed would have quietly
  misled a deployer into thinking they needed to set variables that do
  nothing.
- **Also found while committing this phase's docs**: `.env.example`
  had never actually been committed at all, in any earlier phase — the
  `.gitignore`'s blanket `.env*` pattern silently matched it too, so
  it only ever existed as a local, untracked file in this environment.
  A fresh clone of the repo would have had no `.env.example` despite
  every phase since Phase 3 writing code and docs that assume it
  exists ("copy `.env.example` to `.env`"). Fixed with a `!.env.example`
  negation in `.gitignore` and committing it for the first time here.

## Phase 20 — Android API readiness ✅

- `src/lib/api/respond.ts` — a shared JSON envelope
  (`{ data, page, pageSize, total, totalPages }` for lists, `{ data }`/
  `{ error }` + 404 for detail lookups) so a mobile client sees one
  consistent shape across every content type, instead of a different
  one per route just because the underlying admin service happened to
  name its return key `jobs` vs `items` vs `results`.
- 17 new public, read-only route handlers, all calling the exact same
  service functions the public website pages already use (no parallel
  business logic to keep in sync): list + detail for Job, Result,
  AdmitCard, AnswerKey, Syllabus, Admission, and Scholarship; a
  not-yet-paginated list (mirrors the public `/articles` page, which
  also isn't paginated yet) + detail for Article; detail-only for Exam
  (there's no public exam index to mirror either); plus
  `GET /api/search` (same filters as the public search page, with a
  400 for a too-short query instead of silently returning nothing) and
  `GET /api/notifications` (the public feed Phase 16 built but never
  wired to a page — this is its first real consumer).
- Every detail route also calls `recordView()` (Phase 17's analytics),
  so API traffic from a future Android app counts the same as a
  browser visiting the page — not a second, uncounted surface.

Verified live against the running dev server: list endpoints return
correctly paginated, consistently-shaped JSON; a nonexistent slug
returns a real `404` with a JSON error body, not a crash; an
out-of-range `?page=` returns an empty `data` array rather than an
error; `?q=a` (too short) returns a `400`; a detail hit recorded a
`content_view_events` row with the API's own path, same as a page
view. `npm run typecheck`, `npm run lint`, `npm run test`, and `npm
run build` all pass clean.

## Branding & layout update — SarkariChayan ✅

Post-Phase-20 rebrand and header redesign, per the project owner's
spec:

- Site name is now **SarkariChayan** (`SITE_NAME` in
  `src/lib/siteConfig.ts` — one constant drives the header wordmark,
  `<title>` template, OpenGraph, JSON-LD, footer and admin titles). The
  wordmark is 26px, 6pt (8px) up from the previous 18px.
- Fonts via `next/font/google` in `src/app/layout.tsx`: **Josefin
  Sans** for every heading (`h1`–`h6`, public and admin), **Nunito** for
  all body/content text (wired to Tailwind's `--font-sans`), **Tillana**
  for the Sanskrit shloka and **Kalam** for its Hindi explanation. The
  Devanagari faces load the `devanagari` subset explicitly.
- Every heading renders in a `#25D482 → #FF6A5A` gradient
  (`--heading-gradient`, unlayered `h1–h6` rule in `globals.css` so it
  overrides existing `text-slate-*` utilities without touching 60+
  files).
- The old Jobs/Results/… tab bar is gone (`MobileNav.tsx` and
  `navLinks.ts` deleted). In its place, site-wide under the header:
  `MottoBand` (shloka left, Hindi right) and `CtaTabs` — six animated
  gradient tabs (Jobs, Results, Admit Cards, Answer Keys, Syllabus,
  Admissions) using the owner's `.cta-button` CSS verbatim, plus a
  `prefers-reduced-motion` guard. Scholarships and Articles, which the
  tab spec omits, stay reachable from the footer nav so nothing is
  orphaned.
- `BackgroundWatermark` (rendered once in the root layout): a fixed,
  `pointer-events: none`, `aria-hidden` artwork layer + a translucent
  white wash, with page content lifted to `z-index: 1`. Everything is a
  `:root` variable in `globals.css`: `--watermark-image`
  (`/watermark.webp`), `--watermark-size`, `--watermark-opacity` (0.08
  desktop / 0.06 tablet / 0.05 mobile) and `--watermark-overlay`.
  **The artwork file itself was not supplied** — drop it at
  `public/watermark.webp` and it appears; until then the layer is
  simply blank.

Verified live with Playwright at 1280px and 390px: all four fonts
report `loaded`, headings/wordmark use Josefin Sans + the gradient, body
is Nunito, `p[lang=sa]` is Tillana, `p[lang=hi]` is Kalam, six
`.cta-button` links animate (`ctaGradient`), no `header nav` remains,
both watermark layers are click-through, and there is no horizontal
overflow at either width. `typecheck`, `lint`, `test` and `build` all
pass.

Readability note for the owner: the CTA label gradient (green→coral) is
exactly as specified, but the coral end has low contrast against the
orange stretch of the animated button background. A `drop-shadow`
helps; switching `.cta-button > span` to white text is a one-line
change if preferred.

## Automation pipeline — Phase 1: Schema ✅

See `AUTOMATION_ASSESSMENT.md` for the inspection (A–H) that preceded
this. Migration `20261002143901_automation_pipeline_core`:

- **`Recruitment` is now the central object** (Organization → Recruitment
  → notices), with `RecruitmentCategory` as a many-to-many so a drive can
  be Police + State Government + 10+2 at once. `Job`, `Result`,
  `AdmitCard`, `AnswerKey` gained an optional `recruitmentId`.
- **`RecruitmentNotice`** — one government notice (JOB / ADMIT_CARD /
  EXAM_DATE / ANSWER_KEY / RESULT / MERIT_LIST / SELECTION_LIST /
  INTERVIEW / DOCUMENT_VERIFICATION / CORRIGENDUM / DEADLINE_EXTENSION /
  EXAM_POSTPONED / EXAM_CANCELLED / OTHER) with status, priority,
  source/canonical URL, structured `extracted` JSON, per-field
  confidence, validation errors, change summary, duplicate-of link, and
  a pointer to the content row it publishes to. Named this rather than
  "Notification" so the Phase 16 outbound-alert model keeps its name.
- **Entity resolution tables**: `OrganizationAlias`, `ExamAlias`
  (`normalized` = lowercase alphanumerics, unique). `Organization` gained
  `shortName`, `organizationType`, `state`, `parent`, `isAutoCreated`;
  `Category`/`Exam` gained `isAutoCreated`.
- **Pipeline tables**: `Source` (type, priority, check frequency,
  ETag/Last-Modified/content-hash for cheap re-checks, health counters),
  `SourceCheck`, `PipelineRun` (per-run counters), `PipelineError`
  (dead-letter queue with `retryCount`/`nextRetryAt`),
  `DocumentVersion` (a changed hash adds a version, never overwrites).
- `Document` gained pipeline provenance (`sourceId`, `mimeType`,
  `fileSize`, `pageCount`, `extractedText`, `ocrUsed`); `uploadedBy` is
  now optional for pipeline-fetched files. `AuditLog.adminUserId` is
  optional with a new `actor` column (`recordAuditLog` defaults it to
  `"admin"` or `"pipeline"`), so "Approved by: AUTO" is a real row.
  `Notification` (alerts) gained `priority` and a `recruitmentNoticeId`.
- **Backfill in the same migration, idempotent**: one `Recruitment` per
  existing `Exam` (carrying its dates/status), existing Jobs/Results/
  AdmitCards/AnswerKeys pointed at it, the exam's category as the
  primary `RecruitmentCategory`, and one alias per existing
  organization/exam name. Verified on the dev DB: 2 exams → 2
  recruitments, 2/2 jobs linked, aliases and categories populated.
  Nothing existing was altered or duplicated; every manual admin form
  still works unchanged.

`typecheck`, `lint`, `test` pass.

## Automation pipeline — Phase 2: Source management ✅

- `src/lib/validation/source.ts` — Zod schema for a watched source
  (name, listing URL, optional organization, official domain derived
  from the URL when blank, type HTML/PDF/RSS/API/SITEMAP/JSON/XML,
  priority HIGH/NORMAL/LOW with spec-default intervals 30 / 360 / 1440
  min, custom `checkFrequencyMinutes` 5–10080, parser hint, active).
- `src/lib/services/sources.ts` — CRUD with audit logging, plus
  `sourceHealth()` derived (never stored) from the check timestamps:
  `never` / `healthy` / `stale` (no success within 3 intervals) /
  `failing` (last check errored). Deleting a source detaches its
  documents/notices/errors rather than cascading them away.
- Admin UI at `/admin/automation/sources` (list with health badge, last
  checked/success, discovered + failure counters, enable/disable/delete
  per row), `/new` and `/[id]/edit` (form + the last 10 `SourceCheck`
  rows). Gated to `SUPER_ADMIN`/`EDITOR` on both the page and the Server
  Action (spec §31). Sidebar link added.
- `npm run seed:sources` — an **optional** starter list of five official
  national boards (SSC, UPSC, IBPS, RRB Chandigarh, UPPRPB). Pure data,
  upserted by URL, meant to be verified with "Check now" (Phase 3) and
  edited freely — the pipeline is not limited to these.
- "Check now" / "Test source" buttons land with the fetcher in Phase 3
  so they call real code rather than a stub.

Verified live (Playwright, after a dev-server restart — the running
process still had the pre-migration Prisma client, which made the
login's audit-log write fail with a 401 until restarted; same gotcha as
Phase 17): sidebar link present; 5 seeded rows with health `never`;
creating a source redirects to its edit page with "Saved." and the
domain derived from the URL; a duplicate listing URL returns an inline
error (checked by Prisma code `P2002`); disable flips the row to
"disabled"/"Enable"; delete removes it and shows the banner.
`typecheck` and `lint` pass.

## Automation pipeline — Phase 3: Fetcher, parsers, change detection ✅

`src/lib/pipeline/` — the ingestion engine, runnable both inside Next.js
and under plain Node (worker, scripts, tests). To make that possible the
Prisma client moved to `src/lib/db/prisma.ts` (unguarded) with
`src/lib/db/client.ts` re-exporting it behind `server-only` for app code;
`storage.ts`/`checksum.ts` dropped the marker for the same reason.

- `http.ts` — `fetchUrl()`: truthful `User-Agent`, 20 s timeout, retries
  with exponential backoff on network errors/429/5xx (never on 404), 25 MB
  cap, conditional requests (`If-None-Match`/`If-Modified-Since` → 304
  handled as not-modified), and a process-wide per-host minimum interval
  so no site is hammered. `fetchImpl`/`sleep` injectable for tests.
- `robots.ts` — robots.txt parsed per origin (cached 6 h), our token's
  group over `*`, longest-match Allow/Disallow with `*`/`$`. Applied to
  the listing **and to every document link** before fetching.
- `parsers/html.ts` — candidate links = every PDF + any link whose
  text/URL carries a recruitment keyword, scoped by an optional CSS hint
  (`Source.parserType`), relative URLs resolved, duplicates dropped, a
  date picked up from the surrounding row/list item (dd-mm-yyyy,
  dd/mm/yyyy, "15 Jan 2027", ISO). `parsers/feed.ts` — RSS 2.0, Atom,
  sitemap. `parsers/pdf.ts` — pdf.js text per page (page breaks kept for
  provenance) + `looksScanned()`.
- `ocr.ts` — `OcrEngine` interface; tesseract.js (eng+hin) behind
  `OCR_ENABLED=true` for **image** notices. Scanned **PDFs** need a page
  rasteriser this project doesn't ship, so they're recorded as an
  `OCR`-type `PipelineError` ("needs rasteriser") rather than silently
  treated as empty text.
- `changeDetection.ts` — line-level diff + OLD→NEW pairing
  ("Last date: 10-01-2027" → "20-01-2027"), and Dice bigram similarity
  (reused by dedup in Phase 6).
- `ingest.ts` — fetch → store original bytes untouched → extract text →
  `Document` + `DocumentVersion`. Same hash = no-op; different hash =
  new version with a diff, never an overwrite. Pipeline-fetched docs
  have `uploadedBy = null` and a cheap keyword `documentType`.
- `sourceCheck.ts` — robots → conditional fetch → content-hash check →
  parse by source type (HTML/RSS/SITEMAP/PDF; API/JSON/XML record an
  honest "parser not implemented" error instead of guessing) → ingest
  unseen links (capped per check) → re-fetch known links only when the
  listing changed → `SourceCheck` row + source counters. A per-source or
  per-document failure becomes a retryable `PipelineError`
  (15 min → 30 → 1 h … 24 h cap), never a crashed run. `dryRun` mode
  parses without storing.
- Admin: "Check now" (real, forces a full pass) and "Test source" (dry
  run page listing candidates, HTTP status, robots status) on the source
  edit page.

Tests (`npm run test`, 63 passing): HTML/feed/sitemap parsing, Indian
date formats, pdf.js extraction on a generated PDF + scanned detection,
robots precedence/wildcards/fallback, diff pairing, fetch retry/304/
conditional headers/size cap, and a **loopback integration test**
(`sourceCheck.integration.test.ts`, skipped without `DATABASE_URL`) that
runs a real HTTP server + the real DB through: first check ingests two
PDFs with extracted text and correct types while a robots-blocked link
is never requested; second check is a 304 no-op with no document
re-fetches; a changed PDF yields version 2 with the exact
`10-01-2027 → 20-01-2027` diff; dry run stores nothing; a dead listing
produces a failing source + retryable error, not a crash.

Live (Playwright against a loopback "UPPRPB" fixture, since real
government sites are unreachable from this sandbox): created the source
in the admin UI with a `table.notices` hint → Test source showed
`ok / 200 / robots.txt applied / 2 candidates` (the "About" link
filtered) → Check now ingested 2 docs (check row ok/200/changed/2/2) →
second Check now found 0 new → Documents page listed both PDFs as JOB
NOTIFICATION and ADMIT CARD → Sources list showed `healthy`, 2
discovered. Build passes with `pdfjs-dist`/`tesseract.js`/`cheerio` as
server externals.

Bugs caught by the tests before any commit: pdf.js v6 has no
`PDFDocumentProxy.destroy()` (every PDF ingest threw until switched to
`loadingTask.destroy()`), and cheerio's `.text()` glues adjacent table
cells ("12-01-2027Notification"), defeating the date regex's word
boundary until element text was space-joined.

## Automation pipeline — Phase 4: AI extraction with provenance ✅

`src/lib/pipeline/extract/` turns a document's text into the structured
notice JSON the spec asks for (§8/§9), field by field with provenance,
and `src/lib/pipeline/notices.ts` persists it as a `RecruitmentNotice`.
Every source check now ends with a notice per ingested document.

- `schema.ts` — the Zod schema for the extraction (`notice_type`,
  organization, exam, posts, department, advertisement number, vacancies,
  application/exam/admit-card/result dates as ISO, eligibility, salary,
  fee, selection process, official URLs, important dates, reservation,
  physical requirements, language, summary). `FieldProvenance` records,
  per field, the confidence, the source line, the **page number**, which
  extractor produced it and whether it was verified against the text.
- `rules.ts` — deterministic extractor that always runs: notice-type
  rules ordered most-specific first (deadline extension / corrigendum /
  postponed … before the generic JOB), header-line organization/exam/
  department detection, advertisement number, vacancies, labelled dates
  (incl. the *new* date of an extension — "extended from X **to Y**"),
  fee, age range, salary, education keywords, selection stages in
  document order, apply/notification URLs, Devanagari-ratio language
  detection, and a weighted overall score. Nothing is ever filled from
  what is "typical" for an organization: unstated → `null`.
- `claude.ts` — the Claude stage (official `@anthropic-ai/sdk`,
  `messages.parse` with a strict Zod output format, cached system prompt,
  `claude-opus-5-5` by default, effort configurable). **Hallucination
  guard (§38):** the model must quote verbatim evidence for every
  non-null field; each quote is searched in the document, and a field
  whose quote is not found is marked unverified with its confidence
  capped at 0.4, so an invented value can never reach auto-publish.
  Only consulted when `ANTHROPIC_API_KEY` is set *and* the rules are not
  confident (cost control, §36); refusals/parse failures/API errors
  degrade to rules-only instead of failing the ingest.
- `index.ts` — `extractNotice()` (staged run + field-wise merge:
  verified Claude > rules > unverified Claude), `validateExtraction()`
  (start after end, exam before closing, non-positive vacancies, min age
  above max, closing date a year before publication, unknown type,
  missing organization) and `decideStatus()`: `confidence × source
  authority` (1.0 for the organization's own `.gov.in`/official domain,
  0.85 otherwise) ≥ 0.95 with no validation errors and no unverified
  field → `AUTO_APPROVED`; ≥ 0.80 → `NEEDS_REVIEW`; else `NEW`.
  Thresholds are env-tunable (`AUTO_PUBLISH_MIN_CONFIDENCE`,
  `REVIEW_MIN_CONFIDENCE`, `CLAUDE_TRIGGER_CONFIDENCE`).
- `notices.ts` — `createNoticeFromIngest()`: one `RecruitmentNotice` per
  document with `extracted`, `fieldConfidence`, `validationErrors`,
  `overallConfidence`, type, priority (URGENT for extensions/
  postponements/cancellations/corrigenda, HIGH for admit cards/exam
  dates/interviews or a deadline inside a week), source URL/domain, the
  document + version it came from, and a pipeline audit-log row. A
  **changed document updates the same notice** (new `documentVersionId`,
  `changeSummary` with the version diff) instead of creating a second
  one; a notice that was already approved/published drops back to
  `NEEDS_REVIEW` when its document changes. Empty text (scanned PDF
  without OCR) is an `EXTRACTION` pipeline error, never a blank notice.
- `sourceCheck.ts` runs extraction after each new/changed ingest; an
  extraction failure is a recorded, retryable error and never aborts the
  source check. `CheckResult.notices` reports what was created/updated.
- `auditLog.ts` now imports the unguarded Prisma client so the pipeline
  can write audit rows from the worker/tests too.
- `.env.example` / `ENVIRONMENT_VARIABLES.md` document `ANTHROPIC_API_KEY`,
  `AI_EXTRACTION_MODEL`, `AI_EXTRACTION_EFFORT`, the three thresholds and
  `OCR_ENABLED`.

Tests (`npm run test`, 75 passing): `rules.test.ts` runs five realistic
notice texts (UPPRPB constable advertisement, SSC CGL notice, admit card,
deadline-extension corrigendum, RRB result) and checks every extracted
fact, provenance line/page, `null` for unstated dates, the extension's
*new* date, the validation and status matrix, and the Claude evidence
path with an injected parse function: a verified quote scores 0.9 and
wins the merge, a hallucinated `exam_date` whose quote is not in the
text is kept only as a flagged, unverified field. The loopback
integration test now also asserts that the first check creates a `JOB`
notice (vacancies 60244, closing date 2027-01-10, organization line,
verified provenance, pipeline audit row) plus a HIGH-priority
`ADMIT_CARD` notice, and that the changed PDF **updates** that one notice
(version 2, `changeSummary` diff, closing date 2027-01-20) rather than
adding a duplicate.

Failures the tests caught before commit: concatenating an alternation
regex with the date suffix only applied the suffix to the last
alternative (every labelled date silently came back `null`), the
deadline-extension rule picked the *old* date, the fee rule missed
"Fee payable: Rs. 100/-", and the department rule was case-sensitive.

## Automation pipeline — Phase 5: Organization / category / exam / recruitment resolution ✅

`src/lib/pipeline/resolve/` maps the free-text names an extractor
produced onto canonical rows, and `createNoticeFromIngest()` now links
every notice to its organization, exam and — the central object —
**recruitment** before it is stored.

- `names.ts` — pure helpers: `normalizeName()` (same key the Phase 1
  alias backfill used, so "S.S.C." = "SSC"), `nameMatchScore()` (the
  better of bigram similarity and stop-word-free token containment, so
  "Constable 2027" matches "Constable Recruitment 2027" while "SSC CGL"
  does not match "SSC CHSL"), `acronymOf()` ("Uttar Pradesh Police
  Recruitment and Promotion Board" → UPPRPB), `yearOf()`, `stripYear()`,
  `canonicalCase()` (title-cases shouted header lines but keeps UP/SSC/
  RRB…), `inferOrganizationType()` (CENTRAL/STATE/PSU/UNIVERSITY/COURT/
  DEFENCE/MUNICIPAL/…) and keyword rules for the seeded categories
  (UPSC, SSC, Railway, Banking, Defence, Police, Teaching, State PSC;
  anything else → an auto-created "Other Government Jobs").
- `index.ts` — `resolveOrganization()` in trust order: links an earlier
  version already had → the organization an admin pinned on the source →
  alias table (normalised) → organization name/short name → fuzzy ≥ 0.92
  over names + aliases → *same-source* fallback (a notice with no
  organization line, e.g. an admit card, goes to the organization the
  same source has been feeding) → create, flagged `isAutoCreated`, with
  inferred type, state (from the name), website (from the source domain)
  and two aliases (the raw line and the acronym). Every successful match
  also records the raw spelling as an alias, so the next notice matches
  exactly. `resolveCategories()`, `resolveExam()` (alias → exact → fuzzy
  ≥ 0.85 within the organization → create as a DRAFT exam, year stripped
  from the title, `createdBy = "pipeline"`), `resolveRecruitment()`
  (same exam + year, or title ≥ 0.85 within the organization and the same
  year → reuse and **update its dates from the notice** — a JOB sets the
  application window, a DEADLINE_EXTENSION moves the closing date, an
  ADMIT_CARD/EXAM_DATE sets the exam date — else create with the
  categories attached, primary first). Each entity link records its
  method (`source` / `alias` / `exact` / `fuzzy` / `same-source` /
  `created`) and confidence; the notice stores that under
  `fieldConfidence.__resolution`.
- Confidence engine: a notice that **created** any entity can never be
  `AUTO_APPROVED` (`decideStatus({ entitiesCreated })`) — a human
  confirms the new organization/recruitment first. An unresolvable
  organization is a validation error and a `RESOLUTION` pipeline error,
  never a lost notice.
- Rule extractor fix found by the new tests: an exam/post line that
  merely contains "police" or "board" ("Constable (Civil Police) 2027 -
  Written Examination") was being taken for the organization line.

Tests (`npm run test`, 82 passing): `names.test.ts` covers
normalisation, match scores, acronyms, years, canonical case, type and
category inference. `resolve.integration.test.ts` (real DB) runs the
fixture job advertisement through resolution → creates the organization
(STATE, aliases incl. the normalised raw line), the Police category, the
exam and the recruitment (year 2027, closing 2027-01-16, primary
category); the same notice spelled differently ("… Police Recruitment &
Promotion Board") matches without creating anything; the deadline
extension lands on the same recruitment and moves its closing date to
2027-01-26; an admit card with no organization line, from a source that
has been feeding that organization, attaches to the same recruitment
via the same-source fallback and sets its exam date; a different
commission is never merged in; a holiday list resolves to nothing
without crashing. The loopback source-check test now asserts both
ingested PDFs share one auto-created organization ("UP Police
Recruitment and Promotion Board", alias UPRPB) and one recruitment with
year/dates/category, that the job notice is not auto-approved, and
that a changed PDF moves the recruitment's closing date on the same row.

Live (admin UI "Check now" against the loopback fixture): both notices
link to *Uttar Pradesh Police Recruitment and Promotion Board*
(auto-created, method `created` / `same-source`), the recruitment
*Recruitment of Constable (Civil Police) 2027* (year 2027, closing
2027-01-16, exam date 2027-02-17 set by the admit card), the exam
*Recruitment of Constable (Civil Police)* and the primary category
`police`.

## Automation pipeline — Phase 6: Deduplication ✅

`src/lib/pipeline/dedup.ts` — the same notice reaching us through several
doors (official PDF, a mirror of it on another page, a feed item, a
"what's new" link) becomes ONE canonical notice plus `DUPLICATE` rows
that point at it, never two published entries.

- `canonicalizeUrl()` — scheme-less, `www.`-less, lower-cased host,
  tracking parameters (`utm_*`, `fbclid`, `gclid`, session ids…) removed,
  remaining query sorted, fragment and trailing slash dropped. Stored in
  `RecruitmentNotice.canonicalUrl` (official notification URL when the
  extractor found one, else the document URL) so equality is an indexed
  lookup.
- `findDuplicate()` — in order of certainty: same canonical/raw URL →
  same file bytes (`Document.checksum`) under a different URL → same
  advertisement number for the same organization **and notice type**
  (an admit card legitimately shares the advertisement number with its
  job notice) → near-identical title (≥ 0.9) for the same organization/
  recruitment and type within a year, only when the application-end and
  exam dates agree (the same title with a different closing date is a
  new round, not a duplicate). A notice is never a duplicate of itself,
  and the target is always the canonical row, never another duplicate.
- `createNoticeFromIngest()` runs the check on creation: a match is
  stored with `status = DUPLICATE`, `duplicateOfId`, and the reason/score
  in `changeSummary.duplicate`, still linked to the same organization/
  recruitment so a later merge is trivial and an admin can undo a wrong
  call. Re-extraction of a changed document keeps `DUPLICATE`/`REJECTED`
  statuses. A failing duplicate check is a `VALIDATION` pipeline error,
  never a lost notice.

Tests (`npm run test`, 89 passing): `dedup.test.ts` (URL canonical
form), `dedup.integration.test.ts` (real DB: URL with tracking noise,
same bytes/different URL, advertisement number only for same org + type,
title match only with agreeing dates, never self / never another
duplicate), and the loopback source-check test now adds a **mirror
page** serving the same PDF under a different URL: the second source's
check yields one new document whose notice is `DUPLICATE` of the
original job notice (reason `checksum`), linked to the same recruitment,
leaving exactly one non-duplicate JOB notice for that recruitment.

Live (admin UI): created a second source pointing at the fixture's
`/mirror` listing → Check now ingested 1 document → its notice is
`DUPLICATE` of the original (`reason = checksum`, same recruitment);
the original stays `NEEDS_REVIEW`.

## Automation pipeline — Phase 7: Scheduler, runs and retries ✅

The pipeline now runs itself. `src/lib/pipeline/runner.ts` is the single
orchestration entry point; three schedulers call it, all optional and
interchangeable:

- **`vercel.json`** cron (every 30 min) hitting `GET /api/admin/pipeline/run`
  with `Authorization: Bearer $CRON_SECRET` (Vercel sends it automatically).
- **Any external cron** (GitHub Action, crontab + curl, Cloud Scheduler)
  doing the same GET/POST with the secret.
- **`npm run pipeline:worker`** (`scripts/pipelineWorker.ts`) — a
  long-running loop for hosts without a cron, one pass every
  `PIPELINE_INTERVAL_MINUTES` (default 15); `npm run pipeline:run` does a
  single pass and exits. Both talk to the database directly, no secret.

What one pass does (`runPipeline()`): closes out RUNNING runs older than
30 min as FAILED/stale → refuses to start while a live run exists
(`skipped: "running"`) → honours the admin pause switch for scheduled
triggers (`skipped: "paused"`; a MANUAL run still works so an admin can
test while paused) → picks **due** sources (active, and
`lastCheckedAt + checkFrequencyMinutes` has passed; HIGH priority first,
longest-waiting first, capped at 20 per pass so a cron tick stays inside
its timeout) → `checkSource()` each (fetch → ingest → extract → resolve →
dedup) → **retries failed items** whose backoff has elapsed (up to 25
per pass, max 6 attempts): a document-level failure (EXTRACTION /
RESOLUTION / OCR / VALIDATION) is re-run from the *stored* document via
`reprocessDocument()` with no re-download and resolved on success; a
source-level failure (FETCH / PARSE) re-checks the source unless this
pass already did → writes the `PipelineRun` row with counters
(sources checked, pages scanned, new documents, new/updated notices,
duplicates, needs-review, auto-approved, failures) and a JSON log of
per-source results and retry outcomes. `force` + `sourceIds` re-checks
specific sources regardless of schedule (the admin "run now" path).

- `src/lib/pipeline/settings.ts` + new `AppSetting` table (migration
  `pipeline_settings`, additive): runtime switches such as
  `pipeline.paused`, flipped from the admin UI in Phase 8 without a
  redeploy.
- `POST|GET /api/admin/pipeline/run` — cron secret (Bearer or
  `x-cron-secret`) → CRON trigger; signed-in SUPER_ADMIN/EDITOR → MANUAL
  trigger with an audit-log row; anything else → 401. GET without the
  secret returns the last 20 runs for admins. `maxDuration = 300`.
- `.env.example` / `ENVIRONMENT_VARIABLES.md`: `CRON_SECRET`,
  `PIPELINE_INTERVAL_MINUTES`.

Tests (`npm run test`, 94 passing): `runner.integration.test.ts`
(loopback server + real DB) covers: only the due, active source is
checked and the run row/log/counters/SourceCheck rows say so; a second
pass with nothing due checks nothing while `force` re-checks and finds
nothing new; pause skips CRON but not MANUAL; a live run blocks a
parallel run; a stale run is closed as FAILED and the next pass
proceeds; a failed extraction with elapsed backoff is retried from the
stored document, resolved, and updates the existing notice rather than
creating a second; an item past the retry cap is left alone.

Live: `POST /api/admin/pipeline/run` without auth and with a wrong
secret → 401; `GET` with the cron secret ran a real pass (6 sources
checked; the five seeded government sites return HTTP 403 through this
sandbox's egress proxy and were recorded as failing checks + retryable
FETCH errors, exactly as designed); `POST` with the secret and
`{sourceIds:[loopback], force:true}` → 1 source, 0 new; `npm run
pipeline:run` completed a pass from the command line.

## Known follow-ups / decisions to revisit

- `prisma@8` will move out of RC eventually — re-run `npm audit` and
  consider upgrading once it's the stable `latest` tag and the bundled
  agent-toolchain dependency situation is resolved upstream.
- CI: add an `exam-portal` job to `.github/workflows/ci.yml` once there
  are tests to run (Phase 18), mirroring the existing `backend`/`admin`/
  `mobile` jobs.
- Phase 13 built the storage layer as a pluggable `DocumentStorage`
  interface rather than picking a provider outright — dev uses local
  disk automatically, and production picks whichever S3-compatible
  provider (S3 / R2 / Supabase Storage / MinIO) the deployer configures
  via `STORAGE_*` env vars. No further decision needed unless a
  non-S3-compatible provider is desired later.
- Phase 14 built the extraction layer as a pluggable
  `AIExtractionProvider` interface rather than picking a model outright
  — only a mock provider is wired up today (no AI API key is
  configured in this environment). Implement a real provider (e.g.
  backed by the Claude API's PDF support) and select it via
  `AI_EXTRACTION_PROVIDER` when a key becomes available; nothing else
  in the pipeline needs to change.
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
