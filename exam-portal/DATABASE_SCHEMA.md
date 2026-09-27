# DATABASE_SCHEMA.md — Exam Portal

This is the **target** normalized PostgreSQL schema (Section 4/5 of the
spec). Only a small slice of it (`AdminUser`, `AdminRole`, `ContentStatus`)
is implemented in Phase 1, to prove the database connection and migration
flow work. The rest is built out in Phase 2, model by model, each with its
own migration.

Every publishable content model shares these fields (Section 4):

```
id            String   @id @default(cuid())
title         String
slug          String   @unique   // per-model, SEO-friendly
description   String?
status        ContentStatus      // DRAFT | IN_REVIEW | APPROVED | PUBLISHED | ARCHIVED | REJECTED
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt
publishedAt   DateTime?
createdBy     String   // AdminUser.id
updatedBy     String   // AdminUser.id
```

## Entity overview

**Exam is the central entity** (Section 5). A Job, Result, AdmitCard,
AnswerKey, and Syllabus each belong to exactly one Exam via a foreign key
— they are never duplicated as free text across tables. `Exam.slug`
(e.g. `ssc-cgl-2026`) is reused as the human-facing URL segment across
`/jobs/[slug]`, `/results/[slug]`, `/admit-card/[slug]`, etc., but each of
those content types has its own row/slug/lifecycle — an Exam can have a
Job without yet having a Result.

```
Organization ──┐
               ├──▶ Exam ──┬──▶ Job
Category ──────┤           ├──▶ Result
               │           ├──▶ AdmitCard
State ─────────┘           ├──▶ AnswerKey
                            ├──▶ Syllabus (Paper → Subject → Topic)
                            ├──▶ Admission
                            ├──▶ Scholarship
                            ├──▶ ImportantLink
                            └──▶ ExamTag ──▶ Tag

Document ──▶ (JOB_NOTIFICATION | RESULT | ADMIT_CARD | ANSWER_KEY | SYLLABUS | ...)
          ──▶ ExtractionJob ──▶ ExtractionResult ──▶ FieldOverride
                                                  └─▶ (on approval) writes to Job/Result/...

Article ──▶ RelatedContent ──▶ (polymorphic: Exam | Job | Result | ...)
AdminUser ──▶ AuditLog (every create/update/delete/publish/approve/reject)
```

## Models

### Core lookups

- **AdminUser** — `id, name, email (unique), passwordHash, role (AdminRole), isActive, lastLoginAt, createdAt, updatedAt`. Index on `role`.
- **User** (public site accounts, for saved searches/notifications — added when that feature ships) — `id, email (unique), name?, createdAt`.
- **Organization** — `id, name, slug (unique), logoUrl?, website?, description?, createdAt, updatedAt`. Index on `slug`, `name`.
- **Category** — `id, name, slug (unique), parentId? (self-relation), description?`. Index on `slug`.
- **State** — `id, name, code (unique, e.g. "MH"), slug (unique)`. Seed data: 28 states + 8 UTs + "ALL_INDIA".
- **Tag** — `id, name, slug (unique)`.

### Central entity

- **Exam** — the shared content fields, plus `organizationId → Organization`, `categoryId → Category`, `stateId → State?`, `examDate?`, `applicationStartDate?`, `applicationEndDate?`. Indexes: `slug` (unique), `organizationId`, `categoryId`, `stateId`, `status`, `publishedAt`, `applicationEndDate`.
- **ExamTag** — join table `examId, tagId` (composite unique).

### Content types (each `1:1` or `1:N` with an Exam)

- **Job** — shared fields + `examId → Exam`, `advertisementNumber?`, `vacancies?`, `qualification?`, `ageLimitMin?`, `ageLimitMax?`, `applicationFee?` (Decimal, per-category JSON breakdown), `notificationPdfDocumentId? → Document`, `officialWebsite?`, `applyUrl?`, `eligibility?` (text), `selectionProcess?` (JSON: ordered stage list), `examPattern?` (JSON), `salary?`, `seoTitle?`, `seoDescription?`, `seoKeywords?` (String[]). Index: `slug` (unique), `examId`, `organizationId` (denormalized for fast org pages), `status`, `publishedAt`, `applicationEndDate`.
- **Result** — shared fields + `examId → Exam`, `resultDate?`, `resultUrl?`, `officialWebsite?`, `relatedAdmitCardId? → AdmitCard`, `relatedAnswerKeyId? → AnswerKey`.
- **AdmitCard** — shared fields + `examId → Exam`, `releaseDate?`, `examDate?`, `downloadUrl?`, `officialWebsite?`, `instructions?`.
- **AnswerKey** — shared fields + `examId → Exam`, `answerKeyDate?`, `answerKeyUrl?`, `objectionDeadline?`, `objectionInfo?`.
- **Syllabus** — shared fields + `examId → Exam`. Structured children:
  - **SyllabusPaper** — `id, syllabusId, name ("Paper 1"), order`.
  - **SyllabusSubject** — `id, paperId, name, order`.
  - **SyllabusTopic** — `id, subjectId, name, subtopics (String[]), order`.
- **Admission** — shared fields + `organizationId?`, `categoryId?`, `stateId?`, `applicationStartDate?`, `applicationEndDate?`, `eligibility?`, `officialWebsite?`.
- **Scholarship** — shared fields + `organizationId?`, `stateId?`, `applicationEndDate?`, `eligibility?`, `amount?`, `officialWebsite?`.
- **Article** — shared fields + `body` (rich text/markdown), `authorId → AdminUser`, `coverImageUrl?`.

### Cross-cutting

- **ImportantLink** — `id, label, url, examId? → Exam, jobId? → Job, order`. Generic "Apply Online / Download Notification / Official Website" links attached to any content type.
- **RelatedContent** — polymorphic link table: `id, sourceType, sourceId, targetType, targetId, relationScore?`. Populated by a service, not by keyword matching (Section 21A Step 8).
- **Notification** — `id, type (NEW_JOB | NEW_RESULT | NEW_ADMIT_CARD | ANSWER_KEY_RELEASED | EXAM_DATE_CHANGED | APPLICATION_DEADLINE | ...), title, body, targetType?, targetId?, createdAt, sentAt?`. Channel fan-out (email/push/web) is a separate `NotificationDelivery` table so the core schema stays provider-agnostic (Section 28).
- **AuditLog** — `id, adminUserId → AdminUser, action (LOGIN | CREATE | UPDATE | DELETE | PUBLISH | UNPUBLISH | APPROVE | REJECT | UPLOAD | DOWNLOAD), contentType?, contentId?, previousValue? (JSON), newValue? (JSON), createdAt`. Indexed on `adminUserId`, `contentType, contentId`, `createdAt`.
- **ContactMessage** — `id, name, email, subject, message, status (NEW | RESOLVED), createdAt`.

### Documents & AI pipeline (Sections 19–21A)

- **Document** — `id, filename, documentType (JOB_NOTIFICATION | RESULT | ADMIT_CARD | ANSWER_KEY | SYLLABUS | ADMISSION | SCHOLARSHIP | OTHER), examId? → Exam, organizationId? → Organization, storageUrl, sourceUrl?, checksum, uploadedBy → AdminUser, uploadedAt, verificationStatus (UNVERIFIED | VERIFIED)`.
- **ExtractionJob** — `id, documentId → Document, status (UPLOADED | EXTRACTING | EXTRACTED | CLASSIFIED | AI_PROCESSING | VALIDATION_FAILED | READY_FOR_REVIEW | UNDER_REVIEW | APPROVED | REJECTED | PUBLISHED | ARCHIVED | FAILED), attempt, aiModel?, error?, createdAt, updatedAt`. Idempotency key on `(documentId, attempt)` so retries never duplicate.
- **ExtractionResult** — `id, extractionJobId → ExtractionJob, fieldPath, value (JSON), sourcePage?, confidence?, isUncertain, conflictsWith?`. One row per extracted field, so partial human review/override is possible (Section 17/22).
- **FieldOverride** — `id, extractionResultId → ExtractionResult, aiValue (JSON), humanValue (JSON), adminUserId → AdminUser, reason?, createdAt`. Human-approved data always wins (Section 17).
- **ContentVersion** — `id, contentType, contentId, versionNumber, snapshot (JSON), createdBy → AdminUser, createdAt, changeSummary?`. Every publish of an already-published record creates a version instead of silently overwriting (Section 21A Step 16).

## Indexing strategy (Section 4)

Every model above gets a `@@index` on: its own `slug` (via `@unique`),
`status`, `publishedAt`, and its primary foreign keys
(`organizationId`, `categoryId`, `stateId`, `examId`). Date-range queries
(exam calendar, "closing soon") index the relevant date column
(`applicationEndDate`, `examDate`). No table returns unbounded result
sets to the browser — every list endpoint paginates (Section 14/25).

## Content status & publication rules (Sections 17, 42, 45)

- New rows start at `DRAFT`.
- AI-extracted data lands in `ExtractionResult`/`FieldOverride`, never
  directly in a content table — a human `APPROVE` action is what creates
  or updates the actual `Job`/`Result`/etc. row and sets `PUBLISHED`.
- `DRAFT`/`IN_REVIEW`/`REJECTED`/`ARCHIVED` content is excluded from
  public pages, search, and the sitemap (`X-Robots-Tag: noindex` /
  `NextResponse.notFound()` as appropriate).
- Missing official data is never invented — fields are nullable and the
  UI renders "Not specified in the available notification." rather than a
  guess (Section 9).
