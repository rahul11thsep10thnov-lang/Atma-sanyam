import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { PrimaryCategory } from "@prisma/client";

export const searchRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1),
  lang: z.string().default("en"),
  state: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Spec §23: search across people, city/district/state, category, date,
// relationship. Uses simple ILIKE matching across denormalized text fields —
// swap for a proper full-text/search-index backend (e.g. Postgres tsvector,
// Meilisearch, OpenSearch) once volume warrants it.
searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = searchQuerySchema.parse(req.query);

    const videos = await prisma.videoAsset.findMany({
      where: {
        languageCode: query.lang,
        renderStatus: "READY",
        publishedAt: { not: null },
        masterStory: {
          ...(query.category ? { eventType: query.category as PrimaryCategory } : {}),
          ...(query.state ? { location: { state: query.state } } : {}),
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { whatHappened: { contains: query.q, mode: "insensitive" } },
            { background: { contains: query.q, mode: "insensitive" } },
            { location: { district: { contains: query.q, mode: "insensitive" } } },
            { location: { state: { contains: query.q, mode: "insensitive" } } },
          ],
        },
      },
      include: { masterStory: { include: { location: true } } },
      orderBy: { publishedAt: "desc" },
      take: query.limit,
    });

    res.json({
      results: videos.map((v) => ({
        videoId: v.id,
        masterStoryId: v.masterStoryId,
        title: v.masterStory.title,
        thumbnailUrl: v.thumbnailUrl,
        category: v.masterStory.eventType,
        state: v.masterStory.location?.state ?? null,
        district: v.masterStory.location?.district ?? null,
        publishedAt: v.publishedAt,
      })),
    });
  })
);
