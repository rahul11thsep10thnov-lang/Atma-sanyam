"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { examInputSchema } from "@/lib/validation/exam";
import { createExam, getExamForAdmin, updateExam, transitionExamStatus } from "@/lib/services/exams";
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
    examDate: String(formData.get("examDate") ?? ""),
    applicationStartDate: String(formData.get("applicationStartDate") ?? ""),
    applicationEndDate: String(formData.get("applicationEndDate") ?? ""),
  };
}

export async function createExamAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create exams." };
  }

  const parsed = examInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const exam = await createExam(parsed.data, admin.id);
  redirect(`/admin/exams/${exam.id}/edit`);
}

export async function updateExamAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getExamForAdmin(id);
  if (!existing) return { error: "Exam not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this exam." };
  }

  const parsed = examInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateExam(id, parsed.data, admin.id);
  revalidatePath(`/admin/exams/${id}/edit`);
  redirect(`/admin/exams/${id}/edit?saved=${Date.now()}`);
}

export async function transitionExamAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  // An AUTHOR may only submit their OWN drafts for review — the role
  // check in workflow.ts alone doesn't know about ownership.
  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getExamForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/exams/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionExamStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/exams/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/admin/exams/${id}/edit`);
  redirect(`/admin/exams/${id}/edit?saved=${Date.now()}`);
}
