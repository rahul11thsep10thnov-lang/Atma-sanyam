"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { answerKeyInputSchema } from "@/lib/validation/answerKey";
import {
  createAnswerKey,
  getAnswerKeyForAdmin,
  updateAnswerKey,
  transitionAnswerKeyStatus,
} from "@/lib/services/answerKeys";
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
    answerKeyDate: String(formData.get("answerKeyDate") ?? ""),
    answerKeyUrl: String(formData.get("answerKeyUrl") ?? ""),
    objectionDeadline: String(formData.get("objectionDeadline") ?? ""),
    objectionInfo: String(formData.get("objectionInfo") ?? ""),
  };
}

export async function createAnswerKeyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create answer keys." };
  }

  const parsed = answerKeyInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const answerKey = await createAnswerKey(parsed.data, admin.id);
  redirect(`/admin/answer-keys/${answerKey.id}/edit`);
}

export async function updateAnswerKeyAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getAnswerKeyForAdmin(id);
  if (!existing) return { error: "Answer key not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this answer key." };
  }

  const parsed = answerKeyInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateAnswerKey(id, parsed.data, admin.id);
  revalidatePath(`/admin/answer-keys/${id}/edit`);
  redirect(`/admin/answer-keys/${id}/edit?saved=${Date.now()}`);
}

export async function transitionAnswerKeyAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getAnswerKeyForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/answer-keys/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionAnswerKeyStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/answer-keys/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/admin/answer-keys/${id}/edit`);
  redirect(`/admin/answer-keys/${id}/edit?saved=${Date.now()}`);
}
