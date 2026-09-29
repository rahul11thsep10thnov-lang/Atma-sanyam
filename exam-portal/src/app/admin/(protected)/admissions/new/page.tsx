import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizations, listCategories, listStates } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { AdmissionForm } from "../AdmissionForm";
import { createAdmissionAction } from "../actions";

export const metadata: Metadata = { title: "New Admission" };

export default async function NewAdmissionPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const [organizations, categories, states] = await Promise.all([
    listOrganizations(),
    listCategories(),
    listStates(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Admission</h1>
      <AdmissionForm
        action={createAdmissionAction}
        organizations={organizations}
        categories={categories}
        states={states}
        submitLabel="Save Draft"
      />
    </div>
  );
}
