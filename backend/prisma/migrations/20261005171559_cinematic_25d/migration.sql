-- CreateEnum
CREATE TYPE "ProductionMode" AS ENUM ('CLASSIC', 'CINEMATIC_25D');

-- CreateEnum
CREATE TYPE "ProductionState" AS ENUM ('DRAFT', 'PLANNED', 'ASSETS_REQUIRED', 'GENERATING_ASSETS', 'ASSETS_READY', 'DEPTH_READY', 'SHOT_READY', 'RENDERING', 'RENDERED', 'QC_PENDING', 'QC_FAILED', 'APPROVED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShotType" AS ENUM ('ESTABLISHING', 'WIDE', 'MEDIUM', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_SHOULDER', 'POV', 'TRACKING', 'LOW_ANGLE', 'HIGH_ANGLE', 'TOP_DOWN', 'INSERT', 'CUTAWAY');

-- CreateEnum
CREATE TYPE "MotionDecision" AS ENUM ('STATIC_2_5D', 'ENVIRONMENT_2_5D', 'CHARACTER_2_5D', 'LOCAL_I2V_REQUIRED');

-- CreateEnum
CREATE TYPE "LayerKind" AS ENUM ('BACKGROUND', 'MIDGROUND', 'CHARACTER', 'PROP', 'FOREGROUND');

-- CreateEnum
CREATE TYPE "LocationCategory" AS ENUM ('RAILWAY_STATION', 'RAILWAY_PLATFORM', 'BUS_STAND', 'POLICE_STATION', 'POLICE_BARRICADE', 'DISTRICT_HOSPITAL', 'GOVERNMENT_HOSPITAL', 'COURT', 'SCHOOL', 'COLLEGE', 'MARKET', 'TEMPLE', 'MOSQUE', 'GURUDWARA', 'CHURCH', 'AIRPORT', 'HIGHWAY', 'FARM', 'FACTORY', 'OFFICE', 'GOVERNMENT_BUILDING', 'METRO_STATION', 'RIVERBANK', 'MOUNTAIN_VILLAGE', 'URBAN_STREET', 'VILLAGE_ROAD', 'RESIDENTIAL_COLONY', 'POLICE_HEADQUARTERS', 'FIRE_STATION', 'TRAIN', 'BUS', 'AMBULANCE', 'HOME_INTERIOR', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "ProductionAssetKind" AS ENUM ('IMAGE', 'RIG', 'MASK', 'DEPTH', 'LIGHTING_MAP', 'SHADOW_MAP', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "AssetLifecycle" AS ENUM ('REQUIRED', 'GENERATING', 'READY', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiTask" AS ENUM ('IMAGE_GENERATION', 'SEGMENTATION', 'DEPTH', 'INPAINTING', 'UPSCALE', 'VIDEO_GENERATION');

-- CreateEnum
CREATE TYPE "GpuWorkerStatus" AS ENUM ('ONLINE', 'BUSY', 'DRAINING', 'OFFLINE');

-- AlterEnum
ALTER TYPE "GenerationJobStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GenerationJobType" ADD VALUE 'PLAN_SHOTS';
ALTER TYPE "GenerationJobType" ADD VALUE 'GENERATE_LAYER_ASSET';
ALTER TYPE "GenerationJobType" ADD VALUE 'GENERATE_MASK';
ALTER TYPE "GenerationJobType" ADD VALUE 'GENERATE_DEPTH';
ALTER TYPE "GenerationJobType" ADD VALUE 'INPAINT_ASSET';
ALTER TYPE "GenerationJobType" ADD VALUE 'BUILD_SCENE_PACKAGE';
ALTER TYPE "GenerationJobType" ADD VALUE 'RENDER_SHOT';
ALTER TYPE "GenerationJobType" ADD VALUE 'RENDER_SHOT_I2V';
ALTER TYPE "GenerationJobType" ADD VALUE 'ASSEMBLE_MASTER_VISUAL';
ALTER TYPE "GenerationJobType" ADD VALUE 'SHOT_QC';

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "characterRefId" TEXT;

-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "episodeId" TEXT,
ADD COLUMN     "gpuWorkerId" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "queue" TEXT,
ADD COLUMN     "shotId" TEXT,
ADD COLUMN     "timeoutMs" INTEGER;

-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "episodeId" TEXT;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "productionMode" "ProductionMode" NOT NULL DEFAULT 'CINEMATIC_25D';

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "masterScriptId" TEXT NOT NULL,
    "status" "ProductionState" NOT NULL DEFAULT 'DRAFT',
    "renderProfileKey" TEXT NOT NULL DEFAULT 'portrait-1080x1920-30',
    "emotionalArc" JSONB,
    "masterVisualAssetId" TEXT,
    "masterVisualHash" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "directorProvider" TEXT NOT NULL DEFAULT 'rule-based',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shots" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "shotNumber" INTEGER NOT NULL,
    "globalNumber" INTEGER NOT NULL,
    "shotType" "ShotType" NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "renderDurationSeconds" DOUBLE PRECISION,
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "visualStyle" TEXT NOT NULL,
    "viewerSees" TEXT NOT NULL,
    "emotionalPurpose" TEXT NOT NULL,
    "cameraMovement" TEXT NOT NULL,
    "camera" JSONB NOT NULL,
    "composition" JSONB NOT NULL,
    "locationRefId" TEXT,
    "characterIds" TEXT[],
    "characterRefIds" TEXT[],
    "propRefIds" TEXT[],
    "lightingProfile" JSONB NOT NULL,
    "environmentProfile" JSONB NOT NULL,
    "animationProfile" JSONB NOT NULL,
    "focusProfile" JSONB NOT NULL,
    "effectsProfile" JSONB NOT NULL,
    "dialogue" JSONB NOT NULL,
    "narration" TEXT NOT NULL,
    "sfx" JSONB NOT NULL,
    "music" TEXT,
    "depthMapAssetId" TEXT,
    "safetyLevel" "SafetyLevel" NOT NULL DEFAULT 'SAFE',
    "disclosure" TEXT NOT NULL DEFAULT 'VISUAL_RECONSTRUCTION',
    "seed" INTEGER NOT NULL,
    "overrides" JSONB,
    "motionDecision" "MotionDecision" NOT NULL DEFAULT 'STATIC_2_5D',
    "motionReason" TEXT NOT NULL DEFAULT '',
    "motionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedRenderer" TEXT NOT NULL DEFAULT 'engine25d',
    "status" "ProductionState" NOT NULL DEFAULT 'PLANNED',
    "renderStatus" "RenderStatus" NOT NULL DEFAULT 'PENDING',
    "planHash" TEXT NOT NULL,
    "currentPackageId" TEXT,
    "currentRenderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_layers" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "layerKey" TEXT NOT NULL,
    "kind" "LayerKind" NOT NULL,
    "name" TEXT NOT NULL,
    "zIndex" INTEGER NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "assetId" TEXT,
    "maskAssetId" TEXT,
    "placement" JSONB NOT NULL,
    "blend" TEXT NOT NULL DEFAULT 'normal',
    "lightResponse" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "castsShadow" BOOLEAN NOT NULL DEFAULT false,
    "silhouette" BOOLEAN NOT NULL DEFAULT false,
    "motion" JSONB,
    "characterId" TEXT,
    "characterRefId" TEXT,
    "propRefId" TEXT,
    "expression" TEXT,
    "pose" TEXT,
    "prompt" TEXT,
    "reuseDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "kind" "ProductionAssetKind" NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reuseKey" TEXT NOT NULL,
    "storyId" TEXT,
    "status" "AssetLifecycle" NOT NULL DEFAULT 'REQUIRED',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "storageKey" TEXT,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "hasAlpha" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "characterRefId" TEXT,
    "locationRefId" TEXT,
    "propRefId" TEXT,
    "sourceAssetId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_versions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "generator" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "commercialUse" BOOLEAN NOT NULL,
    "seed" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "references" JSONB NOT NULL,
    "gpuWorkerId" TEXT,
    "durationMs" INTEGER,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_packages" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "manifest" JSONB NOT NULL,
    "storagePrefix" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "issues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_renders" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "renderer" TEXT NOT NULL,
    "status" "RenderStatus" NOT NULL DEFAULT 'PENDING',
    "preview" BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL,
    "frames" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "inputsHash" TEXT NOT NULL,
    "packageId" TEXT,
    "renderMs" INTEGER,
    "qcReport" JSONB,
    "failureReason" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_references" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'UNKNOWN',
    "build" TEXT NOT NULL DEFAULT 'average',
    "skinTone" TEXT NOT NULL DEFAULT 'medium-brown',
    "hair" TEXT NOT NULL,
    "clothing" JSONB NOT NULL,
    "accessories" TEXT[],
    "occupation" TEXT,
    "voiceCode" TEXT,
    "styleKey" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "masterAssetId" TEXT,
    "rigAssetId" TEXT,
    "expressionAssets" JSONB,
    "poseAssets" JSONB,
    "referenceImages" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_references" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" "LocationCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "region" TEXT,
    "timeOfDay" TEXT NOT NULL,
    "styleKey" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "layerAssets" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prop_references" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "styleKey" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "assetId" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prop_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_profiles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "crf" INTEGER NOT NULL DEFAULT 20,
    "preset" TEXT NOT NULL DEFAULT 'medium',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "task" "AiTask" NOT NULL,
    "version" TEXT NOT NULL,
    "endpoint" TEXT,
    "workflow" TEXT,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "licenseVerifiedAt" TIMESTAMP(3),
    "licenseNotes" TEXT,
    "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "productionApproved" BOOLEAN NOT NULL DEFAULT false,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT false,
    "attributionText" TEXT,
    "redistributionNotes" TEXT,
    "localOnly" BOOLEAN NOT NULL DEFAULT true,
    "gpuRequirement" TEXT,
    "recommendedVramGb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 50,
    "speedScore" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "overrideApproved" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideBy" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpu_workers" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "gpuName" TEXT NOT NULL,
    "gpuIndex" INTEGER NOT NULL DEFAULT 0,
    "vramTotalGb" DOUBLE PRECISION NOT NULL,
    "vramFreeGb" DOUBLE PRECISION NOT NULL,
    "loadedModels" TEXT[],
    "queues" TEXT[],
    "endpoint" TEXT,
    "status" "GpuWorkerStatus" NOT NULL DEFAULT 'ONLINE',
    "runningJobs" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 1,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gpu_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "episodes_storyId_masterScriptId_episodeNumber_key" ON "episodes"("storyId", "masterScriptId", "episodeNumber");

-- CreateIndex
CREATE INDEX "shots_episodeId_globalNumber_idx" ON "shots"("episodeId", "globalNumber");

-- CreateIndex
CREATE INDEX "shots_status_idx" ON "shots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shots_sceneId_shotNumber_key" ON "shots"("sceneId", "shotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shot_layers_shotId_layerKey_key" ON "shot_layers"("shotId", "layerKey");

-- CreateIndex
CREATE INDEX "assets_reuseKey_status_idx" ON "assets"("reuseKey", "status");

-- CreateIndex
CREATE INDEX "assets_kind_role_idx" ON "assets"("kind", "role");

-- CreateIndex
CREATE INDEX "assets_storyId_idx" ON "assets"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_versions_assetId_version_key" ON "asset_versions"("assetId", "version");

-- CreateIndex
CREATE INDEX "scene_packages_contentHash_idx" ON "scene_packages"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "scene_packages_shotId_version_key" ON "scene_packages"("shotId", "version");

-- CreateIndex
CREATE INDEX "shot_renders_shotId_isCurrent_idx" ON "shot_renders"("shotId", "isCurrent");

-- CreateIndex
CREATE INDEX "shot_renders_inputsHash_idx" ON "shot_renders"("inputsHash");

-- CreateIndex
CREATE UNIQUE INDEX "character_references_key_key" ON "character_references"("key");

-- CreateIndex
CREATE UNIQUE INDEX "location_references_key_key" ON "location_references"("key");

-- CreateIndex
CREATE INDEX "location_references_category_idx" ON "location_references"("category");

-- CreateIndex
CREATE UNIQUE INDEX "prop_references_key_key" ON "prop_references"("key");

-- CreateIndex
CREATE UNIQUE INDEX "render_profiles_key_key" ON "render_profiles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_modelId_key" ON "ai_models"("modelId");

-- CreateIndex
CREATE INDEX "ai_models_task_enabled_idx" ON "ai_models"("task", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "gpu_workers_workerId_key" ON "gpu_workers"("workerId");

-- CreateIndex
CREATE INDEX "generation_jobs_shotId_idx" ON "generation_jobs"("shotId");

-- CreateIndex
CREATE INDEX "generation_jobs_queue_status_idx" ON "generation_jobs"("queue", "status");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_characterRefId_fkey" FOREIGN KEY ("characterRefId") REFERENCES "character_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_locationRefId_fkey" FOREIGN KEY ("locationRefId") REFERENCES "location_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_layers" ADD CONSTRAINT "shot_layers_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_layers" ADD CONSTRAINT "shot_layers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_layers" ADD CONSTRAINT "shot_layers_maskAssetId_fkey" FOREIGN KEY ("maskAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_packages" ADD CONSTRAINT "scene_packages_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_renders" ADD CONSTRAINT "shot_renders_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stories created before the 2.5D upgrade keep the classic renderer.
UPDATE "stories" SET "productionMode" = 'CLASSIC';
