"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { addOrganizationAlias, mergeOrganizations, ORGANIZATION_TYPES, removeOrganizationAlias, updateOrganization } from "@/lib/services/catalogue";
import type { OrganizationType } from "@/generated/prisma/enums";

const ROLES = ["SUPER_ADMIN", "EDITOR"] as const;
export interface FormState { error?: string }

function done(path: string, params: Record<string, string>) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  const p = new URLSearchParams({ ...params, t: String(Date.now()) });
  redirect(`${path}?${p}`);
}

export async function updateOrganizationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminApi([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Name is required." };
  const type = String(formData.get("organizationType") ?? "");
  const website = String(formData.get("website") ?? "").trim();
  if (website && !/^https?:\/\//.test(website)) return { error: "Website must start with http:// or https://." };
  try {
    await updateOrganization(id, {
      name,
      shortName: String(formData.get("shortName") ?? "").trim() || null,
      organizationType: ORGANIZATION_TYPES.includes(type as OrganizationType) ? (type as OrganizationType) : null,
      stateId: String(formData.get("stateId") ?? "") || null,
      website: website || null,
      description: String(formData.get("description") ?? "").trim() || null,
    }, admin.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  done(`/admin/organizations/${id}/edit`, { saved: "1" });
  return {};
}

export async function addAliasAction(formData: FormData) {
  const admin = await requireAdminApi([...ROLES]);
  const id = String(formData.get("id") ?? "");
  try {
    await addOrganizationAlias(id, String(formData.get("alias") ?? ""), admin.id);
  } catch (err) {
    done(`/admin/organizations/${id}/edit`, { error: err instanceof Error ? err.message : "Could not add alias." });
  }
  done(`/admin/organizations/${id}/edit`, { saved: "1" });
}

export async function removeAliasAction(formData: FormData) {
  const admin = await requireAdminApi([...ROLES]);
  const id = String(formData.get("id") ?? "");
  await removeOrganizationAlias(String(formData.get("aliasId") ?? ""), admin.id);
  done(`/admin/organizations/${id}/edit`, { saved: "1" });
}

export async function mergeOrganizationAction(formData: FormData) {
  const admin = await requireAdminApi([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const intoId = String(formData.get("intoId") ?? "");
  try {
    await mergeOrganizations(id, intoId, admin.id);
  } catch (err) {
    done(`/admin/organizations/${id}/edit`, { error: err instanceof Error ? err.message : "Could not merge." });
  }
  done(`/admin/organizations/${intoId}/edit`, { merged: "1" });
}
