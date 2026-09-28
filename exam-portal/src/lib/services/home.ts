import { prisma } from "@/lib/db/client";

/**
 * Read-only queries that power the homepage (Section 7). Every query:
 *  - filters to PUBLISHED content only (Section 45: drafts are never
 *    publicly visible),
 *  - selects only the fields the UI actually renders (Section 25: never
 *    send more than the page needs),
 *  - is capped with `take` (Section 14/25: no unbounded result sets).
 *
 * These return small, page-ready DTOs rather than raw Prisma rows, so
 * components never need to know about the database shape (Section 3).
 */

export interface JobSummary {
  title: string;
  slug: string;
  organizationName: string;
  applicationEndDate: Date | null;
  publishedAt: Date | null;
}

export interface ExamSummary {
  title: string;
  slug: string;
  organizationName: string;
  applicationEndDate: Date | null;
  examDate: Date | null;
}

export interface ResultSummary {
  title: string;
  slug: string;
  examTitle: string;
  resultDate: Date | null;
}

export interface AdmitCardSummary {
  title: string;
  slug: string;
  examTitle: string;
  releaseDate: Date | null;
  examDate: Date | null;
}

export interface AnswerKeySummary {
  title: string;
  slug: string;
  examTitle: string;
  answerKeyDate: Date | null;
}

export interface ArticleSummary {
  title: string;
  slug: string;
  publishedAt: Date | null;
}

export interface OrganizationSummary {
  name: string;
  slug: string;
  examCount: number;
}

export interface StateSummary {
  name: string;
  slug: string;
  examCount: number;
}

export async function getLatestJobs(limit = 6): Promise<JobSummary[]> {
  const jobs = await prisma.job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      applicationEndDate: true,
      publishedAt: true,
      organization: { select: { name: true } },
    },
  });
  return jobs.map((job) => ({
    title: job.title,
    slug: job.slug,
    organizationName: job.organization.name,
    applicationEndDate: job.applicationEndDate,
    publishedAt: job.publishedAt,
  }));
}

export async function getLatestResults(limit = 6): Promise<ResultSummary[]> {
  const results = await prisma.result.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      resultDate: true,
      exam: { select: { title: true } },
    },
  });
  return results.map((r) => ({
    title: r.title,
    slug: r.slug,
    examTitle: r.exam.title,
    resultDate: r.resultDate,
  }));
}

export async function getLatestAdmitCards(
  limit = 6,
): Promise<AdmitCardSummary[]> {
  const cards = await prisma.admitCard.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      releaseDate: true,
      examDate: true,
      exam: { select: { title: true } },
    },
  });
  return cards.map((c) => ({
    title: c.title,
    slug: c.slug,
    examTitle: c.exam.title,
    releaseDate: c.releaseDate,
    examDate: c.examDate,
  }));
}

export async function getLatestAnswerKeys(
  limit = 6,
): Promise<AnswerKeySummary[]> {
  const keys = await prisma.answerKey.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      answerKeyDate: true,
      exam: { select: { title: true } },
    },
  });
  return keys.map((k) => ({
    title: k.title,
    slug: k.slug,
    examTitle: k.exam.title,
    answerKeyDate: k.answerKeyDate,
  }));
}

export async function getLatestArticles(limit = 4): Promise<ArticleSummary[]> {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { title: true, slug: true, publishedAt: true },
  });
  return articles;
}

/**
 * "Popular" without click-analytics (that's Phase 17) would be fabricated
 * — so until then, this orders open exams by how soon their application
 * window closes, which is a real, honest signal of current relevance
 * rather than an invented popularity score.
 */
export async function getPopularExams(limit = 6): Promise<ExamSummary[]> {
  const exams = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      applicationEndDate: { gte: new Date() },
    },
    orderBy: { applicationEndDate: "asc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      applicationEndDate: true,
      examDate: true,
      organization: { select: { name: true } },
    },
  });
  return exams.map((exam) => ({
    title: exam.title,
    slug: exam.slug,
    organizationName: exam.organization.name,
    applicationEndDate: exam.applicationEndDate,
    examDate: exam.examDate,
  }));
}

/** Organizations ranked by how many published exams they have. */
export async function getPopularOrganizations(
  limit = 8,
): Promise<OrganizationSummary[]> {
  const orgs = await prisma.organization.findMany({
    take: limit,
    select: {
      name: true,
      slug: true,
      _count: { select: { exams: { where: { status: "PUBLISHED" } } } },
    },
    orderBy: { exams: { _count: "desc" } },
  });
  return orgs
    .map((org) => ({
      name: org.name,
      slug: org.slug,
      examCount: org._count.exams,
    }))
    .filter((org) => org.examCount > 0);
}

/** States that have at least one published exam, with a count each. */
export async function getStatesWithExams(): Promise<StateSummary[]> {
  const states = await prisma.state.findMany({
    select: {
      name: true,
      slug: true,
      _count: { select: { exams: { where: { status: "PUBLISHED" } } } },
    },
    orderBy: { name: "asc" },
  });
  return states
    .map((state) => ({
      name: state.name,
      slug: state.slug,
      examCount: state._count.exams,
    }))
    .filter((state) => state.examCount > 0);
}

/** Exams whose application window closes within `days` — a factual,
 * data-derived "important announcements" feed rather than a separate,
 * hand-curated content type the schema doesn't define. */
export async function getClosingSoonExams(
  days = 14,
  limit = 5,
): Promise<ExamSummary[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const exams = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      applicationEndDate: { gte: now, lte: until },
    },
    orderBy: { applicationEndDate: "asc" },
    take: limit,
    select: {
      title: true,
      slug: true,
      applicationEndDate: true,
      examDate: true,
      organization: { select: { name: true } },
    },
  });
  return exams.map((exam) => ({
    title: exam.title,
    slug: exam.slug,
    organizationName: exam.organization.name,
    applicationEndDate: exam.applicationEndDate,
    examDate: exam.examDate,
  }));
}
