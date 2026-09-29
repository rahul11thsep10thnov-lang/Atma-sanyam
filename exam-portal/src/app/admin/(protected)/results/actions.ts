"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { resultInputSchema } from "@/lib/validation/result";
import {
  createResult,
  getResultForAdmin,
  updateResult,
  transitionResultStatus,
} from "@/lib/services/results";
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
    resultDate: String(formData.get("resultDate") ?? ""),
    resultUrl: String(formData.get("resultUrl") ?? ""),
    officialWebsite: String(formData.get("officialWebsite") ?? ""),
    relatedAdmitCardId: String(formData.get("relatedAdmitCardId") ?? ""),
    relatedAnswerKeyId: String(formData.get("relatedAnswerKeyId") ?? ""),
  };
}

export async function createResultAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create results." };
  }

  const parsed = resultInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createResult(parsed.data, admin.id);
  redirect(`/admin/results/${result.id}/edit`);
}

export async function updateResultAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getResultForAdmin(id);
  if (!existing) return { error: "Result not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this result." };
  }

  const parsed = resultInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateResult(id, parsed.data, admin.id);
  revalidatePath(`/admin/results/${id}/edit`);
  redirect(`/admin/results/${id}/edit?saved=${Date.now()}`);
}

export async function transitionResultAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getResultForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/results/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionResultStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/results/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/admin/results/${id}/edit`);
  redirect(`/admin/results/${id}/edit?saved=${Date.now()}`);
}
