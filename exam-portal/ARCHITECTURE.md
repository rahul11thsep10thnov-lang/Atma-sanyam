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
7), and AnswerKey (Phase 8) all call
`applyTransition()`/`availableTransitions()` rather than each
reimplementing the rules. None of Phases 6, 7, or 8 needed any change
to `workflow.ts`, `ownership.ts`, or `contentVersion.ts` — exactly the
point of building them as shared modules in Phase 5. Phases 9–10
(Syllabus, Admission, Scholarship, Article) reuse the same modules the
same way.

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

## File/document storage (Phase 13, not yet implemented)

An `S3-compatible object storage` abstraction behind a small interface in
`src/lib/documents/storage.ts` (upload, get signed URL, delete) so the
concrete provider (S3, Cloudflare R2, Supabase Storage…) is swappable via
environment variables only — never hard-coded local filesystem paths in
production code paths.

## AI extraction pipeline (Phase 14, not yet implemented)

Implemented as the fixed, input-variable-driven pipeline described in
Section 21(A) of the spec: one reusable pipeline
(`document_type`, `organization`, `exam`, `category`, `state`,
`source_document`, `source_url` as inputs) rather than a bespoke pipeline
per exam. AI output is written to a separate `ExtractionResult`-style
table (see DATABASE_SCHEMA.md) and can never write directly to published
content tables — only an admin approval action can do that.

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
