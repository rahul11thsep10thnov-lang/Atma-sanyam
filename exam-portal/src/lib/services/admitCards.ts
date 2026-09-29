import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { dispatchNotification } from "@/lib/services/notifications";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { AdmitCardInput } from "@/lib/validation/admitCard";
import type { AdminRole } from "@/generated/prisma/enums";
import type { AdmitCardSummary } from "@/lib/services/home";

const PAGE_SIZE = 20;

export async function listAdmitCardsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.admitCard.findMany({
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
    prisma.admitCard.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getAdmitCardForAdmin(id: string) {
  return prisma.admitCard.findUnique({ where: { id } });
}

function admitCardWriteData(input: AdmitCardInput) {
  return {
    title: input.title,
    description: input.description,
    examId: input.examId,
    releaseDate: input.releaseDate,
    examDate: input.examDate,
    downloadUrl: input.downloadUrl,
    officialWebsite: input.officialWebsite,
    instructions: input.instructions,
  };
}

export async function createAdmitCard(input: AdmitCardInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.admitCard.count({ where: { slug: candidate } })) > 0,
  );
  const admitCard = await prisma.admitCard.create({
    data: {
      ...admitCardWriteData(input),
      slug,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "AdmitCard",
    contentId: admitCard.id,
    newValue: { title: admitCard.title, slug: admitCard.slug },
  });
  return admitCard;
}

export async function updateAdmitCard(
  id: string,
  input: AdmitCardInput,
  adminId: string,
) {
  const existing = await prisma.admitCard.findUniqueOrThrow({ where: { id } });

  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "AdmitCard",
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
            (await prisma.admitCard.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  const admitCard = await prisma.admitCard.update({
    where: { id },
    data: { ...admitCardWriteData(input), slug, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "AdmitCard",
    contentId: admitCard.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: admitCard.title, slug: admitCard.slug },
  });
  return admitCard;
}

export async function transitionAdmitCardStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.admitCard.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "AdmitCard",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const admitCard = await prisma.admitCard.update({
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
    contentType: "AdmitCard",
    contentId: admitCard.id,
    previousValue: { status: existing.status },
    newValue: { status: admitCard.status },
  });

  if (nextStatus === "PUBLISHED" && !existing.publishedAt) {
    await dispatchNotification({
      type: "NEW_ADMIT_CARD",
      title: admitCard.title,
      body: `A new admit card has been published: ${admitCard.title}.`,
      targetType: "AdmitCard",
      targetId: admitCard.id,
    });
  }

  return admitCard;
}

const PUBLIC_PAGE_SIZE = 12;

/** Public `/admit-card` listing page (Section 14: paginated). */
export async function listPublishedAdmitCards(
  page = 1,
): Promise<{ admitCards: AdmitCardSummary[]; total: number; pageSize: number }> {
  const [items, total] = await Promise.all([
    prisma.admitCard.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        releaseDate: true,
        examDate: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.admitCard.count({ where: { status: "PUBLISHED" } }),
  ]);
  const admitCards = items.map((a) => ({
    title: a.title,
    slug: a.slug,
    examTitle: a.exam.title,
    releaseDate: a.releaseDate,
    examDate: a.examDate,
  }));
  return { admitCards, total, pageSize: PUBLIC_PAGE_SIZE };
}

/** Public admit card detail page (Section 11), plus the exam's other
 * published content it naturally relates to: a Result that names this
 * admit card explicitly (schema relation), and an Answer Key for the
 * same exam (no direct FK between AdmitCard and AnswerKey, so this is
 * derived from the shared exam — the same "central entity" pattern used
 * elsewhere — never a random keyword match). */
export async function getPublishedAdmitCardBySlug(slug: string) {
  const admitCard = await prisma.admitCard.findFirst({
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
  if (!admitCard) return null;

  const relatedAnswerKeys = await prisma.answerKey.findMany({
    where: { examId: admitCard.examId, status: "PUBLISHED" },
    select: { title: true, slug: true },
    take: 5,
  });

  return { admitCard, relatedAnswerKeys };
}
