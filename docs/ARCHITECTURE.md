# Architecture

PoliceExams keeps the candidate-facing **website**, the **admin console**,
the **API** (with its generation **worker**) and the **database** separate.
Each can be deployed, scaled and secured on its own.

## Components

| Component | Tech | Responsibility | Talks to |
|---|---|---|---|
| Website (`/`) | Next.js 16, React 19, Tailwind 4 | Practice, mock tests, results. Built-in demo content; live tests from the API | API public routes (`/api/*`), Supabase Auth |
| Admin console (`admin/`) | Next.js 16 | Exam-team UI: taxonomy, question bank, generation, review, mock tests, analytics | API admin routes through its own server-side proxy |
| API (`backend/`) | Node 22, Express 5, Drizzle ORM, zod | Auth, roles, validation, question bank, pipeline, mock-test engine, scoring, analytics, audit | PostgreSQL, AI provider, Supabase Auth (token check) |
| Worker | same codebase (`src/pipeline/worker.ts`) | Runs generation batches; in-process by default, or `npm run worker` | PostgreSQL, AI provider |
| Database | PostgreSQL (PGlite embedded in dev) | All durable state | — |
| AI provider | Claude via the Anthropic SDK | Question generation and independent review | called only by the worker |

### What stayed as it was

The website's stack, pages, design and demo mode are unchanged. The only
website changes are additive: a live-tests section, `/mock-test/live/*`
pages, a results card on the dashboard, and shared exam components
extracted from the existing pages without changing their look.

`supabase/schema.sql` predates the API. The website still uses **Supabase
Auth** (Google / mobile OTP); the question bank, tests and attempts now live
in the API's database (which can be the same Supabase Postgres instance).

## Data model

```
exams ─< subjects ─< chapters ─< topics
  │          │           │          │
  └──────────┴─────┬─────┴──────────┘
                   ▼
              questions ─< question_options (A–D)
                   │ └──< question_reviews   (validator / ai / human verdicts)
                   │
generation_jobs ─< generation_batches        (questions keep job + batch ids)
source_materials  (approved text the generator may use)

mock_blueprints ─< mock_tests ─< mock_test_questions >─ questions
users ─< test_attempts ─< test_answers >─ questions
admins ─< admin_sessions        users ─< user_sessions
audit_logs · app_settings
```

Key columns on `questions`: `question_text`, `question_type` (MCQ now;
multiple-select, true/false, numerical, assertion-reason, matching,
passage-based reserved), `language` (BCP-47 code), `difficulty`,
`explanation`, `correct_option`, `status`, `source` (ai / import / manual /
pyq), `source_name`, `source_reference`, `source_excerpt`, `valid_as_of`
(for changing facts), `computation` (arithmetic re-checked by the
validator), `normalized_text` + `fingerprint` (duplicates),
`duplicate_of_id`, `validation_issues`, `created_by`, `reviewed_by`,
timestamps.

**Question status:** `DRAFT → (GENERATED) → VALIDATING → NEEDS_REVIEW |
APPROVED | REJECTED → PUBLISHED → ARCHIVED`. Only an admin action moves a
question to PUBLISHED, and only from APPROVED.

**Languages** are a registry (`backend/src/lib/languages.ts`): Hinglish,
Hindi and English are enabled; Bengali, Marathi, Tamil, Telugu, Kannada,
Malayalam and Assamese are defined and can be switched on without a schema
change. Each entry names its script, which the validator checks.

## Request flows

**Candidate takes a published test**
1. `GET /api/mock-tests?state=up&examType=constable` — published tests only (cached 60 s).
2. `GET /api/mock-tests/:id` — questions and options; never the answer key.
3. `POST /api/mock-tests/:id/start` — creates (or resumes) an attempt, records
   exactly which questions were served, returns the server deadline.
4. The website saves answers on the device while the test runs.
5. `POST /api/mock-tests/:id/submit` — option letters only. The API scores from
   its own key (`correct × marks − incorrect × negative`), stores every answer,
   returns the result with explanations. Resubmitting returns the stored result;
   client-sent scores are ignored.

**Admin publishes content** — see [QUESTION_PIPELINE.md](QUESTION_PIPELINE.md).

## Security

| Concern | Measure |
|---|---|
| Secrets | AI key, database URL and Supabase service key exist only in server env. The website ships only `NEXT_PUBLIC_API_URL` and Supabase's public anon key. The console never receives the API token in JavaScript. |
| Admin auth | Email + password (scrypt), opaque 256-bit session tokens stored hashed, 12-hour sessions (revoked on password or role change), login rate limit, same timing for unknown emails. Console: httpOnly `SameSite=Strict` cookie (`Secure` in production), same-origin proxy with origin check and path allow-list. |
| Authorization | Roles `super_admin`, `admin`, `reviewer` with permissions checked on every API route (`middleware/auth.ts` + `lib/roles.ts`); the console hides what a role can't do, but the API is the enforcement point. |
| User auth | Guest sessions issued by the API; Supabase Google/OTP logins verified with Supabase (`/auth/v1/user`) and exchanged for an API session; a guest's attempts merge into the account. Users only ever see their own attempts. |
| Scoring integrity | Server-side scoring from the stored key; answers limited to served questions; resubmission idempotent; late submissions flagged; expired attempts closed when a new one starts. |
| Input validation | zod on every body and query; UUID path params; size limits (100 KB default, 1 MB source material, 5 MB import); consistent `{ error: { code, message, details } }` responses without stack traces. |
| Rate limits | General 300/min, admin login 10/15 min per IP+email, user sign-in 30/h, attempts 30/min, generation jobs 30/h, imports 20/h (in-memory; use a shared store when running several API instances). |
| Database access | Only the API connects; no public database endpoint. Parameterised queries throughout (Drizzle). |
| Audit | Every login, edit, approval, rejection, publish, generation job, import, settings and account change → `audit_logs` (who, what, when, details), viewable in the console. |
| Logging | One JSON line per event (`generation.started`, `generation.completed`, `generation.failed`, `validation.completed`, `question.approved`, `question.rejected`, `question.published`, `mocktest.generated`, `mocktest.published`, `attempt.submitted`, …). Secret-looking keys are redacted; request logs omit query strings, headers and bodies; no personal data is logged. |
| Headers | helmet on the API; the console sends `X-Frame-Options: DENY`, a restrictive CSP frame policy, `noindex`. |

## Scaling notes

- The worker claims batches with `FOR UPDATE SKIP LOCKED`, so several worker
  processes can share the queue. Stale locks (a worker that died) are
  re-queued automatically.
- Duplicate checks compare against up to 5,000 recent questions per exam +
  subject + language; beyond that, move to `pg_trgm` or embeddings (see
  QUESTION_PIPELINE.md).
- Rate limits are per process; use a Redis store if you run several API
  instances.
