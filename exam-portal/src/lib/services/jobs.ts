import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { dispatchNotification } from "@/lib/services/notifications";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import { parseList } from "@/lib/validation/shared";
import type { JobInput } from "@/lib/validation/job";
import type { AdminRole } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { parsePostsText, parseFeesText, parseDatesText } from "@/lib/jobDetails";

const PAGE_SIZE = 20;

export async function listJobsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.job.findMany({
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
    prisma.job.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getJobForAdmin(id: string) {
  return prisma.job.findUnique({ where: { id } });
}

function jobWriteData(input: JobInput) {
  return {
    title: input.title,
    description: input.description,
    examId: input.examId,
    advertisementNumber: input.advertisementNumber,
    vacancies: input.vacancies,
    qualification: input.qualification,
    ageLimitMin: input.ageLimitMin,
    ageLimitMax: input.ageLimitMax,
    applicationFee: input.applicationFee,
    officialWebsite: input.officialWebsite,
    applyUrl: input.applyUrl,
    eligibility: input.eligibility,
    selectionProcess: parseList(input.selectionProcess),
    salary: input.salary,
    applicationEndDate: input.applicationEndDate,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoKeywords: parseList(input.seoKeywords),
    posts: parsePostsText(input.postsText) as unknown as Prisma.InputJsonValue,
    applicationFeeByCategory: parseFeesText(input.feesText) as unknown as Prisma.InputJsonValue,
    importantDates: parseDatesText(input.datesText) as unknown as Prisma.InputJsonValue,
    syllabusUrl: input.syllabusUrl ?? null,
    examPatternUrl: input.examPatternUrl ?? null,
  };
}

export async function createJob(input: JobInput, adminId: string) {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: input.examId },
    select: { organizationId: true },
  });
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.job.count({ where: { slug: candidate } })) > 0,
  );
  const job = await prisma.job.create({
    data: {
      ...jobWriteData(input),
      slug,
      organizationId: exam.organizationId,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Job",
    contentId: job.id,
    newValue: { title: job.title, slug: job.slug },
  });
  return job;
}

export async function updateJob(id: string, input: JobInput, adminId: string) {
  const existing = await prisma.job.findUniqueOrThrow({ where: { id } });

  if (existing.status === "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Job",
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
            (await prisma.job.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  // If the exam changed, keep the denormalized organizationId in sync.
  const exam =
    input.examId === existing.examId
      ? null
      : await prisma.exam.findUniqueOrThrow({
          where: { id: input.examId },
          select: { organizationId: true },
        });

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...jobWriteData(input),
      slug,
      ...(exam ? { organizationId: exam.organizationId } : {}),
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Job",
    contentId: job.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: job.title, slug: job.slug },
  });
  return job;
}

export async function transitionJobStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await prisma.job.findUniqueOrThrow({ where: { id } });
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Job",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const job = await prisma.job.update({
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
    contentType: "Job",
    contentId: job.id,
    previousValue: { status: existing.status },
    newValue: { status: job.status },
  });

  // A notification fires only on a genuine transition INTO published —
  // never on a republish (e.g. after ARCHIVE → DRAFT → PUBLISH again),
  // so subscribers aren't re-notified about something they already saw.
  if (nextStatus === "PUBLISHED" && !existing.publishedAt) {
    await dispatchNotification({
      type: "NEW_JOB",
      title: job.title,
      body: `A new job notification has been published: ${job.title}.`,
      targetType: "Job",
      targetId: job.id,
    });
  }

  return job;
}

const PUBLIC_PAGE_SIZE = 40;

export interface PublicJobFilter {
  stateSlug?: string;
  qualification?: string;
  q?: string;
}

/** Public `/jobs` listing (newest first), filterable by state, minimum
 * qualification and exam name — the three-part search bar. */
export async function listPublishedJobs(page = 1, filter: PublicJobFilter = {}) {
  const { qualificationByCode } = await import("@/lib/qualifications");
  const and: Prisma.JobWhereInput[] = [{ status: "PUBLISHED" }];
  if (filter.stateSlug) {
    and.push({ OR: [{ exam: { state: { slug: filter.stateSlug } } }, { organization: { state: { slug: filter.stateSlug } } }] });
  }
  const qual = qualificationByCode(filter.qualification);
  if (qual) {
    and.push({ OR: qual.keywords.flatMap((k) => [{ qualification: { contains: k, mode: "insensitive" as const } }, { eligibility: { contains: k, mode: "insensitive" as const } }]) });
  }
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    and.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { exam: { title: { contains: q, mode: "insensitive" } } }, { organization: { OR: [{ name: { contains: q, mode: "insensitive" } }, { shortName: { contains: q, mode: "insensitive" } }, { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } }] } }] });
  }
  const where: Prisma.JobWhereInput = { AND: and };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        applicationEndDate: true,
        publishedAt: true,
        vacancies: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);
  const jobs = items.map((job) => ({
    title: job.title,
    slug: job.slug,
    organizationName: job.organization.name,
    applicationEndDate: job.applicationEndDate,
    publishedAt: job.publishedAt,
    vacancies: job.vacancies,
  }));
  return { jobs, total, pageSize: PUBLIC_PAGE_SIZE };
}

/** Public job detail page, plus the sibling published jobs under the same
 * exam ("Related Jobs", Section 9) and the exam's other published content
 * ("Related Exams" surface — same exam, different content type). */
export async function getPublishedJobBySlug(slug: string) {
  const job = await prisma.job.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      organization: { select: { name: true, slug: true, website: true } },
      exam: {
        select: {
          title: true,
          slug: true,
          examDate: true,
          applicationStartDate: true,
          applicationEndDate: true,
          category: { select: { name: true, slug: true } },
          state: { select: { name: true, slug: true } },
          syllabi: { where: { status: "PUBLISHED" }, select: { slug: true, title: true }, take: 1 },
          admitCards: { where: { status: "PUBLISHED" }, select: { slug: true, releaseDate: true, examDate: true }, orderBy: { publishedAt: "desc" }, take: 1 },
          results: { where: { status: "PUBLISHED" }, select: { slug: true, resultDate: true }, orderBy: { publishedAt: "desc" }, take: 1 },
          answerKeys: { where: { status: "PUBLISHED" }, select: { slug: true, answerKeyDate: true }, orderBy: { publishedAt: "desc" }, take: 1 },
        },
      },
      importantLinks: { orderBy: { order: "asc" } },
      notificationDocument: { select: { storageUrl: true, filename: true } },
      recruitment: { select: { slug: true, status: true } },
    },
  });
  if (!job) return null;

  const relatedJobs = await prisma.job.findMany({
    where: { examId: job.examId, status: "PUBLISHED", NOT: { id: job.id } },
    select: { title: true, slug: true },
    take: 5,
  });

  return { job, relatedJobs };
}
