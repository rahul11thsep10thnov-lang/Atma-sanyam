# Naukri Chayan

An original, mobile-first Indian government examination information
portal — Jobs, Results, Admit Cards, Answer Keys, Syllabus, Admissions,
Scholarships, and more.

This is a separate product living inside the `atma-sanyam` repository,
independent of the FOCUS app at the repo root (see the top-level
[README](../README.md)).

- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — what this is, tech stack, phased roadmap
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — layering, directory structure, deployment
- [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — full target Postgres schema
- [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) — live, verified checklist

## Quick start (local development)

Prerequisites: Node 20+, PostgreSQL 16.

```bash
cd exam-portal
cp .env.example .env      # set DATABASE_URL to your local Postgres
npm install                # also runs `prisma generate` (postinstall)
npm run db:migrate         # applies migrations
npm run dev                # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:migrate:deploy` | Apply Prisma migrations (production) |
| `npm run db:studio` | Prisma Studio (browse the database) |

## Automated notice pipeline

The portal watches official sites itself. After the quick start:

```bash
npm run seed:sources       # source registry: ~176 official sites (central, banking, every RRB, states, defence,
                           # education, other) + the aggregator — all DISABLED and awaiting approval
npm run sources:verify -- --pending   # check each one is reachable, on its official domain, robots-allowed
                                      # and parseable; writes source-verification-report.md
npm run sources:discover -- --verified # propose recruitment/result/admit-card sections from verified sites
npm run pipeline:run       # one pass: check due sources, extract, resolve, dedup, queue for review
npm run pipeline:worker    # keep running one pass every PIPELINE_INTERVAL_MINUTES (default 15)
```

Seeded sources are never fetched until an admin **approves** and **enables**
them (Admin → Automation → Sources → filter “Awaiting approval”). Public
aggregators stay disabled until verified *and* their terms reviewed, and
their notices always go to human review. See `SOURCES.md`.

Then open **Admin → Automation** (`/admin/automation`): Inbox / Review
queue to approve, correct and publish notices; Pipeline runs, Failed items,
Duplicates, Sources. Publishing creates the public recruitment page
(`/recruitments/<slug>`) and the job / admit card / answer key / result
rows, and e-mails subscribers (`/alerts`).

For hosted deployments a cron can call `GET /api/admin/pipeline/run` with
`Authorization: Bearer $CRON_SECRET` (a 30-minute Vercel cron ships in
`vercel.json`). Optional: `ANTHROPIC_API_KEY` for Claude extraction and
Hindi translation, `RESEND_API_KEY` + `ALERTS_FROM_EMAIL` for e-mail
alerts, `OCR_ENABLED=true` for scanned images. See
`ENVIRONMENT_VARIABLES.md`, `ARCHITECTURE.md` (pipeline section) and
`DEVELOPMENT_STATUS.md`.

