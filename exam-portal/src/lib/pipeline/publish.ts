import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { uniqueSlug } from "@/lib/slug";
import { recordAuditLog, PIPELINE_ACTOR } from "@/lib/services/auditLog";
import { dispatchNotification } from "@/lib/services/notifications";
import type { NoticeExtraction } from "./extract/schema";

/**
 * Publishing a notice (spec §17/§29): the reviewed notice becomes public
 * content. The recruitment it belongs to is published (that is the
 * public timeline page), and — where a dedicated content type exists —
 * a Job / AdmitCard / AnswerKey / Result row is created already
 * PUBLISHED, because the notice review *was* the editorial review.
 * Corrigenda and deadline extensions update the recruitment's existing
 * job instead of creating a second one.
 */
export class PublishError extends Error {}

export interface PublishResult {
  noticeId: string;
  contentType: "Job" | "AdmitCard" | "AnswerKey" | "Result" | "Recruitment";
  contentId: string;
  slug: string | null;
}

const d = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00Z") : null);

export async function publishNotice(noticeId: string, by: { adminId?: string | null } = {}): Promise<PublishResult> {
  const actor = by.adminId ?? PIPELINE_ACTOR;
  const notice = await prisma.recruitmentNotice.findUniqueOrThrow({
    where: { id: noticeId },
    include: { recruitment: { select: { id: true, examId: true, status: true, publishedAt: true, title: true, slug: true } }, exam: { select: { id: true, status: true, isAutoCreated: true } } },
  });
  if (notice.status === "PUBLISHED" && notice.publishedContentId) {
    return { noticeId, contentType: notice.publishedContentType as PublishResult["contentType"], contentId: notice.publishedContentId, slug: null };
  }
  if (notice.status === "DUPLICATE") throw new PublishError("This notice is marked as a duplicate — publish the original instead.");
  if (notice.status === "REJECTED") throw new PublishError("This notice was rejected. Re-open it before publishing.");
  if (!notice.recruitmentId || !notice.recruitment) throw new PublishError("Link the notice to a recruitment before publishing.");
  const data = (notice.extracted ?? {}) as Partial<NoticeExtraction>;
  const examId = notice.examId ?? notice.recruitment.examId;
  const needsExam = ["JOB", "ADMIT_CARD", "ANSWER_KEY", "RESULT", "MERIT_LIST", "SELECTION_LIST"].includes(notice.noticeType);
  if (needsExam && !examId) throw new PublishError("Link the notice to an exam before publishing (needed for the job/admit card/result page).");

  const now = new Date();
  const audit = (contentType: string, contentId: string, newValue: Prisma.InputJsonValue) =>
    recordAuditLog({ ...(by.adminId ? { adminUserId: by.adminId } : { actor: PIPELINE_ACTOR }), action: "PUBLISH", contentType, contentId, newValue });

  // 1. the recruitment (always) and a DRAFT auto-created exam go public
  await prisma.recruitment.update({
    where: { id: notice.recruitment.id },
    data: { status: "PUBLISHED", publishedAt: notice.recruitment.publishedAt ?? now, ...(examId && !notice.recruitment.examId ? { examId } : {}) },
  });
  if (examId) {
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { status: true, isAutoCreated: true } });
    if (exam && exam.status !== "PUBLISHED" && exam.isAutoCreated) {
      await prisma.exam.update({ where: { id: examId }, data: { status: "PUBLISHED", publishedAt: now, updatedBy: actor } });
    }
  }

  let result: PublishResult;
  const title = notice.title.slice(0, 200);
  const sourceUrl = notice.sourceUrl ?? undefined;
  const officialWebsite = data.official_notification_url ?? sourceUrl;

  switch (notice.noticeType) {
    case "JOB": {
      const slug = await uniqueSlug(title, async (c) => (await prisma.job.count({ where: { slug: c } })) > 0);
      const exam = await prisma.exam.findUniqueOrThrow({ where: { id: examId! }, select: { organizationId: true } });
      const job = await prisma.job.create({
        data: {
          title,
          slug,
          description: data.summary ?? null,
          status: "PUBLISHED",
          publishedAt: now,
          createdBy: actor,
          updatedBy: actor,
          examId: examId!,
          organizationId: exam.organizationId,
          recruitmentId: notice.recruitment.id,
          advertisementNumber: data.advertisement_number ?? null,
          vacancies: data.vacancies ?? null,
          qualification: data.eligibility?.education?.join(", ") || null,
          ageLimitMin: data.eligibility?.minimum_age ?? null,
          ageLimitMax: data.eligibility?.maximum_age ?? null,
          applicationFee: data.application_fee ? Number((data.application_fee.replace(/,/g, "").match(/\d+(?:\.\d+)?/) ?? ["0"])[0]) || null : null,
          officialWebsite: officialWebsite ?? null,
          applyUrl: data.official_apply_url ?? null,
          eligibility: [data.eligibility?.experience, data.eligibility?.nationality, data.reservation_information, data.physical_requirements].filter(Boolean).join("\n") || null,
          selectionProcess: data.selection_process?.length ? data.selection_process : undefined,
          salary: data.salary ?? null,
          applicationEndDate: d(data.application_end_date),
          notificationDocumentId: notice.documentId,
        },
        select: { id: true, slug: true },
      });
      await audit("Job", job.id, { title, slug, fromNotice: noticeId });
      await dispatchNotification({ type: "NEW_JOB", title, body: `A new job notification has been published: ${title}.`, targetType: "Job", targetId: job.id });
      result = { noticeId, contentType: "Job", contentId: job.id, slug: job.slug };
      break;
    }
    case "DEADLINE_EXTENSION":
    case "CORRIGENDUM": {
      const job = await prisma.job.findFirst({ where: { recruitmentId: notice.recruitment.id, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { id: true, slug: true, applicationEndDate: true } });
      if (job) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            ...(data.application_end_date ? { applicationEndDate: d(data.application_end_date) } : {}),
            ...(data.vacancies ? { vacancies: data.vacancies } : {}),
            updatedBy: actor,
          },
        });
        await audit("Job", job.id, { fromNotice: noticeId, noticeType: notice.noticeType, applicationEndDate: data.application_end_date ?? null });
        if (data.application_end_date) {
          await dispatchNotification({ type: "DEADLINE_UPDATE", title, body: `${notice.recruitment.title}: last date is now ${data.application_end_date}.`, targetType: "Job", targetId: job.id });
        }
        result = { noticeId, contentType: "Job", contentId: job.id, slug: job.slug };
      } else {
        result = { noticeId, contentType: "Recruitment", contentId: notice.recruitment.id, slug: notice.recruitment.slug };
      }
      break;
    }
    case "ADMIT_CARD": {
      const row = await prisma.admitCard.create({
        data: {
          title,
          slug: await uniqueSlug(title, async (c) => (await prisma.admitCard.count({ where: { slug: c } })) > 0),
          description: data.summary ?? null,
          status: "PUBLISHED",
          publishedAt: now,
          createdBy: actor,
          updatedBy: actor,
          examId: examId!,
          recruitmentId: notice.recruitment.id,
          releaseDate: d(data.admit_card_date),
          examDate: d(data.exam_date),
          downloadUrl: data.official_apply_url ?? sourceUrl ?? null,
          officialWebsite: officialWebsite ?? null,
        },
        select: { id: true, slug: true },
      });
      await audit("AdmitCard", row.id, { title, fromNotice: noticeId });
      await dispatchNotification({ type: "NEW_ADMIT_CARD", title, body: `Admit card released: ${title}.`, targetType: "AdmitCard", targetId: row.id });
      result = { noticeId, contentType: "AdmitCard", contentId: row.id, slug: row.slug };
      break;
    }
    case "ANSWER_KEY": {
      const row = await prisma.answerKey.create({
        data: {
          title,
          slug: await uniqueSlug(title, async (c) => (await prisma.answerKey.count({ where: { slug: c } })) > 0),
          description: data.summary ?? null,
          status: "PUBLISHED",
          publishedAt: now,
          createdBy: actor,
          updatedBy: actor,
          examId: examId!,
          recruitmentId: notice.recruitment.id,
          answerKeyDate: d(data.result_date) ?? d(notice.sourcePublishedAt?.toISOString().slice(0, 10) ?? null),
          answerKeyUrl: sourceUrl ?? null,
          objectionInfo: data.summary ?? null,
        },
        select: { id: true, slug: true },
      });
      await audit("AnswerKey", row.id, { title, fromNotice: noticeId });
      await dispatchNotification({ type: "NEW_ANSWER_KEY", title, body: `Answer key released: ${title}.`, targetType: "AnswerKey", targetId: row.id });
      result = { noticeId, contentType: "AnswerKey", contentId: row.id, slug: row.slug };
      break;
    }
    case "RESULT":
    case "MERIT_LIST":
    case "SELECTION_LIST": {
      const row = await prisma.result.create({
        data: {
          title,
          slug: await uniqueSlug(title, async (c) => (await prisma.result.count({ where: { slug: c } })) > 0),
          description: data.summary ?? null,
          status: "PUBLISHED",
          publishedAt: now,
          createdBy: actor,
          updatedBy: actor,
          examId: examId!,
          recruitmentId: notice.recruitment.id,
          resultDate: d(data.result_date),
          resultUrl: sourceUrl ?? null,
          officialWebsite: officialWebsite ?? null,
        },
        select: { id: true, slug: true },
      });
      await audit("Result", row.id, { title, fromNotice: noticeId });
      await dispatchNotification({ type: "NEW_RESULT", title, body: `Result declared: ${title}.`, targetType: "Result", targetId: row.id });
      result = { noticeId, contentType: "Result", contentId: row.id, slug: row.slug };
      break;
    }
    default: {
      // EXAM_DATE / EXAM_POSTPONED / EXAM_CANCELLED / INTERVIEW / DOCUMENT_VERIFICATION / OTHER
      result = { noticeId, contentType: "Recruitment", contentId: notice.recruitment.id, slug: notice.recruitment.slug };
      if (["EXAM_DATE", "EXAM_POSTPONED", "EXAM_CANCELLED"].includes(notice.noticeType)) {
        await dispatchNotification({ type: "EXAM_DATE_CHANGED", title, body: `${notice.recruitment.title}: ${title}.`, targetType: "Recruitment", targetId: notice.recruitment.id });
      }
    }
  }

  await prisma.recruitmentNotice.update({
    where: { id: noticeId },
    data: { status: "PUBLISHED", publishedAt: now, publishedContentType: result.contentType, publishedContentId: result.contentId, ...(by.adminId ? { reviewedBy: by.adminId, reviewedAt: now } : {}) },
  });
  await audit("RecruitmentNotice", noticeId, { contentType: result.contentType, contentId: result.contentId });
  return result;
}
