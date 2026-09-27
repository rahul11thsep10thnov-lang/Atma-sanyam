-- CreateEnum
CREATE TYPE "StudioStoryStatus" AS ENUM ('DRAFT', 'AI_REVIEW', 'ADMIN_REVIEW', 'APPROVED', 'RENDERED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StudioFormat" AS ENUM ('SHORT', 'LONG');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('NOT_RUN', 'PASSED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "FactType" AS ENUM ('PERSON_NAME', 'DATE', 'TIME', 'LOCATION', 'NUMBER', 'AGE', 'MONEY', 'ORGANIZATION', 'QUOTE', 'CLAIM', 'ALLEGATION', 'OFFICIAL_STATEMENT', 'EVENT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'REPORTED', 'ALLEGED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('DIRECT_QUOTE', 'REPORTED_STATEMENT', 'AI_NARRATION', 'RECONSTRUCTED_DIALOGUE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('CHILD', 'YOUNG', 'ADULT', 'ELDERLY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VoiceTone" AS ENUM ('NEUTRAL', 'WARM', 'AUTHORITATIVE');

-- CreateEnum
CREATE TYPE "ScriptKind" AS ENUM ('MASTER', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "StudioScriptStatus" AS ENUM ('DRAFT', 'AI_REVIEWED', 'APPROVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SafetyLevel" AS ENUM ('SAFE', 'SENSITIVE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'ANIMATION');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('NARRATION', 'DIALOGUE', 'AMBIENT', 'MUSIC', 'SFX', 'MIX');

-- CreateEnum
CREATE TYPE "StudioRenderKind" AS ENUM ('SINGLE_LANGUAGE', 'MULTI_AUDIO');

-- CreateEnum
CREATE TYPE "GenerationJobType" AS ENUM ('ANALYZE_ARTICLE', 'GENERATE_MASTER_SCRIPT', 'GENERATE_LANGUAGE_SCRIPT', 'AI_REVIEW', 'GENERATE_SCENE_VISUAL', 'GENERATE_VOICE', 'RENDER_LANGUAGE', 'RENDER_PACKAGE', 'FINAL_QC', 'PUBLISH');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('LLM', 'TRANSLATION', 'VOICE', 'IMAGE', 'VIDEO', 'MUSIC', 'STORAGE');

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "StudioStoryStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "StudioFormat" NOT NULL DEFAULT 'SHORT',
    "targetDurationSeconds" INTEGER NOT NULL DEFAULT 150,
    "animationStyle" TEXT NOT NULL DEFAULT 'flat-2d-editorial',
    "languages" TEXT[],
    "masterLanguage" TEXT NOT NULL DEFAULT 'en',
    "narratorVoiceCode" TEXT NOT NULL DEFAULT 'VOICE_08',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "locationText" TEXT,
    "state" TEXT,
    "district" TEXT,
    "contentWarnings" TEXT[],
    "allowDramatizedReconstruction" BOOLEAN NOT NULL DEFAULT false,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "sensitiveTopics" TEXT[],
    "styleBible" JSONB,
    "timeline" JSONB,
    "analysisSummary" JSONB,
    "qcStatus" "QcStatus" NOT NULL DEFAULT 'NOT_RUN',
    "qcReport" JSONB,
    "currentMasterScriptId" TEXT,
    "masterStoryId" TEXT,
    "createdByAdminId" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "cleanedText" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "images" JSONB,
    "characterNotes" TEXT,
    "sceneNotes" TEXT,
    "pronunciationGuide" JSONB,
    "contentHash" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facts" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "articleVersion" INTEGER NOT NULL,
    "type" "FactType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "sourceSentence" TEXT,
    "attributedTo" TEXT,
    "statementType" "StatementType",
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'REPORTED',
    "isKeyFact" BOOLEAN NOT NULL DEFAULT false,
    "timelineOrder" INTEGER,
    "adminEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "realName" TEXT,
    "role" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'UNKNOWN',
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isRealPerson" BOOLEAN NOT NULL DEFAULT true,
    "anonymized" BOOLEAN NOT NULL DEFAULT false,
    "speaks" BOOLEAN NOT NULL DEFAULT false,
    "appearance" JSONB,
    "pronunciations" JSONB,
    "adminEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "tone" "VoiceTone" NOT NULL DEFAULT 'NEUTRAL',
    "description" TEXT,
    "providerVoiceIds" JSONB NOT NULL,
    "settings" JSONB,
    "isNarratorEligible" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sampleUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_assignments" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "speakerKey" TEXT NOT NULL,
    "characterId" TEXT,
    "voiceId" TEXT NOT NULL,
    "lockedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "kind" "ScriptKind" NOT NULL,
    "languageCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "parentScriptId" TEXT,
    "status" "StudioScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "estimatedDurationSeconds" INTEGER NOT NULL,
    "lintFlags" JSONB,
    "contentHash" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "characters" TEXT[],
    "narratorText" TEXT NOT NULL,
    "dialogue" JSONB NOT NULL,
    "emotionalTone" TEXT NOT NULL,
    "cameraDirection" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "props" TEXT[],
    "animationRequirements" TEXT NOT NULL,
    "audioRequirements" JSONB NOT NULL,
    "contentRestrictions" TEXT[],
    "transition" TEXT NOT NULL,
    "onScreenText" TEXT,
    "safetyLevel" "SafetyLevel" NOT NULL DEFAULT 'SAFE',
    "safetyReasons" TEXT[],
    "visualHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visual_prompts" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "substituteReason" TEXT,
    "promptHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visual_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_assets" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "visualPromptId" TEXT,
    "kind" "AssetKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "storageKey" TEXT,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "promptHash" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "scriptId" TEXT,
    "trackType" "TrackType" NOT NULL,
    "provider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_segments" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "speakerKey" TEXT NOT NULL,
    "voiceCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVoiceId" TEXT,
    "text" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "startSeconds" DOUBLE PRECISION,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "cacheHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitles" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "renderId" TEXT,
    "format" "SubtitleFormat" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtitles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_projects" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "masterScriptId" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1920,
    "height" INTEGER NOT NULL DEFAULT 1080,
    "fps" INTEGER NOT NULL DEFAULT 25,
    "burnSubtitles" BOOLEAN NOT NULL DEFAULT false,
    "multiAudioPackage" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_renders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "languageCode" TEXT,
    "kind" "StudioRenderKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RenderStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "renderer" TEXT,
    "failureReason" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_safety" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sceneId" TEXT,
    "level" "SafetyLevel" NOT NULL,
    "reasons" TEXT[],
    "substitution" TEXT,
    "source" TEXT NOT NULL,
    "adminUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_safety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "license" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sound_effects" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "license" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sound_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "languageCode" TEXT,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "type" "GenerationJobType" NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'PENDING',
    "languageCode" TEXT,
    "sceneId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "dedupeKey" TEXT,
    "requestedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "key" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "settings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_cache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "articles_storyId_version_key" ON "articles"("storyId", "version");

-- CreateIndex
CREATE INDEX "facts_storyId_type_idx" ON "facts"("storyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "characters_storyId_key_key" ON "characters"("storyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "voices_code_key" ON "voices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "voice_assignments_storyId_speakerKey_key" ON "voice_assignments"("storyId", "speakerKey");

-- CreateIndex
CREATE INDEX "scripts_storyId_kind_languageCode_idx" ON "scripts"("storyId", "kind", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "scripts_storyId_kind_languageCode_version_key" ON "scripts"("storyId", "kind", "languageCode", "version");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_scriptId_sceneNumber_key" ON "scenes"("scriptId", "sceneNumber");

-- CreateIndex
CREATE INDEX "visual_prompts_promptHash_idx" ON "visual_prompts"("promptHash");

-- CreateIndex
CREATE INDEX "scene_assets_promptHash_kind_idx" ON "scene_assets"("promptHash", "kind");

-- CreateIndex
CREATE INDEX "audio_files_storyId_languageCode_trackType_idx" ON "audio_files"("storyId", "languageCode", "trackType");

-- CreateIndex
CREATE INDEX "audio_segments_cacheHash_idx" ON "audio_segments"("cacheHash");

-- CreateIndex
CREATE UNIQUE INDEX "audio_segments_scriptId_sceneNumber_lineIndex_key" ON "audio_segments"("scriptId", "sceneNumber", "lineIndex");

-- CreateIndex
CREATE INDEX "subtitles_storyId_languageCode_idx" ON "subtitles"("storyId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "video_projects_storyId_key" ON "video_projects"("storyId");

-- CreateIndex
CREATE INDEX "video_renders_storyId_languageCode_isCurrent_idx" ON "video_renders"("storyId", "languageCode", "isCurrent");

-- CreateIndex
CREATE INDEX "video_renders_inputsHash_idx" ON "video_renders"("inputsHash");

-- CreateIndex
CREATE INDEX "content_safety_storyId_idx" ON "content_safety"("storyId");

-- CreateIndex
CREATE INDEX "sound_effects_tag_idx" ON "sound_effects"("tag");

-- CreateIndex
CREATE INDEX "versions_storyId_entityType_idx" ON "versions"("storyId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_dedupeKey_key" ON "generation_jobs"("dedupeKey");

-- CreateIndex
CREATE INDEX "generation_jobs_storyId_createdAt_idx" ON "generation_jobs"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs"("status");

-- CreateIndex
CREATE INDEX "generation_logs_jobId_createdAt_idx" ON "generation_logs"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_kind_key_key" ON "provider_configs"("kind", "key");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_masterStoryId_fkey" FOREIGN KEY ("masterStoryId") REFERENCES "MasterStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facts" ADD CONSTRAINT "facts_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_assignments" ADD CONSTRAINT "voice_assignments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_assignments" ADD CONSTRAINT "voice_assignments_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_assignments" ADD CONSTRAINT "voice_assignments_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "voices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visual_prompts" ADD CONSTRAINT "visual_prompts_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_assets" ADD CONSTRAINT "scene_assets_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_assets" ADD CONSTRAINT "scene_assets_visualPromptId_fkey" FOREIGN KEY ("visualPromptId") REFERENCES "visual_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_segments" ADD CONSTRAINT "audio_segments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_renders" ADD CONSTRAINT "video_renders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "video_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_renders" ADD CONSTRAINT "video_renders_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_safety" ADD CONSTRAINT "content_safety_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
