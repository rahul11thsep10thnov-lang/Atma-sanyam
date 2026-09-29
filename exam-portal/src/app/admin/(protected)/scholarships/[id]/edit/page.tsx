import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getScholarshipForAdmin } from "@/lib/services/scholarships";
import { listOrganizations, listStates } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { ScholarshipForm } from "../../ScholarshipForm";
import { updateScholarshipAction, transitionScholarshipAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Scholarship" };

export default async function EditScholarshipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const scholarship = await getScholarshipForAdmin(id);
  if (!scholarship) notFound();

  const [organizations, states] = await Promise.all([listOrganizations(), listStates()]);

  const editable = canEditContent(scholarship, admin);
  let transitions = availableTransitions(scholarship.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Scholarship</h1>
        <StatusBadge status={scholarship.status} />
      </div>

      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <StatusActions
        id={scholarship.id}
        transitions={transitions}
        action={transitionScholarshipAction}
      />

      {editable ? (
        <ScholarshipForm
          action={updateScholarshipAction.bind(null, id)}
          initial={scholarship}
          organizations={organizations}
          states={states}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This scholarship is {scholarship.status.toLowerCase().replace("_", " ")} and you
          don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
