# Exam Portal

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
