"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { syllabusInputSchema, topicInputSchema, paperNameSchema } from "@/lib/validation/syllabus";
import { parseList } from "@/lib/validation/shared";
import {
  createSyllabus,
  getSyllabusForAdmin,
  updateSyllabus,
  transitionSyllabusStatus,
  addPaper,
  deletePaper,
  addSubject,
  deleteSubject,
  addTopic,
  deleteTopic,
} from "@/lib/services/syllabi";
import { canCreateContent, canEditContent } from "@/lib/services/ownership";
import { InvalidTransitionError } from "@/lib/services/workflow";
import type { Transition } from "@/lib/services/workflow";

export interface FormState {
  error?: string;
}

async function assertCanEditSyllabus(syllabusId: string) {
  const admin = await requireAdminApi();
  const syllabus = await getSyllabusForAdmin(syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");
  if (!canEditContent(syllabus, admin)) {
    throw new Error("You don't have permission to edit this syllabus.");
  }
  return admin;
}

export async function createSyllabusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to create a syllabus." };
  }

  const parsed = syllabusInputSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    examId: String(formData.get("examId") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const syllabus = await createSyllabus(parsed.data, admin.id);
  redirect(`/admin/syllabi/${syllabus.id}/edit`);
}

export async function updateSyllabusAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  const existing = await getSyllabusForAdmin(id);
  if (!existing) return { error: "Syllabus not found." };
  if (!canEditContent(existing, admin)) {
    return { error: "You don't have permission to edit this syllabus." };
  }

  const parsed = syllabusInputSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    examId: String(formData.get("examId") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateSyllabus(id, parsed.data, admin.id);
  redirect(`/admin/syllabi/${id}/edit?saved=1`);
}

export async function transitionSyllabusAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const transition = String(formData.get("transition")) as Transition;

  if (transition === "SUBMIT_FOR_REVIEW" && admin.role === "AUTHOR") {
    const existing = await getSyllabusForAdmin(id);
    if (!existing || !canEditContent(existing, admin)) {
      redirect(
        `/admin/syllabi/${id}/edit?error=${encodeURIComponent("You can only submit your own drafts for review.")}`,
      );
    }
  }

  try {
    await transitionSyllabusStatus(id, transition, admin.role, admin.id);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      redirect(`/admin/syllabi/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect(`/admin/syllabi/${id}/edit?saved=1`);
}

// --- Structural actions: plain forms, full-page redirects, no client JS ---
//
// Every one of these redirects back to the exact edit URL the form was
// submitted from. `revalidatePath` plus a `?updated=` cache-busting
// param (rather than the bare URL) is required — confirmed live for the
// same pattern in documents/actions.ts: a same-URL redirect after a
// Server Action can get treated as a no-op navigation and reuse the
// pre-mutation RSC payload even with `revalidatePath` alone.

function editUrl(syllabusId: string) {
  return `/admin/syllabi/${syllabusId}/edit?updated=${Date.now()}`;
}

export async function addPaperAction(formData: FormData) {
  const syllabusId = String(formData.get("syllabusId"));
  const admin = await assertCanEditSyllabus(syllabusId);
  const name = paperNameSchema.safeParse(formData.get("name"));
  if (name.success) {
    await addPaper(syllabusId, name.data, admin.id);
  }
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}

export async function deletePaperAction(formData: FormData) {
  const paperId = String(formData.get("paperId"));
  const syllabusId = String(formData.get("syllabusId"));
  await assertCanEditSyllabus(syllabusId);
  await deletePaper(paperId, (await requireAdminApi()).id);
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}

export async function addSubjectAction(formData: FormData) {
  const paperId = String(formData.get("paperId"));
  const syllabusId = String(formData.get("syllabusId"));
  const admin = await assertCanEditSyllabus(syllabusId);
  const name = paperNameSchema.safeParse(formData.get("name"));
  if (name.success) {
    await addSubject(paperId, name.data, admin.id);
  }
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}

export async function deleteSubjectAction(formData: FormData) {
  const subjectId = String(formData.get("subjectId"));
  const syllabusId = String(formData.get("syllabusId"));
  const admin = await assertCanEditSyllabus(syllabusId);
  await deleteSubject(subjectId, admin.id);
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}

export async function addTopicAction(formData: FormData) {
  const subjectId = String(formData.get("subjectId"));
  const syllabusId = String(formData.get("syllabusId"));
  const admin = await assertCanEditSyllabus(syllabusId);
  const parsed = topicInputSchema.safeParse({
    name: formData.get("name"),
    subtopics: formData.get("subtopics"),
  });
  if (parsed.success) {
    await addTopic(subjectId, parsed.data.name, parseList(parsed.data.subtopics), admin.id);
  }
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}

export async function deleteTopicAction(formData: FormData) {
  const topicId = String(formData.get("topicId"));
  const syllabusId = String(formData.get("syllabusId"));
  const admin = await assertCanEditSyllabus(syllabusId);
  await deleteTopic(topicId, admin.id);
  revalidatePath(`/admin/syllabi/${syllabusId}/edit`);
  redirect(editUrl(syllabusId));
}
