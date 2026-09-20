import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { PrimaryCategory } from "@prisma/client";

export const feedRouter = Router();

const feedQuerySchema = z.object({
  lang: z.string().default("en"),
  category: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const PAGE_SIZE_DEFAULT = 20;

feedRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = feedQuerySchema.parse(req.query);

    const videos = await prisma.videoAsset.findMany({
      where: {
        languageCode: query.lang,
        renderStatus: "READY",
        publishedAt: { not: null },
        masterStory: {
          ...(query.category ? { eventType: query.category as PrimaryCategory } : {}),
          ...(query.state || query.district
            ? {
                location: {
                  ...(query.state ? { state: query.state } : {}),
                  ...(query.district ? { district: query.district } : {}),
                },
              }
            : {}),
        },
      },
      include: {
        masterStory: { include: { location: true } },
        language: true,
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: query.limit ?? PAGE_SIZE_DEFAULT,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });

    const storyIds = videos.map((v) => v.masterStoryId);
    const [translations, storySources] = await Promise.all([
      prisma.storyTranslation.findMany({ where: { masterStoryId: { in: storyIds }, languageCode: query.lang } }),
      prisma.storySource.findMany({ where: { masterStoryId: { in: storyIds } }, include: { source: true } }),
    ]);

    const cards = videos.map((video) => {
      const translation = translations.find((t) => t.masterStoryId === video.masterStoryId);
      const sources = storySources.filter((s) => s.masterStoryId === video.masterStoryId);
      const sourceNames = [...new Set(sources.map((s) => s.source.name))];

      return {
        videoId: video.id,
        masterStoryId: video.masterStoryId,
        title: translation?.localizedTitle ?? video.masterStory.title,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.durationSeconds,
        category: video.masterStory.eventType,
        state: video.masterStory.location?.state ?? null,
        district: video.masterStory.location?.district ?? null,
        publishedAt: video.publishedAt,
        sourceNames,
      };
    });

    res.json({
      videos: cards,
      nextCursor: cards.length === (query.limit ?? PAGE_SIZE_DEFAULT) ? videos[videos.length - 1]?.id ?? null : null,
    });
  })
);
