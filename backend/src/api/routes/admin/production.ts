import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler } from "../../../middleware/errorHandler";
import { requireSuperAdmin } from "../../../middleware/auth";
import { ProductionService } from "../../../studio/production/productionService";

/**
 * Cinematic production admin API (mounted at /admin/production):
 * story → episode → scene → shot navigation, Shot Inspector, asset library,
 * model registry, jobs, GPU workers and metrics.
 */
export const adminProductionRouter = Router();
const service = new ProductionService(prisma);
const id = z.string().min(1).max(64);

adminProductionRouter.get("/stories/:storyId", asyncHandler(async (req, res) => res.json(await service.production(id.parse(req.params.storyId)))));
adminProductionRouter.get("/shots/:shotId", asyncHandler(async (req, res) => res.json(await service.shot(id.parse(req.params.shotId)))));
adminProductionRouter.put("/shots/:shotId/overrides", asyncHandler(async (req, res) => res.json(await service.updateShotOverrides(id.parse(req.params.shotId), req.body ?? {}, req.admin!.adminUserId))));
adminProductionRouter.post(
  "/shots/:shotId/preview",
  asyncHandler(async (req, res) => {
    const body = z.object({ t: z.number().min(0).max(600).optional(), overrides: z.unknown().optional() }).parse(req.body ?? {});
    const png = await service.previewFrame(id.parse(req.params.shotId), body);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  })
);
adminProductionRouter.post("/shots/:shotId/rerender", asyncHandler(async (req, res) => res.status(202).json({ job: await service.rerenderShot(id.parse(req.params.shotId), req.admin!.adminUserId) })));

// ---- asset library ----
adminProductionRouter.get(
  "/assets",
  asyncHandler(async (req, res) => {
    const q = z.object({ role: z.string().max(40).optional(), status: z.string().max(20).optional(), placeholder: z.enum(["true", "false"]).optional(), storyId: id.optional() }).parse(req.query);
    res.json({ assets: await service.listAssets({ role: q.role, status: q.status, placeholder: q.placeholder === undefined ? undefined : q.placeholder === "true", storyId: q.storyId }) });
  })
);
adminProductionRouter.post("/assets/:assetId/approve", asyncHandler(async (req, res) => res.json({ asset: await service.approveAsset(id.parse(req.params.assetId), req.admin!.adminUserId) })));
adminProductionRouter.post(
  "/assets/:assetId/reject",
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().min(3).max(500) }).parse(req.body ?? {});
    res.json({ asset: await service.rejectAsset(id.parse(req.params.assetId), req.admin!.adminUserId, reason) });
  })
);
adminProductionRouter.post(
  "/assets/:assetId/regenerate",
  asyncHandler(async (req, res) => {
    const { prompt } = z.object({ prompt: z.string().min(5).max(2000).optional() }).parse(req.body ?? {});
    res.status(202).json({ asset: await service.regenerateAsset(id.parse(req.params.assetId), req.admin!.adminUserId, { prompt }) });
  })
);
adminProductionRouter.post(
  "/assets/:assetId/replace",
  requireSuperAdmin,
  express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "25mb" }),
  asyncHandler(async (req, res) => {
    const q = z.object({ license: z.string().min(3).max(200), commercialUse: z.enum(["true", "false"]) }).parse(req.query);
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return void res.status(400).json({ error: "Send the image as the request body" });
    res.json({ asset: await service.replaceAsset(id.parse(req.params.assetId), req.admin!.adminUserId, req.body, { license: q.license, commercialUse: q.commercialUse === "true" }) });
  })
);
adminProductionRouter.post(
  "/assets/:assetId/inpaint",
  express.raw({ type: ["image/png"], limit: "15mb" }),
  asyncHandler(async (req, res) => {
    const prompt = typeof req.query.prompt === "string" ? req.query.prompt.slice(0, 500) : undefined;
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return void res.status(400).json({ error: "Send the mask PNG (white = fill) as the request body" });
    res.status(202).json({ job: await service.inpaintAsset(id.parse(req.params.assetId), req.admin!.adminUserId, req.body, prompt) });
  })
);

// ---- model registry ----
adminProductionRouter.get("/models", asyncHandler(async (_req, res) => res.json({ models: await service.models() })));
adminProductionRouter.put(
  "/models/:modelId",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const patch = z.object({ enabled: z.boolean().optional(), isDefault: z.boolean().optional(), endpoint: z.string().url().max(300).nullable().optional(), config: z.record(z.unknown()).optional() }).strict().parse(req.body ?? {});
    res.json({ model: await service.updateModel(z.string().max(100).parse(req.params.modelId), patch, req.admin!.adminUserId) });
  })
);
adminProductionRouter.post(
  "/models/:modelId/override",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const body = z.object({ approved: z.boolean(), reason: z.string().max(1000).default("") }).parse(req.body ?? {});
    const admin = await prisma.adminUser.findUnique({ where: { id: req.admin!.adminUserId }, select: { email: true } });
    res.json({ model: await service.overrideModel(z.string().max(100).parse(req.params.modelId), body, { adminUserId: req.admin!.adminUserId, label: admin?.email ?? req.admin!.adminUserId }) });
  })
);

// ---- jobs, workers, metrics, profiles ----
adminProductionRouter.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    const q = z.object({ queue: z.string().max(40).optional(), status: z.string().max(20).optional(), type: z.string().max(40).optional(), storyId: id.optional() }).parse(req.query);
    res.json({ jobs: await service.jobs(q) });
  })
);
adminProductionRouter.post("/jobs/:jobId/cancel", asyncHandler(async (req, res) => res.json({ job: await service.cancel(id.parse(req.params.jobId), req.admin!.adminUserId) })));
adminProductionRouter.post("/jobs/:jobId/retry", asyncHandler(async (req, res) => res.json({ job: await service.retry(id.parse(req.params.jobId), req.admin!.adminUserId) })));
adminProductionRouter.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    const hours = Math.max(1, Math.min(24 * 30, Number(req.query.hours ?? 24) || 24));
    res.json(await service.metrics(hours));
  })
);
adminProductionRouter.get("/render-profiles", asyncHandler(async (_req, res) => res.json({ profiles: service.renderProfiles() })));
