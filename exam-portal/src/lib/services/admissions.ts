import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import type { AdmissionInput } from "@/lib/validation/admission";
import type { AdminRole } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function listAdmissionsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.admission.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, status: true, updatedAt: true },
    }),
    prisma.admission.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getAdmissionForAdmin(id: string) {
  return prisma.admission.findUnique({ where: { id } });
}

function writeData(input: AdmissionInput) {
  return {
    title: input.title,
    description: input.description,
    organizationId: input.organizationId || null,
    categoryId: input.categoryId || null,
    stateId: input.stateId || null,
    applicationStartDate: input.applicationStartDate,
    applicationEndDate: input.applicationEndDate,
    eligibility: input.eligibility,
    officialWebsite: input.officialWebsite,
  };
}

export async function createAdmission(input: AdmissionInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (c) => (await prisma.admission.count({ where: { slug: c } })) > 0,
  );
  const admission = await prisma.admission.create({
    data: { ...writeData(input), slug, status: "DRAFT", createdBy: adminId, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Admission",
    contentId: admission.id,
    newValue: { title: admission.title, slug: admission.slug },
  });
  return admission;
}

export async function updateAdmission(id: string, input: AdmissionInput, adminId: string) {
  const existing = await prisma.admission.findUniqueOrThrow({ where: { id } });
  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Admission",
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
            (await prisma.admission.count({ where: { slug: c, NOT: { id } } })) > 0,
        );
  const admission = await prisma.admission.update({
    where: { id },
    data: { ...writeData(input), slug, updatedBy: adminId },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Admission",
    contentId: admission.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: admission.title, slug: admission.slug },
  });
  return admission;
}

export async function transitionAdmissionStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.admission.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);
  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Admission",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }
  const admission = await prisma.admission.update({
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
    contentType: "Admission",
    contentId: admission.id,
    previousValue: { status: existing.status },
    newValue: { status: admission.status },
  });
  return admission;
}

const PUBLIC_PAGE_SIZE = 12;

export async function listPublishedAdmissions(page = 1) {
  const [items, total] = await Promise.all([
    prisma.admission.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        applicationEndDate: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.admission.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { items, total, pageSize: PUBLIC_PAGE_SIZE };
}

export function getPublishedAdmissionBySlug(slug: string) {
  return prisma.admission.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      organization: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      state: { select: { name: true, slug: true } },
    },
  });
}
