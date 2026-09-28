import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { ExamInput } from "@/lib/validation/exam";
import type { AdminRole } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function listExamsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.exam.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getExamForAdmin(id: string) {
  return prisma.exam.findUnique({ where: { id } });
}

export async function createExam(input: ExamInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.exam.count({ where: { slug: candidate } })) > 0,
  );
  const exam = await prisma.exam.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      stateId: input.stateId,
      examDate: input.examDate,
      applicationStartDate: input.applicationStartDate,
      applicationEndDate: input.applicationEndDate,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Exam",
    contentId: exam.id,
    newValue: { title: exam.title, slug: exam.slug },
  });
  return exam;
}

export async function updateExam(
  id: string,
  input: ExamInput,
  adminId: string,
) {
  const existing = await prisma.exam.findUniqueOrThrow({ where: { id } });

  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Exam",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: "Edited while published",
    });
  }

  // A title change regenerates the slug only if the new title no longer
  // matches it — editing other fields shouldn't silently change the URL.
  const slug =
    slugify(input.title) === existing.slug
      ? existing.slug
      : await uniqueSlug(
          input.title,
          async (candidate) =>
            (await prisma.exam.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  const exam = await prisma.exam.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      description: input.description,
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      stateId: input.stateId,
      examDate: input.examDate,
      applicationStartDate: input.applicationStartDate,
      applicationEndDate: input.applicationEndDate,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Exam",
    contentId: exam.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: exam.title, slug: exam.slug },
  });
  return exam;
}

export async function transitionExamStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.exam.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Exam",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const exam = await prisma.exam.update({
    where: { id },
    data: {
      status: nextStatus,
      updatedBy: adminId,
      publishedAt:
        nextStatus === "PUBLISHED" && !existing.publishedAt
          ? new Date()
          : existing.publishedAt,
    },
  });

  const auditAction =
    transition === "PUBLISH"
      ? "PUBLISH"
      : transition === "ARCHIVE"
        ? "UNPUBLISH"
        : transition === "APPROVE"
          ? "APPROVE"
          : transition === "REJECT"
            ? "REJECT"
            : "UPDATE";
  await recordAuditLog({
    adminUserId: adminId,
    action: auditAction,
    contentType: "Exam",
    contentId: exam.id,
    previousValue: { status: existing.status },
    newValue: { status: exam.status },
  });

  return exam;
}

/** Public exam detail page: the exam plus every published child record,
 * so the page can link out to whichever of Job/Result/AdmitCard/AnswerKey/
 * Syllabus actually exist for it (Section 5). */
export async function getPublishedExamBySlug(slug: string) {
  return prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      organization: { select: { name: true, slug: true, website: true } },
      category: { select: { name: true, slug: true } },
      state: { select: { name: true, slug: true } },
      jobs: { where: { status: "PUBLISHED" }, select: { title: true, slug: true } },
      results: { where: { status: "PUBLISHED" }, select: { title: true, slug: true } },
      admitCards: {
        where: { status: "PUBLISHED" },
        select: { title: true, slug: true },
      },
      answerKeys: {
        where: { status: "PUBLISHED" },
        select: { title: true, slug: true },
      },
      syllabi: { where: { status: "PUBLISHED" }, select: { title: true, slug: true } },
      importantLinks: { orderBy: { order: "asc" } },
    },
  });
}
