import { prisma } from "@/lib/db/client";

export async function getAnalyticsSummary() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalViews, viewsLast30Days, byContentType, topContent] = await Promise.all([
    prisma.contentViewEvent.count(),
    prisma.contentViewEvent.count({ where: { createdAt: { gte: since30d } } }),
    prisma.contentViewEvent.groupBy({
      by: ["contentType"],
      _count: { _all: true },
      orderBy: { _count: { contentType: "desc" } },
    }),
    prisma.contentViewEvent.groupBy({
      by: ["contentType", "contentId", "path"],
      _count: { _all: true },
      orderBy: { _count: { contentId: "desc" } },
      take: 10,
    }),
  ]);

  return {
    totalViews,
    viewsLast30Days,
    byContentType: byContentType.map((row) => ({
      contentType: row.contentType,
      count: row._count._all,
    })),
    topContent: topContent.map((row) => ({
      contentType: row.contentType,
      contentId: row.contentId,
      path: row.path,
      count: row._count._all,
    })),
  };
}
