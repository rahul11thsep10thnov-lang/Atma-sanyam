import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizations, listCategories, listStates } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { redirect } from "next/navigation";
import { ExamForm } from "../ExamForm";
import { createExamAction } from "../actions";

export const metadata: Metadata = { title: "New Exam" };

export default async function NewExamPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const [organizations, categories, states] = await Promise.all([
    listOrganizations(),
    listCategories(),
    listStates(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Exam</h1>
      <ExamForm
        action={createExamAction}
        organizations={organizations}
        categories={categories}
        states={states}
        submitLabel="Save Draft"
      />
    </div>
  );
}
