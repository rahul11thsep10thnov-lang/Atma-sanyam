"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { articleInputSchema } from "@/lib/validation/article";
import {
  createArticle,
  getArticleForAdmin,
  updateArticle,
  transitionArticleStatus,
} from "@/lib/services/articles";
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
    body: String(formData.get("body") ?? ""),
    coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
  };
}

export async function createArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create articles." };
  }
  const parsed = articleInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const article = await createArticle(parsed.data, admin.id);
  redirect(`/admin/articles/${article.id}/edit`);
}

export async function updateArticleAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getArticleForAdmin(id);
  if (!existing) return { error: "Article not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this article." };
  }
  const parsed = articleInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await updateArticle(id, parsed.data, admin.id);
  revalidatePath(`/admin/articles/${id}/edit`);
  redirect(`/admin/articles/${id}/edit?saved=${Date.now()}`);
}

export async function transitionArticleAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;
  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getArticleForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/articles/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }
  try {
    await transitionArticleStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/articles/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/admin/articles/${id}/edit`);
  redirect(`/admin/articles/${id}/edit?saved=${Date.now()}`);
}
