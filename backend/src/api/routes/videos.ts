import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const videosRouter = Router();

videosRouter.get(
  "/:id/manifest",
  asyncHandler(async (req, res) => {
    const video = await prisma.videoAsset.findUnique({
      where: { id: req.params.id },
      include: { masterStory: { include: { location: true } } },
    });
    if (!video || video.renderStatus !== "READY") throw new HttpError(404, "Video not found or not ready");

    const script = await prisma.storyScript.findFirst({
      where: { masterStoryId: video.masterStoryId, languageCode: "en" },
      orderBy: { version: "desc" },
    });

    const [subtitle, sources] = await Promise.all([
      script
        ? prisma.subtitleAsset.findUnique({
            where: { storyScriptId_languageCode_format: { storyScriptId: script.id, languageCode: video.languageCode, format: "VTT" } },
          })
        : null,
      prisma.storySource.findMany({ where: { masterStoryId: video.masterStoryId }, include: { source: true } }),
    ]);

    res.json({
      videoId: video.id,
      playbackUrl: video.storageUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
      resolution: video.resolution,
      languageCode: video.languageCode,
      subtitleUrl: subtitle?.storageUrl ?? null,
      title: video.masterStory.title,
      location: [video.masterStory.location?.district, video.masterStory.location?.state].filter(Boolean).join(", "),
      sources: [...new Map(sources.map((s) => [s.source.id, { name: s.source.name, url: s.sourceUrl }])).values()],
      aiDisclosure: "AI-generated summary. Representative illustrations only — not real footage.",
    });
  })
);
