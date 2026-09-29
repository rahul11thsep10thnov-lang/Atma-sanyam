import { prisma } from "@/lib/db/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { snapshotContentVersion } from "@/lib/services/contentVersion";
import { applyTransition, type Transition } from "@/lib/services/workflow";
import { parseList } from "@/lib/validation/shared";
import type { SyllabusInput } from "@/lib/validation/syllabus";
import type { AdminRole } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

/** Full structured tree, ordered — the shape both the admin edit page
 * and the public detail page render (Section 13: Paper → Subject →
 * Topic, never one text blob). */
const treeInclude = {
  papers: {
    orderBy: { order: "asc" as const },
    include: {
      subjects: {
        orderBy: { order: "asc" as const },
        include: {
          topics: { orderBy: { order: "asc" as const } },
        },
      },
    },
  },
};

export async function listSyllabiForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.syllabus.findMany({
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
    prisma.syllabus.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export function getSyllabusForAdmin(id: string) {
  return prisma.syllabus.findUnique({
    where: { id },
    include: treeInclude,
  });
}

export type SyllabusWithTree = NonNullable<
  Awaited<ReturnType<typeof getSyllabusForAdmin>>
>;

export async function createSyllabus(input: SyllabusInput, adminId: string) {
  const slug = await uniqueSlug(
    input.title,
    async (candidate) =>
      (await prisma.syllabus.count({ where: { slug: candidate } })) > 0,
  );
  const syllabus = await prisma.syllabus.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      examId: input.examId,
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Syllabus",
    contentId: syllabus.id,
    newValue: { title: syllabus.title, slug: syllabus.slug },
  });
  return syllabus;
}

/** Snapshots the whole tree (Section 21A Step 16 applies to the record's
 * full content, and the structure is as much "content" here as the
 * title/description). Callers pass a syllabus already fetched with
 * `treeInclude` (or `getSyllabusForAdmin`'s result). */
async function snapshotIfPublished(
  syllabus: { id: string; status: string },
  fullTree: unknown,
  adminId: string,
  changeSummary: string,
) {
  if (syllabus.status !== "PUBLISHED") return;
  await snapshotContentVersion({
    contentType: "Syllabus",
    contentId: syllabus.id,
    snapshot: fullTree,
    createdBy: adminId,
    changeSummary,
  });
}

export async function updateSyllabus(
  id: string,
  input: SyllabusInput,
  adminId: string,
) {
  const existing = await getSyllabusForAdmin(id);
  if (!existing) throw new Error("Syllabus not found");

  await snapshotIfPublished(existing, existing, adminId, "Edited while published");

  const slug =
    slugify(input.title) === existing.slug
      ? existing.slug
      : await uniqueSlug(
          input.title,
          async (candidate) =>
            (await prisma.syllabus.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        );

  const syllabus = await prisma.syllabus.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      description: input.description,
      examId: input.examId,
      updatedBy: adminId,
    },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: syllabus.id,
    previousValue: { title: existing.title, slug: existing.slug },
    newValue: { title: syllabus.title, slug: syllabus.slug },
  });
  return syllabus;
}

export async function transitionSyllabusStatus(
  id: string,
  transition: Transition,
  role: AdminRole,
  adminId: string,
) {
  const existing = await getSyllabusForAdmin(id);
  if (!existing) throw new Error("Syllabus not found");
  const nextStatus = applyTransition(existing.status, transition, role);

  if (existing.status === "PUBLISHED" && nextStatus !== "PUBLISHED") {
    await snapshotContentVersion({
      contentType: "Syllabus",
      contentId: id,
      snapshot: existing,
      createdBy: adminId,
      changeSummary: `Status changed via ${transition}`,
    });
  }

  const syllabus = await prisma.syllabus.update({
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
    contentType: "Syllabus",
    contentId: syllabus.id,
    previousValue: { status: existing.status },
    newValue: { status: syllabus.status },
  });

  return syllabus;
}

// ---------------------------------------------------------------------------
// Structural mutations (Paper / Subject / Topic) — no workflow/status of
// their own; they live and die with the parent Syllabus, and editing them
// is governed by the same ownership rule as editing the syllabus itself.
// ---------------------------------------------------------------------------

async function touchSyllabus(syllabusId: string, adminId: string) {
  await prisma.syllabus.update({
    where: { id: syllabusId },
    data: { updatedBy: adminId },
  });
}

export async function addPaper(syllabusId: string, name: string, adminId: string) {
  const syllabus = await getSyllabusForAdmin(syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Paper added");

  const count = await prisma.syllabusPaper.count({ where: { syllabusId } });
  await prisma.syllabusPaper.create({
    data: { syllabusId, name, order: count + 1 },
  });
  await touchSyllabus(syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: syllabusId,
    newValue: { addedPaper: name },
  });
}

export async function deletePaper(paperId: string, adminId: string) {
  const paper = await prisma.syllabusPaper.findUniqueOrThrow({
    where: { id: paperId },
  });
  const syllabus = await getSyllabusForAdmin(paper.syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Paper removed");

  await prisma.syllabusPaper.delete({ where: { id: paperId } });
  await touchSyllabus(paper.syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: paper.syllabusId,
    previousValue: { removedPaper: paper.name },
  });
  return paper.syllabusId;
}

export async function addSubject(paperId: string, name: string, adminId: string) {
  const paper = await prisma.syllabusPaper.findUniqueOrThrow({
    where: { id: paperId },
  });
  const syllabus = await getSyllabusForAdmin(paper.syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Subject added");

  const count = await prisma.syllabusSubject.count({ where: { paperId } });
  await prisma.syllabusSubject.create({
    data: { paperId, name, order: count + 1 },
  });
  await touchSyllabus(paper.syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: paper.syllabusId,
    newValue: { addedSubject: name },
  });
  return paper.syllabusId;
}

export async function deleteSubject(subjectId: string, adminId: string) {
  const subject = await prisma.syllabusSubject.findUniqueOrThrow({
    where: { id: subjectId },
    include: { paper: true },
  });
  const syllabus = await getSyllabusForAdmin(subject.paper.syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Subject removed");

  await prisma.syllabusSubject.delete({ where: { id: subjectId } });
  await touchSyllabus(subject.paper.syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: subject.paper.syllabusId,
    previousValue: { removedSubject: subject.name },
  });
  return subject.paper.syllabusId;
}

export async function addTopic(
  subjectId: string,
  name: string,
  subtopics: string[],
  adminId: string,
) {
  const subject = await prisma.syllabusSubject.findUniqueOrThrow({
    where: { id: subjectId },
    include: { paper: true },
  });
  const syllabus = await getSyllabusForAdmin(subject.paper.syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Topic added");

  const count = await prisma.syllabusTopic.count({ where: { subjectId } });
  await prisma.syllabusTopic.create({
    data: { subjectId, name, subtopics, order: count + 1 },
  });
  await touchSyllabus(subject.paper.syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: subject.paper.syllabusId,
    newValue: { addedTopic: name },
  });
  return subject.paper.syllabusId;
}

export async function deleteTopic(topicId: string, adminId: string) {
  const topic = await prisma.syllabusTopic.findUniqueOrThrow({
    where: { id: topicId },
    include: { subject: { include: { paper: true } } },
  });
  const syllabusId = topic.subject.paper.syllabusId;
  const syllabus = await getSyllabusForAdmin(syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  await snapshotIfPublished(syllabus, syllabus, adminId, "Topic removed");

  await prisma.syllabusTopic.delete({ where: { id: topicId } });
  await touchSyllabus(syllabusId, adminId);
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Syllabus",
    contentId: syllabusId,
    previousValue: { removedTopic: topic.name },
  });
  return syllabusId;
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

const PUBLIC_PAGE_SIZE = 12;

export async function listPublishedSyllabi(page = 1) {
  const [items, total] = await Promise.all([
    prisma.syllabus.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: {
        title: true,
        slug: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.syllabus.count({ where: { status: "PUBLISHED" } }),
  ]);
  const syllabi = items.map((s) => ({
    title: s.title,
    slug: s.slug,
    examTitle: s.exam.title,
  }));
  return { syllabi, total, pageSize: PUBLIC_PAGE_SIZE };
}

export async function getPublishedSyllabusBySlug(slug: string) {
  return prisma.syllabus.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      exam: {
        select: {
          title: true,
          slug: true,
          organization: { select: { name: true, slug: true } },
        },
      },
      ...treeInclude,
    },
  });
}

export { parseList };
