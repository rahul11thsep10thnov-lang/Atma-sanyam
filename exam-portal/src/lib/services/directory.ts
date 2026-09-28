import { prisma } from "@/lib/db/client";
import type { ExamSummary } from "@/lib/services/home";

const EXAM_LIST_LIMIT = 50;

function toExamSummaries(
  exams: Array<{
    title: string;
    slug: string;
    applicationEndDate: Date | null;
    examDate: Date | null;
    organization: { name: string };
  }>,
): ExamSummary[] {
  return exams.map((exam) => ({
    title: exam.title,
    slug: exam.slug,
    organizationName: exam.organization.name,
    applicationEndDate: exam.applicationEndDate,
    examDate: exam.examDate,
  }));
}

const examSelect = {
  title: true,
  slug: true,
  applicationEndDate: true,
  examDate: true,
  organization: { select: { name: true } },
} as const;

export async function getOrganizationBySlug(slug: string) {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      website: true,
      exams: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: EXAM_LIST_LIMIT,
        select: examSelect,
      },
    },
  });
  if (!organization) return null;
  return { ...organization, exams: toExamSummaries(organization.exams) };
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      exams: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: EXAM_LIST_LIMIT,
        select: examSelect,
      },
    },
  });
  if (!category) return null;
  return { ...category, exams: toExamSummaries(category.exams) };
}

export async function getStateBySlug(slug: string) {
  const state = await prisma.state.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      exams: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: EXAM_LIST_LIMIT,
        select: examSelect,
      },
    },
  });
  if (!state) return null;
  return { ...state, exams: toExamSummaries(state.exams) };
}
