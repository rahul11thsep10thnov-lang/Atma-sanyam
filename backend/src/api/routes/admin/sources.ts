import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler } from "../../../middleware/errorHandler";
import { logAdminAction } from "../../../lib/auditLog";
import { SourceType } from "@prisma/client";

export const adminSourcesRouter = Router();

adminSourcesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sources = await prisma.newsSource.findMany({ orderBy: { name: "asc" } });
    res.json({ sources });
  })
);

const createSourceSchema = z.object({
  name: z.string(),
  homepageUrl: z.string().url(),
  sourceType: z.nativeEnum(SourceType),
  providerKey: z.string(),
  reliabilityScore: z.number().min(0).max(100).default(60),
  licenseNotes: z.string().optional(),
});

// spec §24: "add news sources" — this registers the NewsSource row; the
// matching NewsSourceProvider implementation (see modules/news-ingestion)
// must exist/be registered separately for RSS/API providers.
adminSourcesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSourceSchema.parse(req.body);
    const source = await prisma.newsSource.create({ data: body });
    await logAdminAction(prisma, req.admin!.adminUserId, "ADD_SOURCE", "NewsSource", source.id, body);
    res.status(201).json({ source });
  })
);

const updateSourceSchema = z.object({
  isBlacklisted: z.boolean().optional(),
  reliabilityScore: z.number().min(0).max(100).optional(),
  licenseNotes: z.string().optional(),
});

adminSourcesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateSourceSchema.parse(req.body);
    const source = await prisma.newsSource.update({ where: { id: req.params.id }, data: body });
    await logAdminAction(prisma, req.admin!.adminUserId, "UPDATE_SOURCE", "NewsSource", req.params.id, body);
    res.json({ source });
  })
);
