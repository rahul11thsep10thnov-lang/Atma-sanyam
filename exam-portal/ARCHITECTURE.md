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
│   │   ├── (public)/          # public site routes — added from Phase 4 on
│   │   ├── admin/             # admin CMS routes, protected server-side
│   │   ├── api/               # route handlers (public + admin JSON API)
│   │   └── page.tsx           # homepage
│   ├── lib/
│   │   ├── db/                # Prisma client singleton — the ONLY place
│   │   │                      # PrismaClient is instantiated
│   │   ├── env.ts             # validated environment variables (Zod)
│   │   ├── auth/              # NextAuth config, session helpers (Phase 3)
│   │   ├── validation/        # Zod schemas per content type (Phase 5+)
│   │   ├── services/          # business logic, one module per domain
│   │   │                      # (jobs, results, search, ...) — UI and API
│   │   │                      # route handlers call these, never Prisma
│   │   │                      # directly, per Section 3
│   │   ├── seo/                # metadata/sitemap/structured-data helpers
│   │   ├── documents/          # PDF upload + storage abstraction (Phase 13)
│   │   ├── ai/                  # extraction pipeline (Phase 14)
│   │   └── notifications/       # notification abstraction (Phase 16)
│   ├── components/            # reusable UI (JobCard, ResultCard, ...)
│   └── generated/prisma/      # generated Prisma Client (git-ignored)
├── .env.example
└── PROJECT_PLAN.md / ARCHITECTURE.md / DATABASE_SCHEMA.md /
    DEVELOPMENT_STATUS.md
```

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

## Authentication (Phase 3, not yet implemented)

NextAuth v4 with the credentials provider: `AdminUser.passwordHash`
(bcrypt) verified server-side, session stored as an encrypted JWT cookie.
Public site visitors (for saved searches/notifications) will use a
separate, simpler auth path added when that feature is built — the spec
doesn't require public accounts for browsing.

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
