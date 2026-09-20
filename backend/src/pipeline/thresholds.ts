import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

export interface PipelineThresholds {
  minFamilyRelevanceScore: number;
  minVideoSuitabilityScore: number;
  minQualityScore: number;
  autoPublishEnabled: boolean;
}

/**
 * Thresholds are admin-configurable at runtime (spec §13/§24 — "Allow
 * administrators to change the threshold") via PipelineConfig rows, with
 * env vars as the initial default/fallback.
 */
export async function getThresholds(prisma: PrismaClient): Promise<PipelineThresholds> {
  const rows = await prisma.pipelineConfig.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    minFamilyRelevanceScore: Number(map.get("MIN_FAMILY_RELEVANCE_SCORE") ?? env.thresholds.minFamilyRelevanceScore),
    minVideoSuitabilityScore: Number(map.get("MIN_VIDEO_SUITABILITY_SCORE") ?? env.thresholds.minVideoSuitabilityScore),
    minQualityScore: Number(map.get("MIN_QUALITY_SCORE") ?? env.thresholds.minQualityScore),
    autoPublishEnabled: (map.get("AUTO_PUBLISH_ENABLED") ?? String(env.thresholds.autoPublishEnabled)) === "true",
  };
}

export async function setThreshold(prisma: PrismaClient, key: string, value: string): Promise<void> {
  await prisma.pipelineConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
