import { prisma } from "@/lib/db/client";

export interface SearchResult {
  type: "Exam" | "Job";
  title: string;
  organizationName: string;
}

const MAX_QUERY_LENGTH = 100;
const RESULTS_PER_TYPE = 10;

/**
 * Minimal keyword search across published Exams and Jobs, used by the
 * header search bar. This is intentionally small — title matching only,
 * two content types, no filters, no pagination. Full-featured search
 * (Section 14: every content type, category/organization/state/date
 * filters, pagination) is Phase 11; this exists now only so the search
 * bar that Section 7 puts on every page isn't a dead end in the
 * meantime.
 */
export async function searchSite(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length < 2) return [];

  const [exams, jobs] = await Promise.all([
    prisma.exam.findMany({
      where: { status: "PUBLISHED", title: { contains: query, mode: "insensitive" } },
      take: RESULTS_PER_TYPE,
      select: { title: true, organization: { select: { name: true } } },
    }),
    prisma.job.findMany({
      where: { status: "PUBLISHED", title: { contains: query, mode: "insensitive" } },
      take: RESULTS_PER_TYPE,
      select: { title: true, organization: { select: { name: true } } },
    }),
  ]);

  return [
    ...exams.map((e) => ({
      type: "Exam" as const,
      title: e.title,
      organizationName: e.organization.name,
    })),
    ...jobs.map((j) => ({
      type: "Job" as const,
      title: j.title,
      organizationName: j.organization.name,
    })),
  ];
}
