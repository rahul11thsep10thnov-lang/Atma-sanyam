import { Router } from "express";
import { prisma } from "../../../lib/prisma";
import { asyncHandler } from "../../../middleware/errorHandler";

export const adminPipelineRouter = Router();

// Spec §24: funnel + usage numbers for the admin dashboard.
adminPipelineRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [
      articlesCollected,
      articlesRejected,
      storiesApproved,
      storiesPendingReview,
      videosGenerated,
      videosPublished,
      videosFailed,
      viewsByVideo,
    ] = await Promise.all([
      prisma.rawArticle.count(),
      prisma.rawArticle.count({ where: { dedupStatus: { in: ["DISCARDED_NOT_RELEVANT", "DISCARDED_INSUFFICIENT_INFO", "DISCARDED_DUPLICATE_LOW_VALUE"] } } }),
      prisma.masterStory.count({ where: { pipelineStatus: { in: ["APPROVED", "VIDEO_GENERATED", "PUBLISHED"] } } }),
      prisma.masterStory.count({ where: { pipelineStatus: "PENDING_REVIEW" } }),
      prisma.videoAsset.count({ where: { renderStatus: "READY" } }),
      prisma.videoAsset.count({ where: { publishedAt: { not: null } } }),
      prisma.videoAsset.count({ where: { renderStatus: "FAILED" } }),
      prisma.view.groupBy({ by: ["videoAssetId"], _count: { videoAssetId: true }, orderBy: { _count: { videoAssetId: "desc" } }, take: 10 }),
    ]);

    const topVideos = await prisma.videoAsset.findMany({
      where: { id: { in: viewsByVideo.map((v) => v.videoAssetId) } },
      include: { masterStory: true },
    });

    const mostViewedStories = viewsByVideo.map((v) => {
      const video = topVideos.find((tv) => tv.id === v.videoAssetId);
      return { videoAssetId: v.videoAssetId, title: video?.masterStory.title ?? "Unknown", views: v._count.videoAssetId };
    });

    const viewsByCategory = await prisma.$queryRaw<{ category: string; views: bigint }[]>`
      SELECT ms."eventType" AS category, COUNT(v.id)::bigint AS views
      FROM "View" v
      JOIN "VideoAsset" va ON va.id = v."videoAssetId"
      JOIN "MasterStory" ms ON ms.id = va."masterStoryId"
      GROUP BY ms."eventType"
      ORDER BY views DESC
    `;

    const viewsByLanguage = await prisma.$queryRaw<{ language: string; views: bigint }[]>`
      SELECT va."languageCode" AS language, COUNT(v.id)::bigint AS views
      FROM "View" v
      JOIN "VideoAsset" va ON va.id = v."videoAssetId"
      GROUP BY va."languageCode"
      ORDER BY views DESC
    `;

    res.json({
      funnel: {
        articlesCollected,
        articlesRejected,
        storiesPendingReview,
        storiesApproved,
        videosGenerated,
        videosPublished,
        videosFailed,
      },
      mostViewedStories,
      viewsByCategory: viewsByCategory.map((r) => ({ category: r.category, views: Number(r.views) })),
      viewsByLanguage: viewsByLanguage.map((r) => ({ language: r.language, views: Number(r.views) })),
    });
  })
);
