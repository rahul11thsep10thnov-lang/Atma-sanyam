-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('HTML', 'PDF', 'RSS', 'API', 'SITEMAP', 'JSON', 'XML');

-- CreateEnum
CREATE TYPE "SourcePriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CENTRAL', 'STATE', 'PSU', 'UNIVERSITY', 'COURT', 'DEFENCE', 'MUNICIPAL', 'AUTONOMOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('JOB', 'ADMIT_CARD', 'EXAM_DATE', 'ANSWER_KEY', 'RESULT', 'MERIT_LIST', 'SELECTION_LIST', 'INTERVIEW', 'DOCUMENT_VERIFICATION', 'CORRIGENDUM', 'DEADLINE_EXTENSION', 'EXAM_POSTPONED', 'EXAM_CANCELLED', 'OTHER');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PipelineTrigger" AS ENUM ('CRON', 'MANUAL', 'SOURCE_CHECK', 'RETRY');

-- CreateEnum
CREATE TYPE "PipelineErrorType" AS ENUM ('FETCH', 'PARSE', 'OCR', 'EXTRACTION', 'RESOLUTION', 'VALIDATION', 'PUBLISH', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_adminUserId_fkey";

-- AlterTable
ALTER TABLE "admit_cards" ADD COLUMN     "recruitmentId" TEXT;

-- AlterTable
ALTER TABLE "answer_keys" ADD COLUMN     "recruitmentId" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor" TEXT,
ALTER COLUMN "adminUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "isAutoCreated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3),
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "ocrUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourcePublishedAt" TIMESTAMP(3),
ALTER COLUMN "uploadedBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "isAutoCreated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "recruitmentId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "recruitmentNoticeId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "isAutoCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationType" "OrganizationType",
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "stateId" TEXT;

-- AlterTable
ALTER TABLE "results" ADD COLUMN     "recruitmentId" TEXT;

-- CreateTable
CREATE TABLE "organization_aliases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_aliases" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "summaryHi" TEXT,
    "year" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "applicationStartDate" TIMESTAMP(3),
    "applicationEndDate" TIMESTAMP(3),
    "examDate" TIMESTAMP(3),
    "isAutoCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examId" TEXT,

    CONSTRAINT "recruitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_categories" (
    "recruitmentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recruitment_categories_pkey" PRIMARY KEY ("recruitmentId","categoryId")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,
    "officialDomain" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'HTML',
    "rssUrl" TEXT,
    "apiUrl" TEXT,
    "parserType" TEXT,
    "priority" "SourcePriority" NOT NULL DEFAULT 'NORMAL',
    "checkFrequencyMinutes" INTEGER NOT NULL DEFAULT 360,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "robotsStatus" TEXT,
    "etag" TEXT,
    "lastModified" TEXT,
    "lastContentHash" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "discoveredCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_checks" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "changed" BOOLEAN NOT NULL DEFAULT false,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "newItems" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "source_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "trigger" "PipelineTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "sourcesChecked" INTEGER NOT NULL DEFAULT 0,
    "pagesScanned" INTEGER NOT NULL DEFAULT 0,
    "newDocuments" INTEGER NOT NULL DEFAULT 0,
    "newNotices" INTEGER NOT NULL DEFAULT 0,
    "updatedNotices" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "needsReview" INTEGER NOT NULL DEFAULT 0,
    "autoPublished" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "log" JSONB,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_errors" (
    "id" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "sourceId" TEXT,
    "documentId" TEXT,
    "noticeId" TEXT,
    "errorType" "PipelineErrorType" NOT NULL DEFAULT 'UNKNOWN',
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetryAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "pipeline_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "extractedText" TEXT,
    "pageCount" INTEGER,
    "ocrUsed" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" JSONB,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_notices" (
    "id" TEXT NOT NULL,
    "noticeType" "NoticeType" NOT NULL DEFAULT 'OTHER',
    "status" "NoticeStatus" NOT NULL DEFAULT 'NEW',
    "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "summary" TEXT,
    "summaryHi" TEXT,
    "slug" TEXT,
    "sourceUrl" TEXT,
    "canonicalUrl" TEXT,
    "sourceDomain" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "extracted" JSONB,
    "overallConfidence" DOUBLE PRECISION,
    "fieldConfidence" JSONB,
    "validationErrors" JSONB,
    "changeSummary" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedContentType" TEXT,
    "publishedContentId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recruitmentId" TEXT,
    "organizationId" TEXT,
    "examId" TEXT,
    "sourceId" TEXT,
    "documentId" TEXT,
    "documentVersionId" TEXT,
    "duplicateOfId" TEXT,

    CONSTRAINT "recruitment_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_aliases_normalized_key" ON "organization_aliases"("normalized");

-- CreateIndex
CREATE INDEX "organization_aliases_organizationId_idx" ON "organization_aliases"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_aliases_normalized_key" ON "exam_aliases"("normalized");

-- CreateIndex
CREATE INDEX "exam_aliases_examId_idx" ON "exam_aliases"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "recruitments_slug_key" ON "recruitments"("slug");

-- CreateIndex
CREATE INDEX "recruitments_organizationId_idx" ON "recruitments"("organizationId");

-- CreateIndex
CREATE INDEX "recruitments_examId_idx" ON "recruitments"("examId");

-- CreateIndex
CREATE INDEX "recruitments_status_idx" ON "recruitments"("status");

-- CreateIndex
CREATE INDEX "recruitments_publishedAt_idx" ON "recruitments"("publishedAt");

-- CreateIndex
CREATE INDEX "recruitments_applicationEndDate_idx" ON "recruitments"("applicationEndDate");

-- CreateIndex
CREATE INDEX "recruitment_categories_categoryId_idx" ON "recruitment_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "sources_listingUrl_key" ON "sources"("listingUrl");

-- CreateIndex
CREATE INDEX "sources_organizationId_idx" ON "sources"("organizationId");

-- CreateIndex
CREATE INDEX "sources_active_priority_idx" ON "sources"("active", "priority");

-- CreateIndex
CREATE INDEX "source_checks_sourceId_startedAt_idx" ON "source_checks"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "source_checks_pipelineRunId_idx" ON "source_checks"("pipelineRunId");

-- CreateIndex
CREATE INDEX "pipeline_runs_startedAt_idx" ON "pipeline_runs"("startedAt");

-- CreateIndex
CREATE INDEX "pipeline_errors_resolvedAt_nextRetryAt_idx" ON "pipeline_errors"("resolvedAt", "nextRetryAt");

-- CreateIndex
CREATE INDEX "pipeline_errors_sourceId_idx" ON "pipeline_errors"("sourceId");

-- CreateIndex
CREATE INDEX "document_versions_checksum_idx" ON "document_versions"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_notices_slug_key" ON "recruitment_notices"("slug");

-- CreateIndex
CREATE INDEX "recruitment_notices_status_idx" ON "recruitment_notices"("status");

-- CreateIndex
CREATE INDEX "recruitment_notices_noticeType_idx" ON "recruitment_notices"("noticeType");

-- CreateIndex
CREATE INDEX "recruitment_notices_recruitmentId_idx" ON "recruitment_notices"("recruitmentId");

-- CreateIndex
CREATE INDEX "recruitment_notices_organizationId_idx" ON "recruitment_notices"("organizationId");

-- CreateIndex
CREATE INDEX "recruitment_notices_sourceUrl_idx" ON "recruitment_notices"("sourceUrl");

-- CreateIndex
CREATE INDEX "recruitment_notices_canonicalUrl_idx" ON "recruitment_notices"("canonicalUrl");

-- CreateIndex
CREATE INDEX "recruitment_notices_createdAt_idx" ON "recruitment_notices"("createdAt");

-- CreateIndex
CREATE INDEX "admit_cards_recruitmentId_idx" ON "admit_cards"("recruitmentId");

-- CreateIndex
CREATE INDEX "answer_keys_recruitmentId_idx" ON "answer_keys"("recruitmentId");

-- CreateIndex
CREATE INDEX "documents_sourceId_idx" ON "documents"("sourceId");

-- CreateIndex
CREATE INDEX "documents_checksum_idx" ON "documents"("checksum");

-- CreateIndex
CREATE INDEX "jobs_recruitmentId_idx" ON "jobs"("recruitmentId");

-- CreateIndex
CREATE INDEX "notifications_recruitmentNoticeId_idx" ON "notifications"("recruitmentNoticeId");

-- CreateIndex
CREATE INDEX "organizations_stateId_idx" ON "organizations"("stateId");

-- CreateIndex
CREATE INDEX "organizations_parentId_idx" ON "organizations"("parentId");

-- CreateIndex
CREATE INDEX "results_recruitmentId_idx" ON "results"("recruitmentId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admit_cards" ADD CONSTRAINT "admit_cards_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_keys" ADD CONSTRAINT "answer_keys_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recruitmentNoticeId_fkey" FOREIGN KEY ("recruitmentNoticeId") REFERENCES "recruitment_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_aliases" ADD CONSTRAINT "organization_aliases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_aliases" ADD CONSTRAINT "exam_aliases_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitments" ADD CONSTRAINT "recruitments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitments" ADD CONSTRAINT "recruitments_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_categories" ADD CONSTRAINT "recruitment_categories_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_categories" ADD CONSTRAINT "recruitment_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_checks" ADD CONSTRAINT "source_checks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_checks" ADD CONSTRAINT "source_checks_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "recruitment_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_notices" ADD CONSTRAINT "recruitment_notices_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "recruitment_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data backfill (additive, idempotent): map existing content into the new
-- Recruitment-centred model without duplicating anything.
-- ---------------------------------------------------------------------------

-- One Recruitment per existing Exam, carrying the exam's own dates/status.
INSERT INTO "recruitments" ("id","title","slug","status","publishedAt","applicationStartDate","applicationEndDate","examDate","isAutoCreated","createdBy","createdAt","updatedAt","organizationId","examId")
SELECT 'rec_' || e."id", e."title", e."slug", e."status", e."publishedAt", e."applicationStartDate", e."applicationEndDate", e."examDate", false, e."createdBy", e."createdAt", NOW(), e."organizationId", e."id"
FROM "exams" e
WHERE NOT EXISTS (SELECT 1 FROM "recruitments" r WHERE r."examId" = e."id");

-- The exam's single category becomes the recruitment's primary category.
INSERT INTO "recruitment_categories" ("recruitmentId","categoryId","isPrimary")
SELECT r."id", e."categoryId", true
FROM "recruitments" r JOIN "exams" e ON e."id" = r."examId"
ON CONFLICT DO NOTHING;

-- Existing content rows now point at their recruitment directly.
UPDATE "jobs" j SET "recruitmentId" = r."id" FROM "recruitments" r WHERE r."examId" = j."examId" AND j."recruitmentId" IS NULL;
UPDATE "results" x SET "recruitmentId" = r."id" FROM "recruitments" r WHERE r."examId" = x."examId" AND x."recruitmentId" IS NULL;
UPDATE "admit_cards" x SET "recruitmentId" = r."id" FROM "recruitments" r WHERE r."examId" = x."examId" AND x."recruitmentId" IS NULL;
UPDATE "answer_keys" x SET "recruitmentId" = r."id" FROM "recruitments" r WHERE r."examId" = x."examId" AND x."recruitmentId" IS NULL;

-- Every existing name is its own first alias, so the resolver can match
-- it from day one. normalized = lowercase alphanumerics only.
INSERT INTO "organization_aliases" ("id","organizationId","alias","normalized","createdAt")
SELECT 'oal_' || o."id", o."id", o."name", lower(regexp_replace(o."name", '[^A-Za-z0-9]', '', 'g')), NOW()
FROM "organizations" o
ON CONFLICT ("normalized") DO NOTHING;

INSERT INTO "exam_aliases" ("id","examId","alias","normalized","createdAt")
SELECT 'eal_' || e."id", e."id", e."title", lower(regexp_replace(e."title", '[^A-Za-z0-9]', '', 'g')), NOW()
FROM "exams" e
ON CONFLICT ("normalized") DO NOTHING;
