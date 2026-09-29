import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { ArticleInput } from "@/lib/validation/article";
import type { AdminRole } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function listArticlesForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, status: true, updatedAt: true },
    }),
    prisma.article.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getArticleForAdmin(id: string) {
  return prisma.article.findUnique({ where: { id } });
}

export async function createArticle(input: ArticleInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (c) => (await prisma.article.count({ where: { slug: c } })) > 0,
  );
  const article = await prisma.article.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      body: input.body,
      coverImageUrl: input.coverImageUrl,
      authorId: adminId,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Article",
    contentId: article.id,
    newValue: { title: article.title, slug: article.slug },
  });
  return article;
}

export async function updateArticle(id: string, input: ArticleInput, adminId: string) {
  const existing = await prisma.article.findUniqueOrThrow({ where: { id } });
  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Article",
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
          async (c) => (await prisma.article.count({ where: { slug: c, NOT: { id } } })) > 0,
        );
  const article = await prisma.article.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      description: input.description,
      body: input.body,
      coverImageUrl: input.coverImageUrl,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Article",
    contentId: article.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: article.title, slug: article.slug },
  });
  return article;
}

export async function transitionArticleStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.article.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);
  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Article",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }
  const article = await prisma.article.update({
    where: { id },
    data: {
      status: nextStatus,
      updatedBy: adminId,
      publishedAt:
        nextStatus === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
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
    contentType: "Article",
    contentId: article.id,
    previousValue: { status: existing.status },
    newValue: { status: article.status },
  });
  return article;
}

export function getPublishedArticleBySlug(slug: string) {
  return prisma.article.findFirst({ where: { slug, status: "PUBLISHED" } });
}
