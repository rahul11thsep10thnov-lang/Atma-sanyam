# PoliceExams

**Police Constable & SI ki taiyari — Simple, Smart aur State-wise**

A state-wise exam-preparation platform for Police Constable and Sub-Inspector
recruitment in 9 states (UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand,
Haryana, Punjab, Chhattisgarh). It has three parts:

| Part | Folder | What it is |
|---|---|---|
| **Website** (the user app) | `/` (repo root) | Next.js 16 site candidates use on phone or laptop: practice, mock tests, PYQ, results |
| **API** | [`backend/`](backend) | Node.js + TypeScript API: question bank, AI generation pipeline, validation, mock-test engine, scoring, analytics |
| **Admin console** | [`admin/`](admin) | Next.js web console for the exam team: generate, review, approve, publish, build mock tests |

Questions are generated and approved in the admin console and reach the
website through the API, so **new questions and tests go live without
rebuilding the website**.

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, data model, security
- [docs/QUESTION_PIPELINE.md](docs/QUESTION_PIPELINE.md) — generation → validation → review → publish, step by step

---

## 1. Project architecture

```
  Candidates (phone / laptop)                    Exam team
  ┌─────────────────────────┐                    ┌──────────────────────────┐
  │ Website  (Next.js, /)   │                    │ Admin console (admin/)   │
  │ demo tests built in +   │                    │ httpOnly cookie session, │
  │ live tests from the API │                    │ same-origin proxy        │
  └───────────┬─────────────┘                    └────────────┬─────────────┘
     GET /api/mock-tests, POST …/start, …/submit      /api/admin/* (Bearer)
              └──────────────────┬────────────────────────────┘
                     ┌───────────▼────────────┐      ┌──────────────────────┐
                     │ API (backend/)         │─────▶│ PostgreSQL           │
                     │ auth · roles · audit   │      │ (Supabase / Neon /   │
                     │ question bank          │      │  any Postgres; an    │
                     │ validator · duplicates │      │  embedded one in dev)│
                     │ mock-test engine       │      └──────────────────────┘
                     │ scoring · analytics    │
                     │ ┌────────────────────┐ │      ┌──────────────────────┐
                     │ │ generation worker  │─┼─────▶│ AI provider (Claude) │
                     │ └────────────────────┘ │      │ server-side only     │
                     └────────────────────────┘      └──────────────────────┘
```

The AI key lives only in the API's environment. The website and admin
console never call the AI provider and never see any secret.

## 2. Folder structure

```
/                      Website (Next.js App Router)
  src/app/             pages; /mock-test/live/[id] = tests from the API
  src/components/exam/ shared exam screens (instructions, test, result)
  src/lib/liveApi.ts   website ↔ API client (guest / Supabase session)
  src/data/            built-in demo content (states, 360 sample questions…)
backend/               API + generation worker
  src/database/        schema (Drizzle), migrations runner, seeders
  src/pipeline/        question schema, validator, duplicates, AI providers, worker
  src/services/        question bank, generation jobs, mock tests, attempts, analytics, import
  src/routes/          public (/api/*) and admin (/api/admin/*) routes
  drizzle/             SQL migrations
  seed/                exam taxonomy + sample questions (exported from the website data)
  tests/               unit + integration tests (vitest)
admin/                 Admin console (Next.js)
docs/                  ARCHITECTURE.md, QUESTION_PIPELINE.md
scripts/               setup.mjs, dev-all.mjs
supabase/              original Supabase schema (website auth; see ARCHITECTURE.md)
```

## 3. Environment setup

Requirements: **Node.js 20.12 or newer** (22 recommended) and Git. Nothing
else — no database server is needed for local development.

```bash
git clone <this repo> && cd <folder>
npm run setup      # installs everything, creates .env files, database, first admin
npm run dev:all    # starts website, API and admin console together
```

| App | URL |
|---|---|
| Website | http://localhost:3000 |
| Admin console | http://localhost:3001 |
| API health | http://localhost:4000/api/health |

`npm run setup` prints your admin email and password (also saved in
`backend/.env`). Change the password under **Settings** after signing in.

**Forgot or want to change the admin password?** Stop the app (Ctrl+C), edit
`ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env` (at least 12 characters with a
letter and a number), and start it again with `npm run dev:all` — the new
password is applied on start. (With a real `DATABASE_URL`, run
`cd backend && npm run seed:admin` instead.) A password you later change
inside the console is kept; `.env` is applied again only when you edit it.
The local database can be used by one program at a time, so commands such as
`seed:admin` or `setup` refuse to run while the app is running and tell you
to stop it first.

Environment files (all git-ignored; examples are committed):

| File | Key settings |
|---|---|
| `backend/.env` ([example](backend/.env.example)) | `DATABASE_URL`, `CORS_ORIGINS`, `MOCK_AI`, `AI_API_KEY`, models, budget, `SUPABASE_URL`/`SUPABASE_ANON_KEY` |
| `admin/.env.local` ([example](admin/.env.example)) | `API_URL` (server-side only) |
| `.env.local` ([example](.env.example)) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

`NEXT_PUBLIC_*` values are public by design (an API address, Supabase's anon
key). Secrets — `AI_API_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` —
go only in server-side env files or your host's secret settings.

## 4. Database setup

- **Development:** leave `DATABASE_URL` empty. The API creates an embedded
  PostgreSQL (PGlite) in `backend/.data/`, migrates and seeds it on start.
- **Production:** any PostgreSQL 14+. With Supabase: *Project Settings →
  Database → Connection string* (session pooler URI) → `DATABASE_URL`. Then:

```bash
cd backend
npm run db:migrate                     # create/upgrade tables
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='a-long-Passw0rd' npm run seed
#   seeds the 18 exams, subjects and chapters, and creates your super admin
#   add `-- --with-sample-questions` to import the 360 sample questions for review
```

## 5. AI provider setup

1. Create an API key at console.anthropic.com.
2. In `backend/.env` (or your host's secrets): `MOCK_AI=false`,
   `AI_API_KEY=<key>`.
3. Optional: `AI_GENERATION_MODEL` / `AI_REVIEW_MODEL` (default
   `claude-opus-5`; e.g. `claude-sonnet-5` costs less), `AI_EFFORT`
   (`high` default), `AI_MONTHLY_BUDGET_USD` (hard monthly cap).
4. Restart the API. **Settings** in the console shows the provider and models.

Spending controls: a cost estimate before every job, a per-job cost cap
(default 2× the estimate), a monthly budget, max retries per batch, max
questions per job and request timeouts — all editable under **Settings**.

## 6. Admin console startup

`npm run dev:all` starts it, or on its own: `cd admin && npm run dev`
(needs the API running and `API_URL` set). Roles: **Super Admin** (all),
**Admin** (all except accounts), **Reviewer** (inspect, edit, approve,
reject — cannot publish or spend AI budget). Add accounts under Settings.

## 7. Website startup

`npm run dev` in the repo root. With `NEXT_PUBLIC_API_URL` set, the Mock Tests
page shows **Latest Mock Tests** from the API; without it the website runs
entirely on its built-in demo content, as before.

## 8. Development mode (no AI cost)

`MOCK_AI=true` (the default) replaces the AI provider with a local generator:

- numerical chapters (Percentage, Profit-Loss, Simple Interest, Average,
  Ratio, Time-Speed-Distance, Time & Work, Simplification, Series) get
  correct, freshly calculated questions in **Hindi, English or Hinglish**;
- other Hinglish chapters reuse the website's sample questions;
- ~6% of questions carry a deliberate flaw (`MOCK_AI_FAULT_RATE`) so the
  validator and review queue have something to catch;
- the instruction `[mock:invalid-json]` makes a job fail, to try **Retry
  failed batches**.

This exercises the whole path — admin → generation → validation →
database → mock test → website → result → analytics — for free.

## 9. Production deployment

| Part | Suggested host | Notes |
|---|---|---|
| Database | Supabase or Neon | set `DATABASE_URL` on the API |
| API | Render / Railway / Fly (Docker) | [`backend/Dockerfile`](backend/Dockerfile) runs migrations then starts; [`render.yaml`](render.yaml) blueprint included; health check `/api/health` |
| Worker (optional) | same image, command `node dist/worker.js` | set `WORKER_ENABLED=false` on the API to split generation out |
| Admin console | Vercel or Render | root directory `admin`, env `API_URL` |
| Website | Vercel | env `NEXT_PUBLIC_API_URL` = your API URL |

On the API set `NODE_ENV=production`, `CORS_ORIGINS=<website URL>`,
`TRUST_PROXY=1` (behind one proxy) and, for website logins,
`SUPABASE_URL` + `SUPABASE_ANON_KEY`. The console's cookie is `Secure` in
production, so serve it over HTTPS. CI (`.github/workflows/ci.yml`) runs the
API tests on PostgreSQL 16 and builds all three apps.

## 10. Database migrations

Schema lives in `backend/src/database/schema.ts`. After changing it:

```bash
cd backend
npm run db:generate -- --name describe-change   # writes drizzle/NNNN_*.sql — review and commit it
npm run db:migrate                              # apply locally; production applies on container start
```

## 11. How to generate questions

Console → **Generate Questions** → choose exam, subject, chapter (and topic),
language, number of questions, difficulty mix (e.g. 30/50/20), explanation,
optional approved source material and instructions → check the cost
estimate → **Start generation**. The job page shows live progress, e.g.
`Generation: ████████████░░░░ 75% — 375 / 500 generated`, plus approved /
needs-review / rejected counts, per-batch status and cost. If some batches
fail, the others' questions are kept; use **Retry failed batches**.

## 12. How to review questions

Console → **Review Questions** (the sidebar shows how many are waiting). Each
question shows the options with the key marked, the explanation, exam /
subject / chapter / topic, difficulty, the 16 automated checks, the AI
reviewer's verdict, any **POSSIBLE DUPLICATE** side by side, and its source.
Keyboard: **A** approve · **P** approve & publish · **R** reject · **E**
edit · **X** archive · **J/K** next/previous. The Question Bank also offers
filters and bulk approve / reject / publish.

## 13. How to publish mock tests

1. Publish questions (Question Bank → select → **Publish**, or **P** in Review).
   Only PUBLISHED questions can go into a test.
2. Console → **Mock Tests** → **New mock test / blueprint**: exam, language,
   duration, marking, difficulty mix and questions per subject →
   **Generate test**, or **Save as blueprint**.
3. Open the test → **Publish**. It appears on the website's Mock Tests page
   within a minute.
4. Blueprints → **Generate tests** creates "Mock Test 1…N" in one go,
   picking the least-used questions so the series repeats as little as
   possible.

---

## Website features

| Area | Where |
|---|---|
| Home | `src/app/page.tsx` |
| Exam catalog and 18 exam profiles | `/exams`, `/[slug]` e.g. `/up-police-constable` |
| Quick Practice | `/practice` → `/practice/run` |
| Mock tests — built-in demo | `/mock-test` → `/mock-test/[id]` → `/attempt` |
| Mock tests — published from the console | `/mock-test/live/[id]` → `/attempt` (server-scored) |
| PYQ practice sets, State GK, Daily Quiz, Current Affairs, Physical Test, Study Notes, Exam Updates, Search | `/pyq`, `/state-gk`, `/daily-quiz`, `/current-affairs`, `/physical-test`, `/study-notes`, `/exam-updates`, `/search` |
| Login (Google / Mobile OTP via Supabase, or guest) | `/login` |
| Dashboard, bookmarks, mistakes, leaderboard | `/dashboard`, `/leaderboard` |

The website never invents official recruitment data: vacancies, dates and
cut-offs show "Official notification ka wait karein". Built-in PYQ sets,
current affairs and exam updates are labelled sample/placeholder content.
The older `/admin` page inside the website is the original demo
(browser-only) panel; the real console is `admin/`.

## Commands

```bash
npm run setup        # first-time setup (all three apps)
npm run dev:all      # run everything
npm run dev          # website only
npm run build        # build the website
cd backend && npm test          # API tests (embedded Postgres; TEST_DATABASE_URL=… for a real one)
cd backend && npm run worker    # standalone generation worker (needs DATABASE_URL)
npm run export:seed  # re-export website taxonomy/sample questions into backend/seed
```

`npm audit` in `backend/` reports advisories only in the development tool
`drizzle-kit`'s bundled esbuild dev server (never run by this project);
`npm audit --omit=dev` reports none.
