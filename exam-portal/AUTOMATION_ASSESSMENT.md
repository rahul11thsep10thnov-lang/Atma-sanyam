# Automated Government Notification Pipeline — Architecture Assessment

Written before any pipeline code, per the owner's instruction to inspect
first. Everything below was read from the repository as it stands after
Phase 20 + the SarkariChayan rebrand.

## A. Current architecture

- **Framework**: Next.js 16.3 (App Router, Turbopack), React 19, TypeScript,
  Tailwind v4. Server Components + Server Actions for the admin CMS;
  route handlers under `src/app/api/*` for the public JSON API.
- **Data**: PostgreSQL via Prisma 7 (`@prisma/adapter-pg` driver adapter).
  Client in `src/lib/db/client.ts` (guarded by `server-only`); scripts use
  `prisma/scriptDb.ts`.
- **Auth**: NextAuth v4 credentials provider, JWT sessions, admin-only.
  Roles `SUPER_ADMIN | EDITOR | AUTHOR | REVIEWER`. `requireAdminApi()`
  (`src/lib/auth/session.ts`) is the server-side gate every action/route
  calls. There is **no public user login** — `User` is a bare
  `{id,email,name}` table with nothing attached to it.
- **Validation**: Zod 4 schemas in `src/lib/validation/*`.
- **Documents**: `Document` model + pluggable `DocumentStorage`
  (local disk in dev, S3-compatible in prod) + SHA-256 checksums
  (Phase 13). `ExtractionJob/ExtractionResult/FieldOverride` + a
  pluggable `AIExtractionProvider` (mock only — no API key) + a human
  review screen (Phases 14–15).
- **Notifications (outbound alerts)**: `Notification` +
  `NotificationDelivery` + `ChannelDispatcher` (only WEBSITE really
  sends; others record honest `FAILED`) (Phase 16).
- **Analytics**: first-party `ContentViewEvent` (Phase 17).
- **Tests**: Vitest, 28 unit tests over pure logic. Playwright used ad hoc
  for live verification (not in the repo).
- **Deployment target**: Vercel (per `DEPLOYMENT.md`); nothing
  Vercel-specific in code. No `vercel.json`.

## B. Current database schema (relevant parts)

```
Organization {name, slug, website, logoUrl, description}          ← no aliases, no type/state/parent
Category     {name, slug, parentId}                                ← single hierarchy, no M:N
Exam         {title, slug, organizationId*, categoryId*, stateId?, dates…}
Job          {examId*, organizationId (denormalized), vacancies, fee, dates…}
Result / AdmitCard / AnswerKey {examId*, dates, urls…}
Syllabus / Admission / Scholarship / Article
Document     {documentType, examId?, organizationId?, storageUrl, sourceUrl?, checksum, uploadedBy*}
ExtractionJob → ExtractionResult → FieldOverride
Notification {type, title, body, targetType?, targetId?}  + NotificationDelivery
AuditLog     {adminUserId*, action, contentType, contentId, prev/new}
ContentVersion, ContentViewEvent, State, Tag, ExamTag, ImportantLink, RelatedContent
```
`*` = required. **Every content row hangs off `Exam`, and `Exam` requires
an `Organization` and a `Category` to exist first** — that is the manual
bottleneck the owner wants removed.

## C. Current admin workflow

`/admin/exams/new` (pick Organization + Category from dropdowns, both
required) → `/admin/jobs/new` (pick Exam, required) → fill ~18 fields by
hand → `DRAFT → IN_REVIEW → APPROVED → PUBLISHED` via `workflow.ts`.
Organizations/Categories have **no admin UI at all** (sidebar placeholders);
they only exist via `seed:content`. Documents can be uploaded and run
through the (mock) extractor, but nothing turns an extraction into a Job.

## D. Current job/exam relationships

`Organization 1─n Exam 1─n {Job, Result, AdmitCard, AnswerKey, Syllabus}`.
There is no entity representing *one recruitment drive* — an SSC CGL 2027
notification, its admit card and its result are three unrelated rows that
happen to share an `examId`. `Result.relatedAdmitCardId/relatedAnswerKeyId`
are the only cross-links, set by hand.

## E. Current notification architecture

`Notification` here means **an alert sent to users**, created only when a
Job/Result/AdmitCard/AnswerKey is first published. It is *not* a
government notification. **Naming decision**: the spec's universal
"Notification" (a government notice) is implemented as
**`RecruitmentNotice`** so the Phase 16 alert model and its dispatcher keep
working untouched. Alerts gain a `recruitmentNoticeId` link.

## F. Current scheduler / background-job capability

None. No cron, queue, Redis or worker. Everything runs inside a request.
Plan: a protected `POST /api/admin/pipeline/run` route (admin session **or**
a `CRON_SECRET` bearer so Vercel Cron can call it) + a `vercel.json` cron
entry, and `npm run pipeline:worker` — a plain `setInterval` loop for
self-hosted deployments. Runs are short, idempotent and resumable via
`PipelineRun`/`PipelineError`, so no queue is needed at this scale; adding
one later is an implementation detail behind `runPipeline()`.

## G. Exact files that change

Schema/migration: `prisma/schema.prisma` + one migration per phase.
New modules: `src/lib/pipeline/*` (fetch, change detection, html/pdf/rss
parsers, OCR, extraction, entity resolution, dedup, confidence, scheduler),
`src/lib/services/{sources,recruitments,notices,pipeline}.ts`.
Extended: `src/lib/services/auditLog.ts` (pipeline actor),
`src/lib/services/documents.ts` (pipeline-sourced documents),
`src/lib/ai/provider.ts` (real Claude extractor behind `ANTHROPIC_API_KEY`),
`src/lib/services/{jobs,results,admitCards,answerKeys}.ts` (publish from a
notice; `recruitmentId`), `src/lib/services/search.ts` (alias-aware),
`src/components/admin/AdminSidebar.tsx` (automation-first sidebar).
New admin pages: `/admin/automation/{inbox,sources,pipeline,failed,duplicates}`,
`/admin/organizations`, `/admin/categories`, `/admin/recruitments`.
New public pages: `/recruitments`, `/recruitments/[slug]` (timeline),
`/organizations`, `/categories`; language switch (`en`/`hi`) in the shell.
New API: `src/app/api/admin/pipeline/*`, `src/app/api/admin/sources/[id]/check`,
`src/app/api/admin/notices/[id]/{approve,reject,publish,process}`,
`src/app/api/admin/documents/[id]/reprocess`, `src/app/api/admin/duplicates/[id]/merge`.
Tests: `src/lib/pipeline/*.test.ts` with realistic fixtures under
`src/lib/pipeline/__fixtures__/`.

## H. Migration plan

1. **Additive only, no data loss.** Existing rows and the manual admin
   forms keep working throughout; manual creation becomes an override.
2. Phase 1 migration adds: `OrganizationAlias`, `ExamAlias`,
   `Recruitment`, `RecruitmentCategory` (M:N), `Source`, `SourceCheck`,
   `PipelineRun`, `PipelineError`, `DocumentVersion`, `RecruitmentNotice`;
   extends `Organization` (shortName, type, state, parent, aliases,
   isAutoCreated), `Category` (isAutoCreated), `Exam` (aliases,
   isAutoCreated), `Job/Result/AdmitCard/AnswerKey` (`recruitmentId?`),
   `Document` (source, text, OCR flag, versions; `uploadedBy` becomes
   optional for pipeline-fetched files), `AuditLog` (`adminUserId`
   optional + `actor` so "AUTO" is a real actor), `Notification`
   (priority + notice link).
3. The same migration **backfills** one `Recruitment` per existing `Exam`
   and points its Jobs/Results/AdmitCards/AnswerKeys at it, plus one
   `OrganizationAlias`/`ExamAlias` per existing name — so existing data
   is already resolvable by the new matcher. Nothing is duplicated.
4. Later phases add `AlertSubscription` (user alerts) and bilingual
   columns in their own small migrations.

## Environment constraints that bound what can be *verified* here

- Outbound HTTP to government domains and to the Tesseract language-data
  CDN is blocked in this sandbox. The fetcher and parsers are therefore
  verified end-to-end against **local fixtures served over real HTTP**
  (a loopback server), and OCR against an injected worker. The code paths
  are real; live-site behaviour is verified by the owner on their machine.
- `api.anthropic.com` is reachable but no key is configured. Extraction is
  **staged**: a deterministic rule-based extractor (dates, vacancies,
  fees, ages, notice type, organization via the alias table) always runs
  and yields real per-field confidence; the Claude extractor runs only
  when `ANTHROPIC_API_KEY` is set and only for low-confidence fields
  (cost control, §36). Nothing is invented when a field is absent — it
  stays `null`.

## Phase order (§43)

1 Schema → 2 Source management → 3 Fetcher/parsers/change detection →
4 Extraction (rules + optional Claude) → 5 Entity resolution →
6 Deduplication → 7 Scheduler → 8 Admin automation dashboard →
9 Public website (Recruitment timeline, org/category pages) →
10 Alerts/subscriptions → 11 SEO/bilingual → 12 Tests + acceptance run.
Each phase ends with typecheck/lint/test/build, a live check, a
`DEVELOPMENT_STATUS.md` entry, and a commit.
