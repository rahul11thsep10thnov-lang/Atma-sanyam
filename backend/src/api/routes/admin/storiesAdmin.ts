import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler, HttpError } from "../../../middleware/errorHandler";
import { PipelineOrchestrator } from "../../../pipeline/PipelineOrchestrator";
import { enqueuePublishLanguage, enqueueGenerateScript } from "../../../queue/queues";
import { logAdminAction } from "../../../lib/auditLog";
import { MVP_FULLY_WIRED_LANGUAGES } from "../../../data/languages";
import { PipelineStatus, PrimaryCategory } from "@prisma/client";

export const adminStoriesRouter = Router();
const orchestrator = new PipelineOrchestrator(prisma);

adminStoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as PipelineStatus | undefined;
    const stories = await prisma.masterStory.findMany({
      where: status ? { pipelineStatus: status } : undefined,
      include: { location: true, _count: { select: { storySources: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ stories });
  })
);

adminStoriesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const story = await prisma.masterStory.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        storySources: { include: { rawArticle: true, source: true } },
        scripts: { orderBy: { version: "desc" } },
        videoAssets: true,
        adminReviews: { include: { adminUser: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!story) throw new HttpError(404, "Story not found");
    res.json({ story });
  })
);

adminStoriesRouter.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body ?? {});
    await orchestrator.approve(req.params.id, req.admin!.adminUserId, notes);
    for (const languageCode of MVP_FULLY_WIRED_LANGUAGES) {
      await enqueuePublishLanguage({ masterStoryId: req.params.id, languageCode });
    }
    res.json({ ok: true });
  })
);

adminStoriesRouter.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body ?? {});
    await orchestrator.reject(req.params.id, req.admin!.adminUserId, notes);
    res.json({ ok: true });
  })
);

const editSchema = z.object({
  title: z.string().optional(),
  eventType: z.nativeEnum(PrimaryCategory).optional(),
  legalStatus: z.string().optional(),
  currentStatus: z.string().optional(),
});

adminStoriesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = editSchema.parse(req.body);
    const story = await prisma.masterStory.update({ where: { id: req.params.id }, data: body });
    await logAdminAction(prisma, req.admin!.adminUserId, "CORRECT_METADATA", "MasterStory", req.params.id, body);
    res.json({ story });
  })
);

adminStoriesRouter.post(
  "/:id/regenerate-script",
  asyncHandler(async (req, res) => {
    await enqueueGenerateScript({ masterStoryId: req.params.id });
    await logAdminAction(prisma, req.admin!.adminUserId, "REGENERATE_SCRIPT", "MasterStory", req.params.id);
    res.status(202).json({ ok: true, message: "Script regeneration queued" });
  })
);

const regenerateLangSchema = z.object({ languageCode: z.string() });

adminStoriesRouter.post(
  "/:id/regenerate-audio",
  asyncHandler(async (req, res) => {
    const { languageCode } = regenerateLangSchema.parse(req.body);
    await enqueuePublishLanguage({ masterStoryId: req.params.id, languageCode });
    await logAdminAction(prisma, req.admin!.adminUserId, "REGENERATE_AUDIO", "MasterStory", req.params.id, { languageCode });
    res.status(202).json({ ok: true, message: "Audio/video regeneration queued" });
  })
);

adminStoriesRouter.post(
  "/:id/regenerate-video",
  asyncHandler(async (req, res) => {
    const { languageCode } = regenerateLangSchema.parse(req.body);
    await enqueuePublishLanguage({ masterStoryId: req.params.id, languageCode });
    await logAdminAction(prisma, req.admin!.adminUserId, "REGENERATE_VIDEO", "MasterStory", req.params.id, { languageCode });
    res.status(202).json({ ok: true, message: "Video regeneration queued" });
  })
);

adminStoriesRouter.delete(
  "/:id/videos/:languageCode",
  asyncHandler(async (req, res) => {
    await prisma.videoAsset.update({
      where: { masterStoryId_languageCode: { masterStoryId: req.params.id, languageCode: req.params.languageCode } },
      data: { renderStatus: "PENDING", storageUrl: null, thumbnailUrl: null, publishedAt: null },
    });
    await logAdminAction(prisma, req.admin!.adminUserId, "REMOVE_VIDEO", "VideoAsset", req.params.id, { languageCode: req.params.languageCode });
    res.json({ ok: true });
  })
);
