"use server";

import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { scholarshipInputSchema } from "@/lib/validation/scholarship";
import {
  createScholarship,
  getScholarshipForAdmin,
  updateScholarship,
  transitionScholarshipStatus,
} from "@/lib/services/scholarships";
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
    organizationId: String(formData.get("organizationId") ?? ""),
    stateId: String(formData.get("stateId") ?? ""),
    applicationEndDate: String(formData.get("applicationEndDate") ?? ""),
    eligibility: String(formData.get("eligibility") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    officialWebsite: String(formData.get("officialWebsite") ?? ""),
  };
}

export async function createScholarshipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create scholarships." };
  }
  const parsed = scholarshipInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const scholarship = await createScholarship(parsed.data, admin.id);
  redirect(`/admin/scholarships/${scholarship.id}/edit`);
}

export async function updateScholarshipAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getScholarshipForAdmin(id);
  if (!existing) return { error: "Scholarship not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this scholarship." };
  }
  const parsed = scholarshipInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await updateScholarship(id, parsed.data, admin.id);
  redirect(`/admin/scholarships/${id}/edit?saved=1`);
}

export async function transitionScholarshipAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;
  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getScholarshipForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/scholarships/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }
  try {
    await transitionScholarshipStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/scholarships/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect(`/admin/scholarships/${id}/edit?saved=1`);
}
