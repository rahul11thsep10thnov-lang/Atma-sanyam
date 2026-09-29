import { prisma } from "@/lib/db/client";

export interface SearchFilters {
  q: string;
  type?: SearchContentType;
  organizationId?: string;
  categoryId?: string;
  stateId?: string;
  page?: number;
}

export type SearchContentType =
  | "exam"
  | "job"
  | "result"
  | "admit-card"
  | "answer-key"
  | "syllabus"
  | "article"
  | "organization";

export interface SearchResultItem {
  type: SearchContentType;
  title: string;
  href: string;
  subtitle?: string;
  date?: Date | null;
}

const PAGE_SIZE = 15;
const MAX_QUERY_LENGTH = 100;

const CONTENT_TYPE_LABELS: Record<SearchContentType, string> = {
  exam: "Exam",
  job: "Job",
  result: "Result",
  "admit-card": "Admit Card",
  "answer-key": "Answer Key",
  syllabus: "Syllabus",
  article: "Article",
  organization: "Organization",
};

export function contentTypeLabel(type: SearchContentType): string {
  return CONTENT_TYPE_LABELS[type];
}

/**
 * Full-site search (Section 14): every content type, filterable by
 * category/organization/state/content-type, paginated. Optimized to run
 * only the queries the requested `type` filter actually needs — no
 * unbounded scans across every table on every request (Section 25).
 */
export async function searchSite(
  filters: SearchFilters,
): Promise<{ items: SearchResultItem[]; total: number; pageSize: number }> {
  const q = filters.q.trim().slice(0, MAX_QUERY_LENGTH);
  if (q.length < 2) return { items: [], total: 0, pageSize: PAGE_SIZE };

  const page = Math.max(1, filters.page ?? 1);
  const orgFilter = filters.organizationId
    ? { organizationId: filters.organizationId }
    : {};
  const examScopedOrgFilter = filters.organizationId
    ? { exam: { organizationId: filters.organizationId } }
    : {};
  const categoryFilter = filters.categoryId ? { categoryId: filters.categoryId } : {};
  const examScopedCategoryFilter = filters.categoryId
    ? { exam: { categoryId: filters.categoryId } }
    : {};
  const stateFilter = filters.stateId ? { stateId: filters.stateId } : {};
  const examScopedStateFilter = filters.stateId
    ? { exam: { stateId: filters.stateId } }
    : {};

  const wantsType = (t: SearchContentType) => !filters.type || filters.type === t;

  const [exams, jobs, results, admitCards, answerKeys, syllabi, articles, organizations] =
    await Promise.all([
      wantsType("exam")
        ? prisma.exam.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...orgFilter,
              ...categoryFilter,
              ...stateFilter,
            },
            select: {
              title: true,
              slug: true,
              applicationEndDate: true,
              organization: { select: { name: true } },
            },
            take: 50,
          })
        : [],
      wantsType("job")
        ? prisma.job.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...orgFilter,
              ...examScopedCategoryFilter,
              ...examScopedStateFilter,
            },
            select: {
              title: true,
              slug: true,
              applicationEndDate: true,
              organization: { select: { name: true } },
            },
            take: 50,
          })
        : [],
      wantsType("result")
        ? prisma.result.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...examScopedOrgFilter,
              ...examScopedCategoryFilter,
              ...examScopedStateFilter,
            },
            select: {
              title: true,
              slug: true,
              resultDate: true,
              exam: { select: { title: true } },
            },
            take: 50,
          })
        : [],
      wantsType("admit-card")
        ? prisma.admitCard.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...examScopedOrgFilter,
              ...examScopedCategoryFilter,
              ...examScopedStateFilter,
            },
            select: {
              title: true,
              slug: true,
              examDate: true,
              exam: { select: { title: true } },
            },
            take: 50,
          })
        : [],
      wantsType("answer-key")
        ? prisma.answerKey.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...examScopedOrgFilter,
              ...examScopedCategoryFilter,
              ...examScopedStateFilter,
            },
            select: {
              title: true,
              slug: true,
              answerKeyDate: true,
              exam: { select: { title: true } },
            },
            take: 50,
          })
        : [],
      wantsType("syllabus")
        ? prisma.syllabus.findMany({
            where: {
              status: "PUBLISHED",
              title: { contains: q, mode: "insensitive" },
              ...examScopedOrgFilter,
              ...examScopedCategoryFilter,
              ...examScopedStateFilter,
            },
            select: { title: true, slug: true, exam: { select: { title: true } } },
            take: 50,
          })
        : [],
      wantsType("article")
        ? prisma.article.findMany({
            where: { status: "PUBLISHED", title: { contains: q, mode: "insensitive" } },
            select: { title: true, slug: true, publishedAt: true },
            take: 50,
          })
        : [],
      wantsType("organization")
        ? prisma.organization.findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            select: { name: true, slug: true },
            take: 50,
          })
        : [],
    ]);

  const items: SearchResultItem[] = [
    ...exams.map((e) => ({
      type: "exam" as const,
      title: e.title,
      href: `/exam/${e.slug}`,
      subtitle: e.organization.name,
      date: e.applicationEndDate,
    })),
    ...jobs.map((j) => ({
      type: "job" as const,
      title: j.title,
      href: `/jobs/${j.slug}`,
      subtitle: j.organization.name,
      date: j.applicationEndDate,
    })),
    ...results.map((r) => ({
      type: "result" as const,
      title: r.title,
      href: `/results/${r.slug}`,
      subtitle: r.exam.title,
      date: r.resultDate,
    })),
    ...admitCards.map((a) => ({
      type: "admit-card" as const,
      title: a.title,
      href: `/admit-card/${a.slug}`,
      subtitle: a.exam.title,
      date: a.examDate,
    })),
    ...answerKeys.map((a) => ({
      type: "answer-key" as const,
      title: a.title,
      href: `/answer-key/${a.slug}`,
      subtitle: a.exam.title,
      date: a.answerKeyDate,
    })),
    ...syllabi.map((s) => ({
      type: "syllabus" as const,
      title: s.title,
      href: `/syllabus/${s.slug}`,
      subtitle: s.exam.title,
    })),
    ...articles.map((a) => ({
      type: "article" as const,
      title: a.title,
      href: `/articles/${a.slug}`,
      date: a.publishedAt,
    })),
    ...organizations.map((o) => ({
      type: "organization" as const,
      title: o.name,
      href: `/organization/${o.slug}`,
    })),
  ];

  const total = items.length;
  const start = (page - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

  return { items: paged, total, pageSize: PAGE_SIZE };
}
