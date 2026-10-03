import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { dispatchNotification } from "@/lib/services/notifications";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { ResultInput } from "@/lib/validation/result";
import type { AdminRole } from "@/generated/prisma/enums";
import type { ResultSummary } from "@/lib/services/home";

const PAGE_SIZE = 20;

export async function listResultsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.result.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.result.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getResultForAdmin(id: string) {
  return prisma.result.findUnique({ where: { id } });
}

function resultWriteData(input: ResultInput) {
  return {
    title: input.title,
    description: input.description,
    examId: input.examId,
    resultDate: input.resultDate,
    resultUrl: input.resultUrl,
    officialWebsite: input.officialWebsite,
    relatedAdmitCardId: input.relatedAdmitCardId,
    relatedAnswerKeyId: input.relatedAnswerKeyId,
  };
}

export async function createResult(input: ResultInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.result.count({ where: { slug: candidate } })) > 0,
  );
  const result = await prisma.result.create({
    data: {
      ...resultWriteData(input),
      slug,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Result",
    contentId: result.id,
    newValue: { title: result.title, slug: result.slug },
  });
  return result;
}

export async function updateResult(
  id: string,
  input: ResultInput,
  adminId: string,
) {
  const existing = await prisma.result.findUniqueOrThrow({ where: { id } });

  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Result",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: "Edited while published",
    });
  }

  const slug =
    slugify(input.title) === existing.slug
      ? existing.slug
      : await uniqueSlug(
          input.title,
          async (candidate) =>
            (await prisma.result.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  const result = await prisma.result.update({
    where: { id },
    data: { ...resultWriteData(input), slug, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Result",
    contentId: result.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: result.title, slug: result.slug },
  });
  return result;
}

export async function transitionResultStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.result.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Result",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const result = await prisma.result.update({
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
    contentType: "Result",
    contentId: result.id,
    previousValue: { status: existing.status },
    newValue: { status: result.status },
  });

  if (nextStatus === "PUBLISHED" && !existing.publishedAt) {
    await dispatchNotification({
      type: "NEW_RESULT",
      title: result.title,
      body: `A new result has been published: ${result.title}.`,
      targetType: "Result",
      targetId: result.id,
    });
  }

  return result;
}

const PUBLIC_PAGE_SIZE = 40;

/** Public `/results` listing page (Section 14: paginated). */
export async function listPublishedResults(
  page = 1,
): Promise<{ results: ResultSummary[]; total: number; pageSize: number }> {
  const [items, total] = await Promise.all([
    prisma.result.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        resultDate: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.result.count({ where: { status: "PUBLISHED" } }),
  ]);
  const results = items.map((r) => ({
    title: r.title,
    slug: r.slug,
    examTitle: r.exam.title,
    resultDate: r.resultDate,
  }));
  return { results, total, pageSize: PUBLIC_PAGE_SIZE };
}

/** Public result detail page, plus its related exam/admit card/answer
 * key (Section 10) and sibling results under the same exam. */
export async function getPublishedResultBySlug(slug: string) {
  const result = await prisma.result.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      exam: {
        select: {
          title: true,
          slug: true,
          organization: { select: { name: true, slug: true } },
        },
      },
      relatedAdmitCard: {
        select: { title: true, slug: true, status: true },
      },
      relatedAnswerKey: {
        select: { title: true, slug: true, status: true },
      },
    },
  });
  if (!result) return null;

  const relatedResults = await prisma.result.findMany({
    where: { examId: result.examId, status: "PUBLISHED", NOT: { id: result.id } },
    select: { title: true, slug: true },
    take: 5,
  });

  return { result, relatedResults };
}
