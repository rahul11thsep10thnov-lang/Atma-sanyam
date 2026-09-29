"use server";

import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { admissionInputSchema } from "@/lib/validation/admission";
import {
  createAdmission,
  getAdmissionForAdmin,
  updateAdmission,
  transitionAdmissionStatus,
} from "@/lib/services/admissions";
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
    categoryId: String(formData.get("categoryId") ?? ""),
    stateId: String(formData.get("stateId") ?? ""),
    applicationStartDate: String(formData.get("applicationStartDate") ?? ""),
    applicationEndDate: String(formData.get("applicationEndDate") ?? ""),
    eligibility: String(formData.get("eligibility") ?? ""),
    officialWebsite: String(formData.get("officialWebsite") ?? ""),
  };
}

export async function createAdmissionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create admissions." };
  }
  const parsed = admissionInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const admission = await createAdmission(parsed.data, admin.id);
  redirect(`/admin/admissions/${admission.id}/edit`);
}

export async function updateAdmissionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getAdmissionForAdmin(id);
  if (!existing) return { error: "Admission not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this admission." };
  }
  const parsed = admissionInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await updateAdmission(id, parsed.data, admin.id);
  redirect(`/admin/admissions/${id}/edit?saved=1`);
}

export async function transitionAdmissionAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;
  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getAdmissionForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/admissions/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }
  try {
    await transitionAdmissionStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/admissions/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect(`/admin/admissions/${id}/edit?saved=1`);
}
