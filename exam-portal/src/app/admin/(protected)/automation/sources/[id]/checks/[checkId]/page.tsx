import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSourceCheck } from "@/lib/services/sources";

export const metadata: Metadata = { title: "Check diagnostics" };

/** Diagnostic details of one source check: outcome, timings, final URL,
 * redirects, robots, warnings and a sample of what was parsed. */
export default async function CheckDiagnosticsPage({ params }: { params: Promise<{ id: string; checkId: string }> }) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { id, checkId } = await params;
  const check = await getSourceCheck(id, checkId);
  if (!check) notFound();
  const d = (check.diagnostics ?? {}) as {
    finalUrl?: string | null;
    redirects?: string[];
    robots?: string;
    warnings?: string[];
    sample?: Array<{ title: string; url: string }>;
    newNotices?: number;
    truncated?: boolean;
    summary?: string;
  };
  const rows: Array<[string, string]> = [
    ["Started", check.startedAt.toLocaleString("en-IN")],
    ["Finished", check.finishedAt?.toLocaleString("en-IN") ?? "—"],
    ["Duration", check.durationMs != null ? `${(check.durationMs / 1000).toFixed(2)} s` : "—"],
    ["Outcome", check.outcome ?? (check.ok ? "ok" : "failed")],
    ["HTTP status", String(check.httpStatus ?? "—")],
    ["Listing changed", check.changed ? "yes" : "no"],
    ["Pages fetched", String(check.pagesFetched)],
    ["Links found", String(check.itemsFound)],
    ["New documents", String(check.newItems)],
    ["Notices extracted", String(check.noticesExtracted)],
    ["New notices", String(d.newNotices ?? "—")],
    ["Duplicates skipped", String(check.duplicatesSkipped)],
    ["Final URL", d.finalUrl ?? "—"],
    ["Redirects", d.redirects?.length ? d.redirects.join(" → ") : "none"],
    ["robots.txt", d.robots ?? "—"],
    ["Pipeline run", check.pipelineRunId ?? "manual"],
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div>
        <Link href={`/admin/automation/sources/${id}/edit`} className="text-sm text-brand-700 hover:underline">
          ← {check.source.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Check diagnostics</h1>
      </div>
      {check.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm whitespace-pre-line text-red-700">
          {check.error}
        </p>
      ) : null}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium text-slate-500">{k}</dt>
            <dd className="break-all text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      {d.warnings?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Warnings</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
            {d.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {d.sample?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Sample of parsed links</h2>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {d.sample.map((s) => (
              <li key={s.url}>
                <span className="text-slate-800">{s.title}</span> <span className="font-mono text-xs break-all text-slate-500">{s.url}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {d.truncated ? <p className="text-xs text-slate-500">Diagnostics were truncated to stay within the storage bound.</p> : null}
    </div>
  );
}
