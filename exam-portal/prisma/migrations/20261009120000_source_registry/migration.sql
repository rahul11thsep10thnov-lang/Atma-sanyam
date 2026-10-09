-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('CENTRAL', 'BANKING', 'RAILWAY', 'STATE', 'DEFENCE', 'EDUCATION', 'OTHER_GOVT', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "SourceApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NoticeType" ADD VALUE 'APPLICATION_STARTED';
ALTER TYPE "NoticeType" ADD VALUE 'CORRECTION_WINDOW';

-- AlterEnum
ALTER TYPE "SourceType" ADD VALUE 'ATOM';

-- AlterTable
ALTER TABLE "recruitment_notices" ADD COLUMN     "discoveredViaUrl" TEXT,
ADD COLUMN     "sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stateCode" TEXT;

-- AlterTable
ALTER TABLE "source_checks" ADD COLUMN     "diagnostics" JSONB,
ADD COLUMN     "duplicatesSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "noticesExtracted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "pagesFetched" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "alertedAt" TIMESTAMP(3),
ADD COLUMN     "approvalStatus" "SourceApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "blockedUntil" TIMESTAMP(3),
ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "category" "SourceCategory" NOT NULL DEFAULT 'CENTRAL',
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discoveredFromId" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "isAggregator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastDurationMs" INTEGER,
ADD COLUMN     "lastExtractionAt" TIMESTAMP(3),
ADD COLUMN     "lastHttpStatus" INTEGER,
ADD COLUMN     "lastOutcome" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "minRequestIntervalMs" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3),
ADD COLUMN     "noticesInserted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paginationConfig" JSONB,
ADD COLUMN     "parserConfig" JSONB,
ADD COLUMN     "requestTimeoutMs" INTEGER NOT NULL DEFAULT 20000,
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verificationStatus" "SourceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE INDEX "recruitment_notices_sections_idx" ON "recruitment_notices" USING GIN ("sections");

-- CreateIndex
CREATE INDEX "recruitment_notices_stateCode_idx" ON "recruitment_notices"("stateCode");

-- CreateIndex
CREATE INDEX "recruitment_notices_sourceId_sourcePublishedAt_idx" ON "recruitment_notices"("sourceId", "sourcePublishedAt");

-- CreateIndex
CREATE INDEX "recruitment_notices_sourcePublishedAt_idx" ON "recruitment_notices"("sourcePublishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sources_canonicalUrl_key" ON "sources"("canonicalUrl");

-- CreateIndex
CREATE INDEX "sources_category_stateCode_idx" ON "sources"("category", "stateCode");

-- CreateIndex
CREATE INDEX "sources_approvalStatus_idx" ON "sources"("approvalStatus");

-- CreateIndex
CREATE INDEX "sources_active_nextCheckAt_idx" ON "sources"("active", "nextCheckAt");

-- CreateIndex
CREATE INDEX "sources_groupName_idx" ON "sources"("groupName");

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_discoveredFromId_fkey" FOREIGN KEY ("discoveredFromId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: existing sources keep their URL as the canonical key (the app
-- normalises on every later write), and existing notices get sections
-- derived from their type so the public section pages work immediately.
UPDATE "sources" SET "canonicalUrl" = regexp_replace(regexp_replace("listingUrl", '^[a-zA-Z]+://(www\.)?', ''), '(.)/$', '\1') WHERE "canonicalUrl" IS NULL;
UPDATE "sources" SET "nextCheckAt" = COALESCE("lastCheckedAt", CURRENT_TIMESTAMP) WHERE "nextCheckAt" IS NULL;
UPDATE "recruitment_notices" SET "sections" = CASE "noticeType"::text
  WHEN 'JOB' THEN ARRAY['LATEST_JOBS']
  WHEN 'ADMIT_CARD' THEN ARRAY['ADMIT_CARDS']
  WHEN 'ANSWER_KEY' THEN ARRAY['ANSWER_KEYS']
  WHEN 'RESULT' THEN ARRAY['RESULTS']
  WHEN 'MERIT_LIST' THEN ARRAY['MERIT_LISTS','RESULTS']
  WHEN 'SELECTION_LIST' THEN ARRAY['MERIT_LISTS','RESULTS']
  WHEN 'INTERVIEW' THEN ARRAY['INTERVIEW_NOTICES']
  WHEN 'EXAM_DATE' THEN ARRAY['EXAM_DATES']
  WHEN 'EXAM_POSTPONED' THEN ARRAY['EXAM_DATES']
  WHEN 'DEADLINE_EXTENSION' THEN ARRAY['LATEST_JOBS']
  ELSE ARRAY['OTHER_NOTICES'] END
WHERE cardinality("sections") = 0;
