"use server";

import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { jobInputSchema } from "@/lib/validation/job";
import { createJob, getJobForAdmin, updateJob, transitionJobStatus } from "@/lib/services/jobs";
import { canCreateContent, canEditContent } from "@/lib/services/ownership";
import { InvalidTransitionError } from "@/lib/services/workflow";
import type { Transition } from "@/lib/services/workflow";

export interface FormState {
  error?: string;
}

function readInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    examId: String(formData.get("examId") ?? ""),
    advertisementNumber: String(formData.get("advertisementNumber") ?? ""),
    vacancies: String(formData.get("vacancies") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    ageLimitMin: String(formData.get("ageLimitMin") ?? ""),
    ageLimitMax: String(formData.get("ageLimitMax") ?? ""),
    applicationFee: String(formData.get("applicationFee") ?? ""),
    officialWebsite: String(formData.get("officialWebsite") ?? ""),
    applyUrl: String(formData.get("applyUrl") ?? ""),
    eligibility: String(formData.get("eligibility") ?? ""),
    selectionProcess: String(formData.get("selectionProcess") ?? ""),
    salary: String(formData.get("salary") ?? ""),
    applicationEndDate: String(formData.get("applicationEndDate") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    seoKeywords: String(formData.get("seoKeywords") ?? ""),
  };
}

export async function createJobAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create jobs." };
  }

  const parsed = jobInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const job = await createJob(parsed.data, admin.id);
  redirect(`/admin/jobs/${job.id}/edit`);
}

export async function updateJobAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getJobForAdmin(id);
  if (!existing) return { error: "Job not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this job." };
  }

  const parsed = jobInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateJob(id, parsed.data, admin.id);
  redirect(`/admin/jobs/${id}/edit?saved=1`);
}

export async function transitionJobAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getJobForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/jobs/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionJobStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/jobs/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect(`/admin/jobs/${id}/edit?saved=1`);
}
