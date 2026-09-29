import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { listExamsForSelect } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { AnswerKeyForm } from "../AnswerKeyForm";
import { createAnswerKeyAction } from "../actions";

export const metadata: Metadata = { title: "New Answer Key" };

export default async function NewAnswerKeyPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const exams = await listExamsForSelect();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Answer Key</h1>
      {exams.length === 0 ? (
        <p className="text-sm text-slate-500">
          Create an exam first — every answer key belongs to one.
        </p>
      ) : (
        <AnswerKeyForm
          action={createAnswerKeyAction}
          exams={exams}
          submitLabel="Save Draft"
        />
      )}
    </div>
  );
}
