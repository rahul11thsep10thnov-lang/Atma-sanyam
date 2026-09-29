import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { ScholarshipInput } from "@/lib/validation/scholarship";
import type { AdminRole } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function listScholarshipsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.scholarship.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, status: true, updatedAt: true },
    }),
    prisma.scholarship.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getScholarshipForAdmin(id: string) {
  return prisma.scholarship.findUnique({ where: { id } });
}

function writeData(input: ScholarshipInput) {
  return {
    title: input.title,
    description: input.description,
    organizationId: input.organizationId || null,
    stateId: input.stateId || null,
    applicationEndDate: input.applicationEndDate,
    eligibility: input.eligibility,
    amount: input.amount,
    officialWebsite: input.officialWebsite,
  };
}

export async function createScholarship(input: ScholarshipInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (c) => (await prisma.scholarship.count({ where: { slug: c } })) > 0,
  );
  const scholarship = await prisma.scholarship.create({
    data: { ...writeData(input), slug, status: "DRAFT", createdBy: adminId, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Scholarship",
    contentId: scholarship.id,
    newValue: { title: scholarship.title, slug: scholarship.slug },
  });
  return scholarship;
}

export async function updateScholarship(
  id: string,
  input: ScholarshipInput,
  adminId: string,
) {
  const existing = await prisma.scholarship.findUniqueOrThrow({ where: { id } });
  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Scholarship",
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
          async (c) =>
            (await prisma.scholarship.count({ where: { slug: c, NOT: { id } } })) > 0,
        );
  const scholarship = await prisma.scholarship.update({
    where: { id },
    data: { ...writeData(input), slug, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Scholarship",
    contentId: scholarship.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: scholarship.title, slug: scholarship.slug },
  });
  return scholarship;
}

export async function transitionScholarshipStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.scholarship.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);
  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Scholarship",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }
  const scholarship = await prisma.scholarship.update({
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
    contentType: "Scholarship",
    contentId: scholarship.id,
    previousValue: { status: existing.status },
    newValue: { status: scholarship.status },
  });
  return scholarship;
}

const PUBLIC_PAGE_SIZE = 12;

export async function listPublishedScholarships(page = 1) {
  const [items, total] = await Promise.all([
    prisma.scholarship.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        applicationEndDate: true,
        amount: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.scholarship.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { items, total, pageSize: PUBLIC_PAGE_SIZE };
}

export function getPublishedScholarshipBySlug(slug: string) {
  return prisma.scholarship.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      organization: { select: { name: true, slug: true } },
      state: { select: { name: true, slug: true } },
    },
  });
}
