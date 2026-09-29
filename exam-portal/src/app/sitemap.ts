import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/client";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Dynamically generated from published content only (Section 45: draft/
 * archived content is never indexable, and the sitemap contains only
 * appropriate URLs). Static pages are listed explicitly; every content
 * type contributes its published slugs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    exams,
    jobs,
    results,
    admitCards,
    answerKeys,
    syllabi,
    admissions,
    scholarships,
    articles,
    organizations,
    categories,
    states,
  ] = await Promise.all([
    prisma.exam.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.job.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.result.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.admitCard.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.answerKey.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.syllabus.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.admission.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.scholarship.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.organization.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.state.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/results`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/admit-card`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/answer-key`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/syllabus`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/admission`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/scholarship`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/articles`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.2 },
  ];

  const entries = (
    items: { slug: string; updatedAt?: Date }[],
    prefix: string,
    priority: number,
  ): MetadataRoute.Sitemap =>
    items.map((item) => ({
      url: `${SITE_URL}${prefix}/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly",
      priority,
    }));

  return [
    ...staticPages,
    ...entries(exams, "/exam", 0.9),
    ...entries(jobs, "/jobs", 0.9),
    ...entries(results, "/results", 0.8),
    ...entries(admitCards, "/admit-card", 0.7),
    ...entries(answerKeys, "/answer-key", 0.7),
    ...entries(syllabi, "/syllabus", 0.6),
    ...entries(admissions, "/admission", 0.5),
    ...entries(scholarships, "/scholarship", 0.5),
    ...entries(articles, "/articles", 0.5),
    ...entries(organizations, "/organization", 0.6),
    ...entries(categories, "/category", 0.5),
    ...entries(states, "/state", 0.5),
  ];
}
