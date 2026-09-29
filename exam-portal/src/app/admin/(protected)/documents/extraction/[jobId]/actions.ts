"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import {
  acceptField,
  editField,
  rejectField,
  approveExtractionJob,
  rejectExtractionJob,
  ReviewError,
} from "@/lib/services/extractionReview";

function jobUrl(jobId: string) {
  return `/admin/documents/extraction/${jobId}?updated=${Date.now()}`;
}

function errorUrl(jobId: string, message: string) {
  return `/admin/documents/extraction/${jobId}?error=${encodeURIComponent(message)}`;
}

async function withReviewErrorHandling(jobId: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (err) {
    if (err instanceof ReviewError) {
      redirect(errorUrl(jobId, err.message));
    }
    throw err;
  }
  revalidatePath(`/admin/documents/extraction/${jobId}`);
  revalidatePath("/admin/documents");
  redirect(jobUrl(jobId));
}

export async function acceptFieldAction(formData: FormData) {
  const admin = await requireAdminApi();
  const resultId = String(formData.get("resultId"));
  const jobId = String(formData.get("jobId"));
  await withReviewErrorHandling(jobId, () => acceptField(resultId, jobId, admin.id, admin.role));
}

export async function editFieldAction(formData: FormData) {
  const admin = await requireAdminApi();
  const resultId = String(formData.get("resultId"));
  const jobId = String(formData.get("jobId"));
  const humanValue = String(formData.get("humanValue") ?? "");
  await withReviewErrorHandling(jobId, () =>
    editField(resultId, jobId, humanValue, admin.id, admin.role),
  );
}

export async function rejectFieldAction(formData: FormData) {
  const admin = await requireAdminApi();
  const resultId = String(formData.get("resultId"));
  const jobId = String(formData.get("jobId"));
  const reason = String(formData.get("reason") ?? "");
  await withReviewErrorHandling(jobId, () =>
    rejectField(resultId, jobId, reason, admin.id, admin.role),
  );
}

export async function approveJobAction(formData: FormData) {
  const admin = await requireAdminApi();
  const jobId = String(formData.get("jobId"));
  await withReviewErrorHandling(jobId, () => approveExtractionJob(jobId, admin.id, admin.role));
}

export async function rejectJobAction(formData: FormData) {
  const admin = await requireAdminApi();
  const jobId = String(formData.get("jobId"));
  const reason = String(formData.get("reason") ?? "");
  await withReviewErrorHandling(jobId, () =>
    rejectExtractionJob(jobId, reason, admin.id, admin.role),
  );
}
