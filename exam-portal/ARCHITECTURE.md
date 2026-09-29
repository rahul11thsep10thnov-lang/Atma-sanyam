# ARCHITECTURE.md — Exam Portal

## High-level shape

```
                         ┌─────────────────────────────────────────┐
                         │            Next.js app (single)          │
  Public visitors  ───▶  │  App Router: public pages (SSR/ISR)      │
  (mobile browsers,      │  App Router: /admin/* (server-protected) │  ───▶  PostgreSQL
   low bandwidth)        │  Route handlers: /api/* (public + admin) │        (Prisma)
                         │  Server Actions: forms, admin mutations   │
                         └─────────────────────────────────────────┘
                                          │
                                          ▼
                         Object storage (PDFs/images) · AI extraction
                         provider · Email/push notification providers
                                          │
                                          ▼
                         Same /api/* surface is consumed later by an
                         Android app (Section 29) — no separate backend.
```

One Next.js app serves the public site, the admin CMS, and the JSON API
that will eventually also serve an Android client — all against the same
PostgreSQL database, per Section 29 of the spec.

## Directory layout

```
exam-portal/
├── prisma/
│   ├── schema.prisma          # database models (see DATABASE_SCHEMA.md)
│   └── migrations/            # generated, checked in
├── prisma.config.ts           # Prisma 7 config: schema path + DATABASE_URL
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # public site: Header/Footer shell (Phase 4),
│   │   │                      # homepage, /search; every content-type page
│   │   │                      # added from Phase 5 on lives in here too
│   │   ├── admin/
│   │   │   ├── (protected)/   # requireAdmin()-gated: layout + overview
│   │   │   ├── login/         # NOT gated — would infinite-redirect otherwise
│   │   │   └── forbidden/     # role-mismatch landing page
│   │   ├── api/               # route handlers (public + admin JSON API)
│   │   └── not-found.tsx      # custom 404 (Section 35)
│   ├── proxy.ts               # Next.js 16's `middleware.ts` — edge-level
│   │                          # redirect for unauthenticated /admin/* only;
│   │                          # never the real auth check (see below)
│   ├── lib/
│   │   ├── db/                # Prisma client singleton — the ONLY place
│   │   │                      # PrismaClient is instantiated
│   │   ├── env.ts             # validated environment variables (Zod)
│   │   ├── auth/               # NextAuth config, password hashing,
│   │   │                       # requireAdmin/requireAdminApi (Phase 3)
│   │   ├── validation/         # Zod schemas per content type (Phase 5+)
│   │   ├── services/            # business logic, one module per domain
│   │   │                        # (adminAuth, auditLog, home, search, ...)
│   │   │                        # — UI and route handlers call these,
│   │   │                        # never Prisma directly, per Section 3
│   │   ├── navLinks.ts          # nav items shared by Header (server) and
│   │   │                        # MobileNav (client) — see note below
│   │   ├── format.ts            # shared date/number formatting
│   │   ├── seo/                 # metadata/sitemap/structured-data helpers
│   │   ├── documents/           # PDF upload + storage abstraction (Phase 13)
│   │   ├── ai/                   # extraction pipeline (Phase 14)
│   │   └── notifications/        # notification abstraction (Phase 16)
│   ├── components/
│   │   ├── layout/             # Header, Footer, SearchBar, MobileNav
│   │   ├── admin/               # AdminSidebar, LogoutButton
│   │   ├── cards/                # JobCard, ExamCard, ResultCard, AdmitCard,
│   │   │                         # AnswerKeyCard, ArticleCard
│   │   └── (EmptyState, SectionHeading, Chip — top-level, used everywhere)
│   └── generated/prisma/      # generated Prisma Client (git-ignored)
├── .env.example
└── PROJECT_PLAN.md / ARCHITECTURE.md / DATABASE_SCHEMA.md /
    DEVELOPMENT_STATUS.md
```

> **Client/server module boundary gotcha** (hit and fixed in Phase 4): a
> plain constant exported from a `"use client"` file (e.g. a nav-links
> array also needed by a server component) doesn't survive being
> imported from server code — Next.js turns every export of a client
> module into a client reference, not just the component. Shared,
> non-component data like `NAV_LINKS` lives in its own plain module
> (`src/lib/navLinks.ts`) that both the server `Header` and the client
> `MobileNav` import, instead of one importing it from the other.

## Layering rules (Section 3)

- **UI components** never import Prisma or run queries. They call
  functions in `src/lib/services/*`.
- **`src/lib/services/*`** holds all business logic and is the only layer
  that imports `src/lib/db/client`. Both UI (via Server Components/Server
  Actions) and route handlers call into services — no duplicated logic.
- **Route handlers** (`src/app/api/**/route.ts`) are thin: validate input
  with Zod, call a service, return JSON. No business logic inline.
- **Admin authorization is enforced in the service layer and in
  middleware/route handlers**, not just by hiding UI — every mutation
  re-checks the caller's role server-side (Section 16).

## Authentication (Phase 3 ✅)

NextAuth v4 with the credentials provider: `AdminUser.passwordHash`
(bcrypt, cost 12) verified server-side in `src/lib/services/adminAuth.ts`,
session stored as a signed JWT cookie (12h). Credential checking,
account lockout (5 failed attempts → 15-minute lock), and the login audit
log entry all live in that one service function — the NextAuth config
(`src/lib/auth/config.ts`) just calls it and translates the result.

Authorization is checked in two places, deliberately:

- `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) redirects an
  unauthenticated visitor away from `/admin/*` before the page renders —
  a UX convenience, not a security boundary by itself.
- `requireAdmin()` (Server Components/pages) and `requireAdminApi()`
  (Server Actions/route handlers), both in `src/lib/auth/session.ts`, are
  the real boundary: every admin page and every future content mutation
  calls one of these directly and can pass an `AdminRole[]` allowlist.
  Section 16 requires this — a hidden button is not access control.

Public site visitors (for saved searches/notifications) will use a
separate, simpler auth path added when that feature is built — the spec
doesn't require public accounts for browsing.

## Content workflow (Phase 5 ✅, reused by every content type since)

`src/lib/services/workflow.ts` is one shared state machine for
DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED (Section 17),
parameterized by role — Exam, Job, Result (Phase 6), AdmitCard (Phase
7), AnswerKey (Phase 8), and Syllabus (Phase 9) all call
`applyTransition()`/`availableTransitions()` rather than each
reimplementing the rules. None of Phases 6–9 needed any change to
`workflow.ts`, `ownership.ts`, or `contentVersion.ts` — exactly the
point of building them as shared modules in Phase 5. Phase 10
(Admission, Scholarship, Article) reuses the same modules the same way.

Syllabus (Phase 9) is the one content type with a genuinely nested
shape (Paper → Subject → Topic → subtopics, Section 13) rather than
flat fields. Its structural mutations
(`addPaper`/`addSubject`/`addTopic` and their `delete*` counterparts in
`src/lib/services/syllabi.ts`) are separate from the top-level
title/description/exam edit, each with its own small Server Action —
`SyllabusTreeEditor` renders one `<form>` per add/remove, so building
the tree works with a full-page redirect and no client-side state,
consistent with every other admin form in this project. A structural
edit still snapshots the whole tree via `contentVersion.ts` when the
syllabus is already `PUBLISHED`, same guarantee as a flat-field edit.

`src/lib/services/ownership.ts` layers Section 16's per-role rules on
top: AUTHOR may create content and edit only their own drafts;
EDITOR/SUPER_ADMIN may edit anything; REVIEWER approves/rejects via the
workflow transitions but doesn't edit content fields directly. Every
Server Action calls `canCreateContent`/`canEditContent` itself — never
inferred from what the UI happened to show.

`src/lib/services/contentVersion.ts` snapshots a record before an
already-PUBLISHED row is overwritten (Section 21A Step 16), so an edit
or a status change never silently loses the previous version. Every
mutation (create/update/each transition) also calls
`src/lib/services/auditLog.ts` (Section 27).

Admin forms (`ExamForm`, `JobForm`) are Client Components using React's
`useActionState` bound to a Server Action — this keeps entered values on
a validation error (no round-trip data loss) while still degrading to a
working plain `<form method="POST">` without JavaScript, since Server
Actions are progressively enhanced by Next.js either way.

## File/document storage (Phase 13) ✅

A `DocumentStorage` interface in `src/lib/documents/storage.ts` (upload,
delete) with two implementations: `LocalDiskStorage` (writes under
`public/uploads/documents`, used automatically when no `STORAGE_*` env
vars are set — dev only, gitignored) and `S3CompatibleStorage`
(`@aws-sdk/client-s3`, `forcePathStyle: true`, works against AWS S3 or
any S3-compatible provider — R2, Supabase Storage, MinIO). The concrete
provider is swappable purely via environment variables; production
throws at startup rather than silently falling back to local disk if
the `STORAGE_*` vars aren't all set. Every upload is validated
server-side (PDF-only, 20MB max, non-empty) and gets a SHA-256 checksum
(`src/lib/documents/checksum.ts`) stored alongside it. New documents
always start `UNVERIFIED`; only an explicit admin action sets
`VERIFIED` — nothing auto-verifies.

### Router-cache gotcha: same-URL redirect after a Server Action mutation

A Server Action that ends with `redirect()` back to the *exact* URL the
client was already on is treated by Next.js as a no-op client-side
navigation — it reuses the stale pre-mutation RSC payload even if the
action already called `revalidatePath()`. This was discovered live
while testing the document verify/unverify toggle (DB updated
correctly; a soft nav back to the identical URL still showed the
pre-toggle value; a hard `page.goto()` reload showed the correct one,
isolating the bug to client-side soft-navigation caching specifically).

**The fix, and the now-required pattern for every mutating admin
action in this codebase**: call `revalidatePath()` *and* redirect to a
URL with a distinguishing/cache-busting query param (e.g.
`?saved=${Date.now()}`), never a bare or statically-suffixed URL — a
static suffix like `?saved=1` still collides with itself on two
consecutive saves from the same page. All 10 admin `actions.ts` files
follow this pattern as of Phase 13.

## AI extraction pipeline (Phase 14) ✅

One reusable pipeline (`src/lib/services/extraction.ts`), not a bespoke
one per exam or document type: `startExtractionJob(documentId, adminId)`
takes a `Document` row, calls whichever `AIExtractionProvider` is
configured, and writes one `ExtractionResult` row per field —
never directly to a published content table. Only a future human
approval action (Phase 15) is allowed to do that.

The provider itself is swappable: `src/lib/ai/provider.ts` defines the
`AIExtractionProvider` interface, and `getAIProvider()` selects an
implementation by the `AI_EXTRACTION_PROVIDER` env var. This
environment has no AI API key configured, so only a `"mock"` provider
(a deterministic, clearly-labeled stub) is wired up; anything else
throws rather than silently substituting mock data. Swapping in a real
model later — e.g. one built on the Claude API's PDF support — means
implementing the same interface and adding one branch to
`getAIProvider()`, with zero changes anywhere else in the pipeline,
admin UI, or database.

Idempotency: `ExtractionJob` has a `(documentId, attempt)` unique
constraint, and each new run computes `attempt = previous max + 1`
rather than overwriting — confirmed live by running extraction twice
on the same document and seeing two independent job records, not one
being clobbered.

## Human verification workflow (Phase 15) ✅

`src/lib/services/extractionReview.ts` sits directly on top of the
Phase 14 pipeline: every reviewer decision (accept/edit/reject a
field, approve/reject a job) is a `FieldOverride` row or an
`ExtractionJob.status` change, never a direct write to
`ExtractionResult` or a published content table. `approveExtractionJob`
enforces that every field has a decision before it will move a job to
`APPROVED`; nothing upstream of that point ever writes to content
tables, and Phase 15 doesn't add that write either — actually
generating/updating a `Job`/`Result`/etc. record from an approved
extraction is future work, deliberately not implied by "approved" here.

A decision (accepted vs. edited vs. rejected) is encoded as a prefix
on `FieldOverride.reason`, not inferred from whether `humanValue` is
`null` — the latter is ambiguous, since accepting a field whose AI
value was itself null looks identical, in the `humanValue` column
alone, to an explicit rejection. This was a real bug found live during
Phase 15 (see DEVELOPMENT_STATUS.md), not a hypothetical one — both
code paths typechecked fine.

## Deployment topology

- **App**: Vercel (or any Node 20+ host) — same as the spec recommends.
- **Database**: Neon (serverless Postgres) in production; local
  PostgreSQL 16 in development (already running in this environment).
- **Object storage**: any S3-compatible provider, configured purely by
  environment variables.
- CI: a new job will be added to `.github/workflows/ci.yml` for
  `exam-portal` (typecheck, lint, build, tests) alongside the existing
  `backend`/`admin`/`mobile` jobs — added once there's more than a
  foundation to test.

## What's deliberately NOT shared with FOCUS

- Database: separate Postgres database (`examportal_dev` locally; a
  separate Neon project/database in production). FOCUS's schema and this
  one are unrelated domains and must not be merged.
- Auth: separate admin accounts/sessions.
- Deployment: deployed as its own Vercel project, independent of FOCUS's
  Render API and Vercel admin console.
