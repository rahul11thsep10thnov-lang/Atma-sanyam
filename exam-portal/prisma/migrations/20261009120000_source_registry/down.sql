-- Manual rollback for 20261009120000_source_registry (Prisma has no down
-- migrations; run with psql, then delete the row for this migration from
-- "_prisma_migrations"). PostgreSQL cannot drop enum values, so the added
-- NoticeType/SourceType values stay; nothing in the old code reads them.
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_discoveredFromId_fkey";
DROP INDEX IF EXISTS "sources_groupName_idx";
DROP INDEX IF EXISTS "sources_active_nextCheckAt_idx";
DROP INDEX IF EXISTS "sources_approvalStatus_idx";
DROP INDEX IF EXISTS "sources_category_stateCode_idx";
DROP INDEX IF EXISTS "sources_canonicalUrl_key";
DROP INDEX IF EXISTS "recruitment_notices_sourcePublishedAt_idx";
DROP INDEX IF EXISTS "recruitment_notices_sourceId_sourcePublishedAt_idx";
DROP INDEX IF EXISTS "recruitment_notices_stateCode_idx";
DROP INDEX IF EXISTS "recruitment_notices_sections_idx";
ALTER TABLE "sources" DROP COLUMN "alertedAt", DROP COLUMN "approvalStatus", DROP COLUMN "blockedUntil",
  DROP COLUMN "canonicalUrl", DROP COLUMN "category", DROP COLUMN "consecutiveFailures", DROP COLUMN "discoveredFromId",
  DROP COLUMN "groupName", DROP COLUMN "isAggregator", DROP COLUMN "lastDurationMs", DROP COLUMN "lastExtractionAt",
  DROP COLUMN "lastHttpStatus", DROP COLUMN "lastOutcome", DROP COLUMN "lastVerifiedAt", DROP COLUMN "lockedBy",
  DROP COLUMN "lockedUntil", DROP COLUMN "minRequestIntervalMs", DROP COLUMN "nextCheckAt", DROP COLUMN "noticesInserted",
  DROP COLUMN "paginationConfig", DROP COLUMN "parserConfig", DROP COLUMN "requestTimeoutMs", DROP COLUMN "stateCode",
  DROP COLUMN "verificationNote", DROP COLUMN "verificationStatus";
ALTER TABLE "source_checks" DROP COLUMN "diagnostics", DROP COLUMN "duplicatesSkipped", DROP COLUMN "durationMs",
  DROP COLUMN "noticesExtracted", DROP COLUMN "outcome", DROP COLUMN "pagesFetched";
ALTER TABLE "recruitment_notices" DROP COLUMN "discoveredViaUrl", DROP COLUMN "sections", DROP COLUMN "stateCode";
DROP TYPE "SourceVerificationStatus";
DROP TYPE "SourceApprovalStatus";
DROP TYPE "SourceCategory";
