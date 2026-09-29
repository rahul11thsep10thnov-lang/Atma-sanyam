import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAdmissionForAdmin } from "@/lib/services/admissions";
import { listOrganizations, listCategories, listStates } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { AdmissionForm } from "../../AdmissionForm";
import { updateAdmissionAction, transitionAdmissionAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Admission" };

export default async function EditAdmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const admission = await getAdmissionForAdmin(id);
  if (!admission) notFound();

  const [organizations, categories, states] = await Promise.all([
    listOrganizations(),
    listCategories(),
    listStates(),
  ]);

  const editable = canEditContent(admission, admin);
  let transitions = availableTransitions(admission.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Admission</h1>
        <StatusBadge status={admission.status} />
      </div>

      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <StatusActions id={admission.id} transitions={transitions} action={transitionAdmissionAction} />

      {editable ? (
        <AdmissionForm
          action={updateAdmissionAction.bind(null, id)}
          initial={admission}
          organizations={organizations}
          categories={categories}
          states={states}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This admission is {admission.status.toLowerCase().replace("_", " ")} and you
          don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
