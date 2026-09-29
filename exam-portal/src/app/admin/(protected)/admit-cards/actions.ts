"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { admitCardInputSchema } from "@/lib/validation/admitCard";
import {
  createAdmitCard,
  getAdmitCardForAdmin,
  updateAdmitCard,
  transitionAdmitCardStatus,
} from "@/lib/services/admitCards";
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
    releaseDate: String(formData.get("releaseDate") ?? ""),
    examDate: String(formData.get("examDate") ?? ""),
    downloadUrl: String(formData.get("downloadUrl") ?? ""),
    officialWebsite: String(formData.get("officialWebsite") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
  };
}

export async function createAdmitCardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create admit cards." };
  }

  const parsed = admitCardInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admitCard = await createAdmitCard(parsed.data, admin.id);
  redirect(`/admin/admit-cards/${admitCard.id}/edit`);
}

export async function updateAdmitCardAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getAdmitCardForAdmin(id);
  if (!existing) return { error: "Admit card not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this admit card." };
  }

  const parsed = admitCardInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateAdmitCard(id, parsed.data, admin.id);
  revalidatePath(`/admin/admit-cards/${id}/edit`);
  redirect(`/admin/admit-cards/${id}/edit?saved=${Date.now()}`);
}

export async function transitionAdmitCardAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getAdmitCardForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/admit-cards/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionAdmitCardStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/admit-cards/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/admin/admit-cards/${id}/edit`);
  redirect(`/admin/admit-cards/${id}/edit?saved=${Date.now()}`);
}
