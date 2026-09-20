-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('NEWS_API', 'RSS', 'LICENSED_FEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "PrimaryCategory" AS ENUM ('FAMILY_DISPUTE', 'HUSBAND_WIFE', 'IN_LAWS', 'SIBLING_DISPUTE', 'PARENT_CHILD', 'PROPERTY_INHERITANCE', 'DOMESTIC_CONFLICT', 'FAMILY_CRIME', 'FAMILY_MURDER', 'FAMILY_MISSING_PERSON', 'FAMILY_KIDNAPPING', 'FAMILY_FRAUD', 'NEIGHBOUR_DISPUTE', 'OTHER_HUMAN_INTEREST', 'NOT_RELEVANT');

-- CreateEnum
CREATE TYPE "DedupStatus" AS ENUM ('UNPROCESSED', 'NEW_MASTER_STORY', 'MERGED_INTO_EXISTING', 'DISCARDED_NOT_RELEVANT', 'DISCARDED_INSUFFICIENT_INFO', 'DISCARDED_DUPLICATE_LOW_VALUE');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('COLLECTED', 'AI_CLASSIFIED', 'DUPLICATE_CHECKED', 'QUALITY_CHECKED', 'SCRIPT_GENERATED', 'SAFETY_CHECKED', 'PENDING_REVIEW', 'APPROVED', 'VIDEO_GENERATED', 'PUBLISHED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'SAFETY_CHECKED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubtitleFormat" AS ENUM ('SRT', 'VTT');

-- CreateEnum
CREATE TYPE "RenderStatus" AS ENUM ('PENDING', 'RENDERING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FACTUALLY_INCORRECT', 'OFFENSIVE', 'PRIVACY_CONCERN', 'DUPLICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('EDITOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('APPROVE', 'REJECT', 'EDIT', 'REGENERATE_SCRIPT', 'REGENERATE_AUDIO', 'REGENERATE_VIDEO', 'REMOVE_VIDEO', 'CHANGE_CATEGORY', 'CORRECT_METADATA');

-- CreateTable
CREATE TABLE "Language" (
    "code" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepageUrl" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "providerKey" TEXT NOT NULL,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 60,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "licenseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawArticle" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawSummary" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dedupStatus" "DedupStatus" NOT NULL DEFAULT 'UNPROCESSED',
    "familyRelevanceScore" INTEGER,
    "primaryCategory" "PrimaryCategory",
    "suitabilityScore" INTEGER,
    "rejectionReason" TEXT,

    CONSTRAINT "RawArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterStory" (
    "id" TEXT NOT NULL,
    "masterStoryHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" "PrimaryCategory" NOT NULL,
    "eventDate" TIMESTAMP(3),
    "locationId" TEXT,
    "peopleInvolved" JSONB NOT NULL,
    "relationships" JSONB NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "background" TEXT,
    "policeAction" TEXT,
    "legalStatus" TEXT,
    "currentStatus" TEXT,
    "familyRelevanceScore" INTEGER NOT NULL DEFAULT 0,
    "suitabilityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'COLLECTED',
    "rejectionReason" TEXT,
    "autoPublishEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorySource" (
    "id" TEXT NOT NULL,
    "masterStoryId" TEXT NOT NULL,
    "rawArticleId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryScript" (
    "id" TEXT NOT NULL,
    "masterStoryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "people" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "sequence" TEXT NOT NULL,
    "authorities" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "sourceAttribution" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "estimatedDurationSeconds" INTEGER NOT NULL,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "safetyFlags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryTranslation" (
    "id" TEXT NOT NULL,
    "masterStoryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "localizedTitle" TEXT NOT NULL,
    "localizedSummary" TEXT NOT NULL,
    "storyScriptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "storyScriptId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleAsset" (
    "id" TEXT NOT NULL,
    "storyScriptId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "format" "SubtitleFormat" NOT NULL DEFAULT 'VTT',
    "storageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubtitleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "masterStoryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "storageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "resolution" TEXT NOT NULL DEFAULT '1080x1920',
    "templateVersion" TEXT NOT NULL DEFAULT 'v1',
    "renderStatus" "RenderStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "email" TEXT,
    "preferredLanguageCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categories" "PrimaryCategory"[],
    "states" TEXT[],
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "View" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "videoAssetId" TEXT NOT NULL,
    "watchSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "View_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "videoAssetId" TEXT NOT NULL,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Save" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Save_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "videoAssetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminReview" (
    "id" TEXT NOT NULL,
    "masterStoryId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_providerKey_key" ON "NewsSource"("providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "Location_state_district_city_key" ON "Location"("state", "district", "city");

-- CreateIndex
CREATE INDEX "RawArticle_dedupStatus_idx" ON "RawArticle"("dedupStatus");

-- CreateIndex
CREATE INDEX "RawArticle_publishedAt_idx" ON "RawArticle"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawArticle_sourceId_externalId_key" ON "RawArticle"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterStory_masterStoryHash_key" ON "MasterStory"("masterStoryHash");

-- CreateIndex
CREATE INDEX "MasterStory_pipelineStatus_idx" ON "MasterStory"("pipelineStatus");

-- CreateIndex
CREATE INDEX "MasterStory_eventType_idx" ON "MasterStory"("eventType");

-- CreateIndex
CREATE INDEX "MasterStory_familyRelevanceScore_idx" ON "MasterStory"("familyRelevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "StorySource_masterStoryId_rawArticleId_key" ON "StorySource"("masterStoryId", "rawArticleId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryScript_masterStoryId_languageCode_version_key" ON "StoryScript"("masterStoryId", "languageCode", "version");

-- CreateIndex
CREATE UNIQUE INDEX "StoryTranslation_masterStoryId_languageCode_key" ON "StoryTranslation"("masterStoryId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "AudioAsset_storyScriptId_languageCode_key" ON "AudioAsset"("storyScriptId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "SubtitleAsset_storyScriptId_languageCode_format_key" ON "SubtitleAsset"("storyScriptId", "languageCode", "format");

-- CreateIndex
CREATE INDEX "VideoAsset_renderStatus_idx" ON "VideoAsset"("renderStatus");

-- CreateIndex
CREATE INDEX "VideoAsset_publishedAt_idx" ON "VideoAsset"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_masterStoryId_languageCode_key" ON "VideoAsset"("masterStoryId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_fcmToken_key" ON "DeviceToken"("fcmToken");

-- CreateIndex
CREATE INDEX "View_videoAssetId_idx" ON "View"("videoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_videoAssetId_key" ON "Like"("userId", "videoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Save_userId_videoAssetId_key" ON "Save"("userId", "videoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entity_entityId_idx" ON "AdminAuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "RawArticle" ADD CONSTRAINT "RawArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterStory" ADD CONSTRAINT "MasterStory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySource" ADD CONSTRAINT "StorySource_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySource" ADD CONSTRAINT "StorySource_rawArticleId_fkey" FOREIGN KEY ("rawArticleId") REFERENCES "RawArticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySource" ADD CONSTRAINT "StorySource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryScript" ADD CONSTRAINT "StoryScript_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryScript" ADD CONSTRAINT "StoryScript_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTranslation" ADD CONSTRAINT "StoryTranslation_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTranslation" ADD CONSTRAINT "StoryTranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTranslation" ADD CONSTRAINT "StoryTranslation_storyScriptId_fkey" FOREIGN KEY ("storyScriptId") REFERENCES "StoryScript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_storyScriptId_fkey" FOREIGN KEY ("storyScriptId") REFERENCES "StoryScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleAsset" ADD CONSTRAINT "SubtitleAsset_storyScriptId_fkey" FOREIGN KEY ("storyScriptId") REFERENCES "StoryScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleAsset" ADD CONSTRAINT "SubtitleAsset_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferredLanguageCode_fkey" FOREIGN KEY ("preferredLanguageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReview" ADD CONSTRAINT "AdminReview_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReview" ADD CONSTRAINT "AdminReview_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
