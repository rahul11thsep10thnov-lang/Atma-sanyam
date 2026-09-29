import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { AnswerKeyInput } from "@/lib/validation/answerKey";
import type { AdminRole } from "@/generated/prisma/enums";
import type { AnswerKeySummary } from "@/lib/services/home";

const PAGE_SIZE = 20;

export async function listAnswerKeysForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.answerKey.findMany({
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
    prisma.answerKey.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getAnswerKeyForAdmin(id: string) {
  return prisma.answerKey.findUnique({ where: { id } });
}

function answerKeyWriteData(input: AnswerKeyInput) {
  return {
    title: input.title,
    description: input.description,
    examId: input.examId,
    answerKeyDate: input.answerKeyDate,
    answerKeyUrl: input.answerKeyUrl,
    objectionDeadline: input.objectionDeadline,
    objectionInfo: input.objectionInfo,
  };
}

export async function createAnswerKey(input: AnswerKeyInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.answerKey.count({ where: { slug: candidate } })) > 0,
  );
  const answerKey = await prisma.answerKey.create({
    data: {
      ...answerKeyWriteData(input),
      slug,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "AnswerKey",
    contentId: answerKey.id,
    newValue: { title: answerKey.title, slug: answerKey.slug },
  });
  return answerKey;
}

export async function updateAnswerKey(
  id: string,
  input: AnswerKeyInput,
  adminId: string,
) {
  const existing = await prisma.answerKey.findUniqueOrThrow({ where: { id } });

  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "AnswerKey",
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
            (await prisma.answerKey.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  const answerKey = await prisma.answerKey.update({
    where: { id },
    data: { ...answerKeyWriteData(input), slug, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "AnswerKey",
    contentId: answerKey.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: answerKey.title, slug: answerKey.slug },
  });
  return answerKey;
}

export async function transitionAnswerKeyStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.answerKey.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "AnswerKey",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const answerKey = await prisma.answerKey.update({
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
    contentType: "AnswerKey",
    contentId: answerKey.id,
    previousValue: { status: existing.status },
    newValue: { status: answerKey.status },
  });

  return answerKey;
}

const PUBLIC_PAGE_SIZE = 12;

/** Public `/answer-key` listing page (Section 14: paginated). */
export async function listPublishedAnswerKeys(
  page = 1,
): Promise<{ answerKeys: AnswerKeySummary[]; total: number; pageSize: number }> {
  const [items, total] = await Promise.all([
    prisma.answerKey.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        answerKeyDate: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.answerKey.count({ where: { status: "PUBLISHED" } }),
  ]);
  const answerKeys = items.map((a) => ({
    title: a.title,
    slug: a.slug,
    examTitle: a.exam.title,
    answerKeyDate: a.answerKeyDate,
  }));
  return { answerKeys, total, pageSize: PUBLIC_PAGE_SIZE };
}

/** Public answer key detail page (Section 12), plus the exam's related
 * result (via the schema's real `Result.relatedAnswerKeyId`
 * back-relation) and related admit card (derived from sharing the same
 * exam, same as the reverse lookup AdmitCard already does). */
export async function getPublishedAnswerKeyBySlug(slug: string) {
  const answerKey = await prisma.answerKey.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      exam: {
        select: {
          title: true,
          slug: true,
          organization: { select: { name: true, slug: true } },
        },
      },
      results: {
        where: { status: "PUBLISHED" },
        select: { title: true, slug: true },
        take: 5,
      },
    },
  });
  if (!answerKey) return null;

  const relatedAdmitCards = await prisma.admitCard.findMany({
    where: { examId: answerKey.examId, status: "PUBLISHED" },
    select: { title: true, slug: true },
    take: 5,
  });

  return { answerKey, relatedAdmitCards };
}
