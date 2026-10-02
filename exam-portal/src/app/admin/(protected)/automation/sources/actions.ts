"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { sourceInputSchema } from "@/lib/validation/source";
import {
  createSource,
  updateSource,
  setSourceActive,
  deleteSource,
} from "@/lib/services/sources";

export interface FormState {
  error?: string;
}

const SOURCE_ADMIN_ROLES = ["SUPER_ADMIN", "EDITOR"] as const;
const LIST = "/admin/automation/sources";

function readInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    organizationId: String(formData.get("organizationId") ?? ""),
    listingUrl: String(formData.get("listingUrl") ?? "").trim(),
    officialDomain: String(formData.get("officialDomain") ?? ""),
    sourceType: String(formData.get("sourceType") ?? "HTML"),
    rssUrl: String(formData.get("rssUrl") ?? ""),
    apiUrl: String(formData.get("apiUrl") ?? ""),
    parserType: String(formData.get("parserType") ?? ""),
    priority: String(formData.get("priority") ?? "NORMAL"),
    checkFrequencyMinutes: String(formData.get("checkFrequencyMinutes") ?? "360"),
    active: formData.get("active"),
  };
}

export async function createSourceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const parsed = sourceInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  let sourceId: string;
  try {
    sourceId = (await createSource(parsed.data, admin.id)).id;
  } catch (err) {
    // P2002 = unique constraint (listingUrl). Checked by code, not message
    // text, so a driver/version change in the wording can't break it.
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      return { error: "A source with that listing URL already exists." };
    }
    throw err;
  }
  revalidatePath(LIST);
  redirect(`${LIST}/${sourceId}/edit?saved=${Date.now()}`);
}

export async function updateSourceAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const parsed = sourceInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await updateSource(id, parsed.data, admin.id);
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}/edit`);
  redirect(`${LIST}/${id}/edit?saved=${Date.now()}`);
}

export async function toggleSourceActiveAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await setSourceActive(id, active, admin.id);
  revalidatePath(LIST);
  redirect(`${LIST}?updated=${Date.now()}`);
}

export async function deleteSourceAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  await deleteSource(id, admin.id);
  revalidatePath(LIST);
  redirect(`${LIST}?deleted=${Date.now()}`);
}
