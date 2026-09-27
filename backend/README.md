# PoliceExams API

Node.js + TypeScript (Express 5, Drizzle ORM, PostgreSQL) — question bank,
AI generation pipeline, validation, mock-test engine, server-side scoring,
analytics and the admin API. See the [root README](../README.md),
[ARCHITECTURE.md](../docs/ARCHITECTURE.md) and
[QUESTION_PIPELINE.md](../docs/QUESTION_PIPELINE.md).

```bash
cp .env.example .env     # leave DATABASE_URL empty for the embedded dev database
npm install
npm run seed             # migrations + exam taxonomy (+ admin from ADMIN_BOOTSTRAP_*)
npm run dev              # http://localhost:4000/api/health (generation worker included)
npm test                 # 76 tests on embedded Postgres; TEST_DATABASE_URL=postgres://… for a real server
```

| Script | Purpose |
|---|---|
| `npm run dev` / `npm start` | API (+ in-process worker unless `WORKER_ENABLED=false`) |
| `npm run worker` / `npm run start:worker` | standalone generation worker (needs `DATABASE_URL`) |
| `npm run db:generate` / `npm run db:migrate` | create / apply migrations |
| `npm run seed [-- --with-sample-questions]` | taxonomy, first admin, optional sample questions |
| `npm run seed:admin` | create or reset an admin from `ADMIN_BOOTSTRAP_*` |

Public routes: `/api/health`, `/api/auth/guest`, `/api/auth/supabase`,
`/api/me`, `/api/exams`, `/api/subjects`, `/api/chapters`,
`/api/mock-tests`, `/api/mock-tests/:id`, `/api/mock-tests/:id/start`,
`/api/mock-tests/:id/submit`, `/api/attempts`, `/api/attempts/:id`.

Admin routes (`/api/admin/…`, Bearer admin session): `auth/*`, `admins`,
`taxonomy`, `exams|subjects|chapters|topics`, `questions` (+ `/:id/approve
|reject|publish|unpublish|archive|restore`, `questions/bulk`),
`generation-jobs` (+ `/estimate`, `/:id/retry`, `/:id/cancel`),
`source-materials`, `imports`, `mock-tests` (+ `/generate`, `/:id/publish`),
`blueprints` (+ `/:id/generate`), `dashboard`, `analytics`, `users`,
`settings`, `audit`. Errors are always `{ "error": { "code", "message", "details" } }`.
