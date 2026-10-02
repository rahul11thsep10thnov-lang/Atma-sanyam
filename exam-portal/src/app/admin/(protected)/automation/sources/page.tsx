import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listSourcesForAdmin, sourceHealth, type SourceHealth } from "@/lib/services/sources";
import { formatDate } from "@/lib/format";
import { toggleSourceActiveAction, deleteSourceAction } from "./actions";

export const metadata: Metadata = { title: "Sources" };

const HEALTH_CLASS: Record<SourceHealth, string> = {
  healthy: "bg-emerald-100 text-emerald-800",
  stale: "bg-amber-100 text-amber-800",
  failing: "bg-red-100 text-red-700",
  never: "bg-slate-100 text-slate-600",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; deleted?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { deleted } = await searchParams;
  const sources = await listSourcesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sources</h1>
          <p className="mt-1 text-sm text-slate-600">
            Official pages and feeds the pipeline watches. {sources.length} configured,{" "}
            {sources.filter((s) => s.active).length} active.
          </p>
        </div>
        <Link
          href="/admin/automation/sources/new"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add source
        </Link>
      </div>

      {deleted ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Source deleted.</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Health</th>
              <th className="px-4 py-2">Last checked</th>
              <th className="px-4 py-2">Last success</th>
              <th className="px-4 py-2">Found</th>
              <th className="px-4 py-2">Fails</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const health = sourceHealth(source);
              return (
                <tr key={source.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/automation/sources/${source.id}/edit`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {source.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {source.officialDomain}
                      {source.organization ? ` · ${source.organization.name}` : ""}
                      {!source.active ? " · disabled" : ""}
                    </div>
                    {source.lastError ? (
                      <div className="mt-1 max-w-xs truncate text-xs text-red-600" title={source.lastError}>
                        {source.lastError}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{source.sourceType}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {source.priority}
                    <div className="text-xs text-slate-400">every {source.checkFrequencyMinutes}m</div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${HEALTH_CLASS[health]}`}
                    >
                      {health}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(source.lastCheckedAt) ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(source.lastSuccessAt) ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {source.discoveredCount}
                    <div className="text-xs text-slate-400">
                      {source._count.documents} docs · {source._count.notices} notices
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{source.failureCount}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <form action={toggleSourceActiveAction}>
                        <input type="hidden" name="id" value={source.id} />
                        <input type="hidden" name="active" value={source.active ? "false" : "true"} />
                        <button type="submit" className="text-brand-700 hover:underline">
                          {source.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                      <form action={deleteSourceAction}>
                        <input type="hidden" name="id" value={source.id} />
                        <button type="submit" className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sources.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  No sources yet. Add an official notice-board URL, or run{" "}
                  <code className="font-mono">npm run seed:sources</code> for a starter list.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
