"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import {
  uploadDocument,
  setDocumentVerified,
  deleteDocument,
  DocumentValidationError,
} from "@/lib/services/documents";
import { startExtractionJob } from "@/lib/services/extraction";
import { canCreateContent } from "@/lib/services/ownership";
import type { DocumentType } from "@/generated/prisma/enums";

export interface FormState {
  error?: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "JOB_NOTIFICATION",
  "RESULT",
  "ADMIT_CARD",
  "ANSWER_KEY",
  "SYLLABUS",
  "ADMISSION",
  "SCHOLARSHIP",
  "OTHER",
];

export async function uploadDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    return { error: "You don't have permission to upload documents." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to upload." };
  }
  const documentType = String(formData.get("documentType") ?? "");
  if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
    return { error: "Choose a valid document type." };
  }
  const examId = String(formData.get("examId") ?? "") || undefined;
  const organizationId = String(formData.get("organizationId") ?? "") || undefined;
  const sourceUrl = String(formData.get("sourceUrl") ?? "") || undefined;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadDocument(
      {
        file: {
          buffer,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
        documentType: documentType as DocumentType,
        examId,
        organizationId,
        sourceUrl,
      },
      admin.id,
    );
  } catch (err) {
    if (err instanceof DocumentValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  redirect("/admin/documents?uploaded=1");
}

export async function toggleVerifiedAction(formData: FormData) {
  const admin = await requireAdminApi();
  const id = String(formData.get("id"));
  const verified = String(formData.get("verified")) === "true";
  await setDocumentVerified(id, verified, admin.id);
  revalidatePath("/admin/documents");
  // `revalidatePath` alone isn't enough here: redirecting to the exact
  // URL the client is already on gets treated as a no-op navigation and
  // Next.js reuses the RSC payload it already had, not the revalidated
  // one — confirmed live (DB updates correctly; a soft nav back to the
  // identical URL still showed the pre-toggle status; a hard reload
  // showed the right one). A distinguishing query param, the same
  // pattern every other admin action in this app already uses, forces
  // an actual navigation instead. Timestamped (not a static "1") so two
  // consecutive toggles never redirect to the same URL twice in a row.
  redirect(`/admin/documents?updated=${Date.now()}`);
}

export async function runExtractionAction(formData: FormData) {
  const admin = await requireAdminApi();
  if (!canCreateContent(admin.role)) {
    redirect(
      `/admin/documents?error=${encodeURIComponent("You don't have permission to run extraction.")}`,
    );
  }
  const id = String(formData.get("id"));
  await startExtractionJob(id, admin.id);
  revalidatePath("/admin/documents");
  redirect(`/admin/documents?updated=${Date.now()}`);
}

export async function deleteDocumentAction(formData: FormData) {
  const admin = await requireAdminApi();
  if (admin.role !== "EDITOR" && admin.role !== "SUPER_ADMIN") {
    redirect(
      `/admin/documents?error=${encodeURIComponent("Only editors and super admins can delete documents.")}`,
    );
  }
  const id = String(formData.get("id"));
  await deleteDocument(id, admin.id);
  revalidatePath("/admin/documents");
  redirect("/admin/documents?deleted=1");
}
