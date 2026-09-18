# PoliceExams

**Police Constable & SI ki taiyari — Simple, Smart aur State-wise**

A state-wise exam preparation platform for Indian Police Constable and
Sub-Inspector (SI) recruitment exams, covering 9 states: Uttar Pradesh,
Madhya Pradesh, Rajasthan, Jharkhand, Bihar, Uttarakhand, Haryana, Punjab
and Chhattisgarh (18 exam profiles total). Everything is Hinglish, mobile
first, and structured so a new state/exam can be added purely with data —
no frontend code changes required.

## Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4
- **Backend/Auth/DB:** Supabase (Postgres + Auth + RLS) — schema in [`supabase/schema.sql`](./supabase/schema.sql)
- **Hosting:** Vercel (zero-config)

## Running it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app works out of the box **without any Supabase project configured** —
content (states, exams, syllabus, 360 sample questions, PYQ sets, mock
tests, study notes, etc.) ships as typed static data in `src/data/*` and is
the seed source of truth. User-specific state in this demo mode (bookmarks,
mistake tracking, points/streak, attempt history, and the admin panel's
question moderation) is kept in the browser's `localStorage` — see
`src/lib/localStore.ts`. This lets every feature (practice, mock tests,
daily quiz, dashboard, admin panel, leaderboard) be exercised end-to-end
immediately, with no backend to provision.

## Going to production with Supabase

The app is designed to upgrade to a real multi-user backend with **no UI
rewrites** — the static data types in `src/types/index.ts` mirror the
Postgres tables 1:1.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL
   editor (or `supabase db push`). It creates every table from the spec
   (states, subjects, topics, exams, exam_configs, questions,
   question_options, question_reports, pyq_papers, pyq_questions,
   mock_tests, mock_questions, test_attempts, test_answers, study_notes,
   current_affairs, exam_updates, physical_requirements, bookmarks,
   wrong_questions, leaderboard_entries, badges, user_badges, profiles),
   plus Row Level Security policies (public read on content, admin-only
   writes, owner-only access on user data).
3. Copy `.env.example` to `.env.local` and fill in your Supabase project
   URL/keys.
4. Seed the database from the same static data used in demo mode:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase
   ```
5. In the Supabase Auth settings, enable the **Google** provider and a
   **Phone (OTP)** provider (e.g. via Twilio) — the login page
   (`src/app/login/page.tsx`) already calls `signInWithOAuth` /
   `signInWithOtp` / `verifyOtp` and will start working automatically once
   env vars are present.
6. Promote your own user to admin: `update public.profiles set role =
   'admin' where id = '<your-auth-uid>';`
7. Swap the `localStore.ts` calls in the admin panel / dashboard /
   bookmarks / mistakes pages for the equivalent Supabase queries against
   the tables above (the RLS policies already enforce the right access —
   owner-only for `bookmarks`/`wrong_questions`/`test_attempts`,
   admin-only writes for content tables).

## Content & data model

- `src/data/states.ts` — the 9 states and their stable facts (capital,
  formation year, high court, etc.)
- `src/data/examConfigs.ts` — all 18 exam profiles (Constable/SI ×
  9 states). Cycle-specific facts that we cannot know in advance
  (**vacancy, application dates, exam date, cut-off**) are always rendered
  as "Official notification ka wait karein" rather than fabricated, per
  the no-fake-data requirement. Eligibility/pattern figures are shown as
  clearly labelled **indicative** values (based on typical past cycles)
  with an on-page disclaimer to verify against the latest official
  notification.
- `src/data/stateFacts.ts` + `src/data/genericQuestions.ts` — the source
  facts/questions combined by `src/scripts/generate-questions.ts` into the
  360-question sample bank (`npm run generate:questions` to regenerate
  `src/data/generated/questions.json`). ~65% easy / ~35% moderate, no
  "hard" questions, per the difficulty requirement.
- `src/data/mockTests.ts`, `src/data/pyq.ts`, `src/data/studyNotes.ts`,
  `src/data/currentAffairs.ts`, `src/data/examUpdates.ts` — derived
  content, all explicitly marked `isSample: true` where they are
  demo/placeholder rather than verified official material (PYQ papers are
  original admin-authored practice sets, not copied from any copyrighted
  source; current affairs / exam updates ship as clearly labelled
  placeholders since we do not fabricate live news or notifications).

Adding a **new state or exam** later is just adding records to these data
modules (or, once Supabase is live, rows to the corresponding tables) — no
page code changes needed, since every route (`/[slug]`, `/state-gk/[state]`,
`/physical-test/[state]`, `/mock-test/[id]`, `/pyq/[id]`, ...) is driven by
`generateStaticParams` over the data.

## Feature map

| Area | Where |
|---|---|
| Home | `src/app/page.tsx` |
| Exam catalog | `/exams`, `/exams/constable`, `/exams/si`, `/exams/[state]` |
| Exam profile (18 combos) | `/[slug]` e.g. `/up-police-constable` — tabs for Overview, Syllabus, Pattern, PYQ, Mock, Practice, Physical, Updates, Notes |
| Quick Practice engine | `/practice` → `/practice/run` |
| Mock Test engine (timer, palette, mark for review, results) | `/mock-test` → `/mock-test/[id]` → `/mock-test/[id]/attempt` |
| PYQ (attempt online) | `/pyq` → `/pyq/[id]` |
| State GK | `/state-gk` → `/state-gk/[state]` |
| Daily Quiz + streak | `/daily-quiz` |
| Current Affairs | `/current-affairs` |
| Physical Test (PET/PST) | `/physical-test` → `/physical-test/[state]` |
| Study Notes | `/study-notes` → `/study-notes/[slug]` |
| Exam Updates | `/exam-updates` |
| Global Search | `/search` |
| Auth (Google / Mobile OTP / Guest demo) | `/login` |
| Dashboard, Bookmarks, Meri Mistakes | `/dashboard`, `/dashboard/bookmarks`, `/dashboard/mistakes` |
| Leaderboard + gamification (points/streak/badges) | `/leaderboard`, `src/data/badges.ts` |
| Admin panel (question CRUD + moderation, reports, analytics) | `/admin` |
| Legal / footer pages | `/about`, `/contact`, `/privacy-policy`, `/terms`, `/disclaimer`, `/report-error`, `/official-sources` |
| SEO | per-page `generateMetadata`, `src/app/sitemap.ts`, `src/app/robots.ts`, JSON-LD in `src/app/layout.tsx` |

## Scripts

```bash
npm run dev               # local dev server
npm run build              # production build
npm run lint                # eslint
npm run generate:questions  # regenerate src/data/generated/questions.json from the fact/question banks
npm run seed:supabase       # push static seed data into a configured Supabase project
```

## Deploying

Push to a Git repo and import it on [Vercel](https://vercel.com/new) — no
extra configuration needed for the demo mode. Add the Supabase env vars
(see `.env.example`) in the Vercel project settings once you've set up a
real backend per the section above.
