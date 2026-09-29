import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizations, listStates } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { ScholarshipForm } from "../ScholarshipForm";
import { createScholarshipAction } from "../actions";

export const metadata: Metadata = { title: "New Scholarship" };

export default async function NewScholarshipPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const [organizations, states] = await Promise.all([listOrganizations(), listStates()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Scholarship</h1>
      <ScholarshipForm
        action={createScholarshipAction}
        organizations={organizations}
        states={states}
        submitLabel="Save Draft"
      />
    </div>
  );
}
