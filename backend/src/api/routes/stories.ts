import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const storiesRouter = Router();

const storyQuerySchema = z.object({ lang: z.string().default("en") });

storiesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const query = storyQuerySchema.parse(req.query);
    const story = await prisma.masterStory.findUnique({
      where: { id: req.params.id },
      include: { location: true, videoAssets: true },
    });
    if (!story) throw new HttpError(404, "Story not found");

    const [translation, sources] = await Promise.all([
      prisma.storyTranslation.findUnique({ where: { masterStoryId_languageCode: { masterStoryId: story.id, languageCode: query.lang } } }),
      prisma.storySource.findMany({ where: { masterStoryId: story.id }, include: { source: true } }),
    ]);

    res.json({
      id: story.id,
      title: translation?.localizedTitle ?? story.title,
      summary: translation?.localizedSummary ?? story.whatHappened,
      category: story.eventType,
      state: story.location?.state ?? null,
      district: story.location?.district ?? null,
      eventDate: story.eventDate,
      legalStatus: story.legalStatus,
      currentStatus: story.currentStatus,
      videos: story.videoAssets
        .filter((v) => v.renderStatus === "READY")
        .map((v) => ({ languageCode: v.languageCode, videoId: v.id, durationSeconds: v.durationSeconds })),
      sources: [...new Map(sources.map((s) => [s.source.id, { name: s.source.name, url: s.sourceUrl }])).values()],
      disclaimer: "This is an AI-generated summary based on publicly reported information. It is not a verbatim reproduction of any single article.",
    });
  })
);
