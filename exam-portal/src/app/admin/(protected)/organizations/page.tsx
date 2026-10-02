import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizationsForAdmin } from "@/lib/services/catalogue";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const orgs = await listOrganizationsForAdmin(q?.trim() || undefined);
  const auto = orgs.filter((o) => o.isAutoCreated).length;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Organizations</h1>
        <p className="mt-1 text-sm text-slate-600">{orgs.length} shown{auto ? `, ${auto} created by the pipeline and not yet confirmed` : ""}. Confirm a new one by editing it; merge accidental duplicates.</p>
      </div>
      <form method="get" className="flex items-end gap-3">
        <label className="text-xs text-slate-600">Search<input name="q" defaultValue={q ?? ""} className="mt-1 block w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="name, short name or alias" /></label>
        <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Search</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Aliases</th><th className="px-3 py-2">Exams</th><th className="px-3 py-2">Recruitments</th><th className="px-3 py-2">Notices</th><th className="px-3 py-2">Sources</th></tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/organizations/${o.id}/edit`} className="font-medium text-brand-700 hover:underline">{o.name}</Link>
                  {o.isAutoCreated ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">auto-created</span> : null}
                  {o.shortName ? <div className="text-xs text-slate-500">{o.shortName}</div> : null}
                </td>
                <td className="px-3 py-2 text-slate-600">{o.organizationType ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{o.state?.name ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{o._count.aliases}</td>
                <td className="px-3 py-2 text-slate-600">{o._count.exams}</td>
                <td className="px-3 py-2 text-slate-600">{o._count.recruitments}</td>
                <td className="px-3 py-2 text-slate-600">{o._count.notices}</td>
                <td className="px-3 py-2 text-slate-600">{o._count.sources}</td>
              </tr>
            ))}
            {orgs.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No organizations match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
