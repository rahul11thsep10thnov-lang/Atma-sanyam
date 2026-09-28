import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  listExamsForSelect,
  listAdmitCardsForSelect,
  listAnswerKeysForSelect,
} from "@/lib/services/lookups";
import { canCreateContent } from "@/lib/services/ownership";
import { ResultForm } from "../ResultForm";
import { createResultAction } from "../actions";

export const metadata: Metadata = { title: "New Result" };

export default async function NewResultPage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  const [exams, admitCards, answerKeys] = await Promise.all([
    listExamsForSelect(),
    listAdmitCardsForSelect(),
    listAnswerKeysForSelect(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Result</h1>
      {exams.length === 0 ? (
        <p className="text-sm text-slate-500">
          Create an exam first — every result belongs to one.
        </p>
      ) : (
        <ResultForm
          action={createResultAction}
          exams={exams}
          admitCards={admitCards}
          answerKeys={answerKeys}
          submitLabel="Save Draft"
        />
      )}
    </div>
  );
}
