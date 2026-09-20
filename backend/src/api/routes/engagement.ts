import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { optionalUserAuth, requireUserAuth } from "../../middleware/auth";
import { ReportReason } from "@prisma/client";

export const engagementRouter = Router();

const videoIdSchema = z.object({ videoAssetId: z.string() });

engagementRouter.post(
  "/view",
  optionalUserAuth,
  asyncHandler(async (req, res) => {
    const body = videoIdSchema.extend({ watchSeconds: z.number().min(0).default(0) }).parse(req.body);
    await prisma.view.create({ data: { userId: req.user?.userId, videoAssetId: body.videoAssetId, watchSeconds: body.watchSeconds } });
    res.status(201).json({ ok: true });
  })
);

engagementRouter.post(
  "/like",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const body = videoIdSchema.parse(req.body);
    await prisma.like.upsert({
      where: { userId_videoAssetId: { userId: req.user!.userId, videoAssetId: body.videoAssetId } },
      update: {},
      create: { userId: req.user!.userId, videoAssetId: body.videoAssetId },
    });
    res.status(201).json({ ok: true });
  })
);

engagementRouter.post(
  "/share",
  optionalUserAuth,
  asyncHandler(async (req, res) => {
    const body = videoIdSchema.extend({ channel: z.string().optional() }).parse(req.body);
    await prisma.share.create({ data: { userId: req.user?.userId, videoAssetId: body.videoAssetId, channel: body.channel } });
    res.status(201).json({ ok: true });
  })
);

engagementRouter.post(
  "/save",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const body = videoIdSchema.parse(req.body);
    await prisma.save.upsert({
      where: { userId_videoAssetId: { userId: req.user!.userId, videoAssetId: body.videoAssetId } },
      update: {},
      create: { userId: req.user!.userId, videoAssetId: body.videoAssetId },
    });
    res.status(201).json({ ok: true });
  })
);

engagementRouter.post(
  "/report",
  optionalUserAuth,
  asyncHandler(async (req, res) => {
    const body = videoIdSchema.extend({ reason: z.nativeEnum(ReportReason), notes: z.string().optional() }).parse(req.body);
    await prisma.report.create({ data: { userId: req.user?.userId, videoAssetId: body.videoAssetId, reason: body.reason, notes: body.notes } });
    res.status(201).json({ ok: true });
  })
);
