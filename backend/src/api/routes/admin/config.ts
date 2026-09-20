import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler } from "../../../middleware/errorHandler";
import { getThresholds, setThreshold } from "../../../pipeline/thresholds";
import { logAdminAction } from "../../../lib/auditLog";

export const adminConfigRouter = Router();

adminConfigRouter.get(
  "/thresholds",
  asyncHandler(async (_req, res) => {
    res.json({ thresholds: await getThresholds(prisma) });
  })
);

const thresholdUpdateSchema = z.object({
  minFamilyRelevanceScore: z.number().min(0).max(100).optional(),
  minVideoSuitabilityScore: z.number().min(0).max(100).optional(),
  minQualityScore: z.number().min(0).max(100).optional(),
  autoPublishEnabled: z.boolean().optional(),
});

adminConfigRouter.put(
  "/thresholds",
  asyncHandler(async (req, res) => {
    const body = thresholdUpdateSchema.parse(req.body);
    if (body.minFamilyRelevanceScore !== undefined) await setThreshold(prisma, "MIN_FAMILY_RELEVANCE_SCORE", String(body.minFamilyRelevanceScore));
    if (body.minVideoSuitabilityScore !== undefined) await setThreshold(prisma, "MIN_VIDEO_SUITABILITY_SCORE", String(body.minVideoSuitabilityScore));
    if (body.minQualityScore !== undefined) await setThreshold(prisma, "MIN_QUALITY_SCORE", String(body.minQualityScore));
    if (body.autoPublishEnabled !== undefined) await setThreshold(prisma, "AUTO_PUBLISH_ENABLED", String(body.autoPublishEnabled));

    await logAdminAction(prisma, req.admin!.adminUserId, "UPDATE_THRESHOLDS", "PipelineConfig", "singleton", body);
    res.json({ thresholds: await getThresholds(prisma) });
  })
);

adminConfigRouter.put(
  "/languages/:code",
  asyncHandler(async (req, res) => {
    const { isEnabled } = z.object({ isEnabled: z.boolean() }).parse(req.body);
    const language = await prisma.language.update({ where: { code: req.params.code }, data: { isEnabled } });
    await logAdminAction(prisma, req.admin!.adminUserId, "TOGGLE_LANGUAGE", "Language", req.params.code, { isEnabled });
    res.json({ language });
  })
);
