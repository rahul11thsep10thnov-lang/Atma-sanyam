import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Public queries for the central object: recruitments and their timeline. */
export const RECRUITMENT_PAGE_SIZE = 24;

const cardSelect = {
  id: true,
  title: true,
  titleHi: true,
  translationSource: true,
  slug: true,
  year: true,
  summary: true,
  applicationStartDate: true,
  applicationEndDate: true,
  examDate: true,
  publishedAt: true,
  updatedAt: true,
  organization: { select: { name: true, slug: true, shortName: true } },
  categories: { where: { isPrimary: true }, select: { category: { select: { name: true, slug: true } } } },
  _count: { select: { notices: { where: { status: "PUBLISHED" } } } },
} satisfies Prisma.RecruitmentSelect;

export type RecruitmentCardData = Prisma.RecruitmentGetPayload<{ select: typeof cardSelect }>;

export interface RecruitmentListFilter {
  page?: number;
  categorySlug?: string;
  organizationSlug?: string;
  stateSlug?: string;
  /** "open" = closing date today or later (or unknown), "closed" = past. */
  window?: "open" | "closed" | "all";
  q?: string;
}

function startOfTodayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function listPublishedRecruitments(filter: RecruitmentListFilter = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const today = startOfTodayUtc();
  const where: Prisma.RecruitmentWhereInput = {
    status: "PUBLISHED",
    ...(filter.categorySlug ? { categories: { some: { category: { slug: filter.categorySlug } } } } : {}),
    ...(filter.organizationSlug ? { organization: { slug: filter.organizationSlug } } : {}),
    ...(filter.stateSlug ? { organization: { state: { slug: filter.stateSlug } } } : {}),
    ...(filter.window === "open" ? { OR: [{ applicationEndDate: { gte: today } }, { applicationEndDate: null }] } : filter.window === "closed" ? { applicationEndDate: { lt: today } } : {}),
    ...(filter.q ? { OR: [{ title: { contains: filter.q, mode: "insensitive" } }, { organization: { OR: [{ name: { contains: filter.q, mode: "insensitive" } }, { aliases: { some: { alias: { contains: filter.q, mode: "insensitive" } } } }] } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.recruitment.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }],
      skip: (page - 1) * RECRUITMENT_PAGE_SIZE,
      take: RECRUITMENT_PAGE_SIZE,
      select: cardSelect,
    }),
    prisma.recruitment.count({ where }),
  ]);
  return { rows, total, page, pageSize: RECRUITMENT_PAGE_SIZE };
}

export function getClosingSoonRecruitments(limit = 8, days = 14) {
  const today = startOfTodayUtc();
  const until = new Date(today.getTime() + days * 86_400_000);
  return prisma.recruitment.findMany({
    where: { status: "PUBLISHED", applicationEndDate: { gte: today, lte: until } },
    orderBy: { applicationEndDate: "asc" },
    take: limit,
    select: cardSelect,
  });
}

export function getLatestRecruitments(limit = 6) {
  return prisma.recruitment.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: limit, select: cardSelect });
}

export async function getPublishedRecruitmentBySlug(slug: string) {
  const r = await prisma.recruitment.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      organization: { select: { id: true, name: true, slug: true, shortName: true, website: true, organizationType: true, state: { select: { name: true, slug: true } } } },
      exam: { select: { title: true, slug: true, status: true } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
      notices: {
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }],
        select: { id: true, noticeType: true, priority: true, title: true, titleHi: true, summary: true, summaryHi: true, translationSource: true, sourceUrl: true, sourceDomain: true, sourcePublishedAt: true, publishedAt: true, publishedContentType: true, publishedContentId: true, extracted: true, changeSummary: true },
      },
      jobs: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { slug: true, title: true, vacancies: true, applicationEndDate: true, applyUrl: true, officialWebsite: true, qualification: true, ageLimitMin: true, ageLimitMax: true, applicationFee: true, salary: true, selectionProcess: true, advertisementNumber: true, notificationDocument: { select: { storageUrl: true, filename: true } } } },
      admitCards: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { slug: true, title: true, releaseDate: true, examDate: true, downloadUrl: true } },
      answerKeys: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { slug: true, title: true, answerKeyDate: true, answerKeyUrl: true, objectionDeadline: true } },
      results: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { slug: true, title: true, resultDate: true, resultUrl: true } },
    },
  });
  if (!r) return null;
  const related = await prisma.recruitment.findMany({
    where: { status: "PUBLISHED", organizationId: r.organization.id, NOT: { id: r.id } },
    orderBy: { publishedAt: "desc" },
    take: 6,
    select: cardSelect,
  });
  return { recruitment: r, related };
}

/** Organizations index: only those with something published. */
export function listPublicOrganizations() {
  return prisma.organization.findMany({
    where: { OR: [{ recruitments: { some: { status: "PUBLISHED" } } }, { exams: { some: { status: "PUBLISHED" } } }] },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      shortName: true,
      organizationType: true,
      state: { select: { name: true } },
      _count: { select: { recruitments: { where: { status: "PUBLISHED" } }, exams: { where: { status: "PUBLISHED" } } } },
    },
  });
}

export function listPublicCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      description: true,
      _count: { select: { recruitmentCategories: { where: { recruitment: { status: "PUBLISHED" } } }, exams: { where: { status: "PUBLISHED" } } } },
    },
  });
}
