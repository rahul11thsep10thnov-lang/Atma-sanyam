import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { listExamsForSelect } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { SyllabusForm } from "../SyllabusForm";
import { createSyllabusAction } from "../actions";

export const metadata: Metadata = { title: "New Syllabus" };

export default async function NewSyllabusPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const exams = await listExamsForSelect();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Syllabus</h1>
      {exams.length === 0 ? (
        <p className="text-sm text-slate-500">
          Create an exam first — every syllabus belongs to one.
        </p>
      ) : (
        <SyllabusForm
          action={createSyllabusAction}
          exams={exams}
          submitLabel="Save Draft"
        />
      )}
    </div>
  );
}
