"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import {
  approveNotice,
  rejectNotice,
  reopenNotice,
  updateNotice,
  markDuplicate,
  mergeNotices,
  reextractNotice,
  NOTICE_TYPES_ALL,
  NOTICE_PRIORITIES,
  type NoticePatch,
} from "@/lib/pipeline/review";
import { publishNotice, PublishError } from "@/lib/pipeline/publish";
import type { NoticePriority, NoticeType } from "@/generated/prisma/enums";

const REVIEW_ROLES = ["SUPER_ADMIN", "EDITOR", "REVIEWER"] as const;
const PUBLISH_ROLES = ["SUPER_ADMIN", "EDITOR"] as const;

export interface FormState {
  error?: string;
}

function go(formData: FormData, fallback: string, params: Record<string, string>) {
  const to = String(formData.get("returnTo") || fallback);
  const url = new URL(to, "http://local");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("t", String(Date.now()));
  revalidatePath("/admin/automation", "layout");
  revalidatePath("/", "layout");
  redirect(url.pathname + url.search);
}

const idOf = (formData: FormData) => String(formData.get("id") ?? "");

export async function approveNoticeAction(formData: FormData) {
  const admin = await requireAdminApi([...REVIEW_ROLES]);
  const id = idOf(formData);
  await approveNotice(id, admin.id, String(formData.get("note") ?? "") || null);
  go(formData, `/admin/automation/inbox/${id}`, { done: "approved" });
}

export async function rejectNoticeAction(formData: FormData) {
  const admin = await requireAdminApi([...REVIEW_ROLES]);
  const id = idOf(formData);
  await rejectNotice(id, admin.id, String(formData.get("note") ?? "") || null);
  go(formData, `/admin/automation/inbox/${id}`, { done: "rejected" });
}

export async function reopenNoticeAction(formData: FormData) {
  const admin = await requireAdminApi([...REVIEW_ROLES]);
  const id = idOf(formData);
  await reopenNotice(id, admin.id);
  go(formData, `/admin/automation/inbox/${id}`, { done: "reopened", reopened: "1" });
}

export async function publishNoticeAction(formData: FormData) {
  const admin = await requireAdminApi([...PUBLISH_ROLES]);
  const id = idOf(formData);
  try {
    const res = await publishNotice(id, { adminId: admin.id });
    go(formData, `/admin/automation/inbox/${id}`, { done: "published", content: `${res.contentType}:${res.slug ?? res.contentId}` });
  } catch (err) {
    if (err instanceof PublishError) go(formData, `/admin/automation/inbox/${id}`, { error: err.message });
    throw err;
  }
}

export async function markDuplicateAction(formData: FormData) {
  const admin = await requireAdminApi([...REVIEW_ROLES]);
  const id = idOf(formData);
  const ofId = String(formData.get("ofId") ?? "").trim();
  const merge = formData.get("merge") === "true";
  if (!ofId) go(formData, `/admin/automation/inbox/${id}`, { error: "Enter the id of the original notice." });
  try {
    if (merge) await mergeNotices(id, ofId, admin.id);
    else await markDuplicate(id, ofId, admin.id);
  } catch (err) {
    go(formData, `/admin/automation/inbox/${id}`, { error: err instanceof Error ? err.message : "Could not mark as duplicate." });
  }
  go(formData, `/admin/automation/inbox/${id}`, { done: merge ? "merged" : "duplicate" });
}

export async function reextractNoticeAction(formData: FormData) {
  const admin = await requireAdminApi([...PUBLISH_ROLES]);
  const id = idOf(formData);
  const res = await reextractNotice(id, admin.id);
  go(formData, `/admin/automation/inbox/${id}`, { done: res ? `re-extracted (${res.status})` : "re-extraction produced nothing" });
}

const isoOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};
const intOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
};

export async function updateNoticeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminApi([...REVIEW_ROLES]);
  const id = idOf(formData);
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  const noticeType = String(formData.get("noticeType") ?? "") as NoticeType;
  const priority = String(formData.get("priority") ?? "") as NoticePriority;
  if (!NOTICE_TYPES_ALL.includes(noticeType)) return { error: "Unknown notice type." };
  if (!NOTICE_PRIORITIES.includes(priority)) return { error: "Unknown priority." };
  for (const k of ["application_start_date", "application_end_date", "exam_date", "admit_card_date", "result_date"]) {
    const v = isoOrNull(formData.get(k));
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `${k.replace(/_/g, " ")} must be yyyy-mm-dd.` };
  }
  const patch: NoticePatch = {
    title,
    titleHi: isoOrNull(formData.get("titleHi")),
    summary: isoOrNull(formData.get("summary")),
    summaryHi: isoOrNull(formData.get("summaryHi")),
    noticeType,
    priority,
    examId: isoOrNull(formData.get("examId")),
    recruitmentId: isoOrNull(formData.get("recruitmentId")),
    extracted: {
      advertisement_number: isoOrNull(formData.get("advertisement_number")),
      vacancies: intOrNull(formData.get("vacancies")),
      application_start_date: isoOrNull(formData.get("application_start_date")),
      application_end_date: isoOrNull(formData.get("application_end_date")),
      exam_date: isoOrNull(formData.get("exam_date")),
      admit_card_date: isoOrNull(formData.get("admit_card_date")),
      result_date: isoOrNull(formData.get("result_date")),
      application_fee: isoOrNull(formData.get("application_fee")),
      salary: isoOrNull(formData.get("salary")),
      official_notification_url: isoOrNull(formData.get("official_notification_url")),
      official_apply_url: isoOrNull(formData.get("official_apply_url")),
    },
  };
  try {
    await updateNotice(id, admin.id, patch);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  revalidatePath("/admin/automation", "layout");
  redirect(`/admin/automation/inbox/${id}?done=saved&t=${Date.now()}`);
}
