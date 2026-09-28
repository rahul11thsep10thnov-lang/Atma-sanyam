import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { listExamsForSelect } from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { AdmitCardForm } from "../AdmitCardForm";
import { createAdmitCardAction } from "../actions";

export const metadata: Metadata = { title: "New Admit Card" };

export default async function NewAdmitCardPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const exams = await listExamsForSelect();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Admit Card</h1>
      {exams.length === 0 ? (
        <p className="text-sm text-slate-500">
          Create an exam first — every admit card belongs to one.
        </p>
      ) : (
        <AdmitCardForm
          action={createAdmitCardAction}
          exams={exams}
          submitLabel="Save Draft"
        />
      )}
    </div>
  );
}
