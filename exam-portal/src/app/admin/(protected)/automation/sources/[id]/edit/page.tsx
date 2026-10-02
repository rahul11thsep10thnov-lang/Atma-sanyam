import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSourceForAdmin, sourceHealth } from "@/lib/services/sources";
import { listOrganizations } from "@/lib/services/lookups";
import { formatDate } from "@/lib/format";
import { SourceForm } from "../../SourceForm";
import { updateSourceAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Source" };

export default async function EditSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { id } = await params;
  const { saved, error } = await searchParams;
  const [source, organizations] = await Promise.all([getSourceForAdmin(id), listOrganizations()]);
  if (!source) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/automation/sources" className="text-sm text-brand-700 hover:underline">
          ← Back to sources
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Edit Source</h1>
          <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {sourceHealth(source)}
          </span>
        </div>
      </div>

      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <SourceForm
        action={updateSourceAction.bind(null, id)}
        initial={source}
        organizations={organizations}
        submitLabel="Save Changes"
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Recent checks</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Result</th>
                <th className="px-4 py-2">HTTP</th>
                <th className="px-4 py-2">Changed</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">New</th>
              </tr>
            </thead>
            <tbody>
              {source.checks.map((check) => (
                <tr key={check.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{formatDate(check.startedAt)}</td>
                  <td className="px-4 py-2">
                    {check.ok ? (
                      <span className="text-emerald-700">ok</span>
                    ) : (
                      <span className="text-red-600" title={check.error ?? undefined}>
                        failed{check.error ? ` — ${check.error.slice(0, 80)}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{check.httpStatus ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{check.changed ? "yes" : "no"}</td>
                  <td className="px-4 py-2 text-slate-600">{check.itemsFound}</td>
                  <td className="px-4 py-2 text-slate-600">{check.newItems}</td>
                </tr>
              ))}
              {source.checks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Not checked yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
