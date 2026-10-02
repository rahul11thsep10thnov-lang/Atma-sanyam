import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { listPipelineRuns } from "@/lib/pipeline/runner";
import { isPipelinePaused } from "@/lib/pipeline/settings";
import { runPipelineNowAction, setPausedAction } from "../actions";

export const metadata: Metadata = { title: "Pipeline runs" };

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

type RunLog = { sources?: Array<{ name: string; ok: boolean; newItems: number; notices: number; error: string | null }>; retries?: Array<{ errorId: string; ok: boolean; message?: string }>; error?: string };

export default async function PipelineRunsPage({ searchParams }: { searchParams: Promise<{ ran?: string }> }) {
  const admin = await requireAdmin();
  const { ran } = await searchParams;
  const [runs, paused] = await Promise.all([listPipelineRuns(50), isPipelinePaused()]);
  const canOperate = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pipeline runs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every scheduled or manual pass. Scheduled via <code className="font-mono">vercel.json</code> cron / <code className="font-mono">CRON_SECRET</code> or <code className="font-mono">npm run pipeline:worker</code>.
            {paused ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">paused</span> : null}
          </p>
        </div>
        {canOperate ? (
          <div className="flex gap-2">
            <form action={runPipelineNowAction}>
              <input type="hidden" name="returnTo" value="/admin/automation/pipeline" />
              <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">Run now</button>
            </form>
            <form action={runPipelineNowAction}>
              <input type="hidden" name="returnTo" value="/admin/automation/pipeline" />
              <input type="hidden" name="force" value="true" />
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" title="Check every active source even if it is not due">Run all sources</button>
            </form>
            <form action={setPausedAction}>
              <input type="hidden" name="returnTo" value="/admin/automation/pipeline" />
              <input type="hidden" name="paused" value={paused ? "false" : "true"} />
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{paused ? "Resume" : "Pause"}</button>
            </form>
          </div>
        ) : null}
      </div>

      {ran ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {ran === "running" ? "A run was already in progress — nothing started." : ran === "paused" ? "The schedule is paused; manual runs still work." : `Run ${ran.toLowerCase()}.`}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Sources</th>
              <th className="px-3 py-2">New docs</th>
              <th className="px-3 py-2">Notices</th>
              <th className="px-3 py-2">Dup</th>
              <th className="px-3 py-2">Review</th>
              <th className="px-3 py-2">Auto</th>
              <th className="px-3 py-2">Fail</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const log = (r.log ?? {}) as RunLog;
              const ms = r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null;
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-700">
                    {fmt(r.startedAt)}
                    <details className="mt-1 text-xs text-slate-500">
                      <summary className="cursor-pointer">details</summary>
                      <ul className="mt-1 list-disc pl-4">
                        {(log.sources ?? []).map((s, i) => (
                          <li key={i} className={s.ok ? "" : "text-red-600"}>
                            {s.name}: {s.ok ? `${s.newItems} new, ${s.notices} notices` : s.error ?? "failed"}
                          </li>
                        ))}
                        {(log.retries ?? []).map((x, i) => (
                          <li key={`r${i}`} className={x.ok ? "" : "text-red-600"}>retry {x.errorId.slice(-6)}: {x.ok ? "ok" : x.message ?? "failed"}</li>
                        ))}
                        {log.error ? <li className="text-red-600">{log.error}</li> : null}
                        {!log.sources?.length && !log.retries?.length && !log.error ? <li>nothing was due</li> : null}
                      </ul>
                    </details>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.trigger}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : r.status === "RUNNING" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-700"}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`}</td>
                  <td className="px-3 py-2 text-slate-600">{r.sourcesChecked}</td>
                  <td className="px-3 py-2 text-slate-600">{r.newDocuments}</td>
                  <td className="px-3 py-2 text-slate-600">{r.newNotices} / {r.updatedNotices}</td>
                  <td className="px-3 py-2 text-slate-600">{r.duplicates}</td>
                  <td className="px-3 py-2 text-slate-600">{r.needsReview}</td>
                  <td className="px-3 py-2 text-slate-600">{r.autoPublished}</td>
                  <td className={`px-3 py-2 ${r.failures ? "text-red-600" : "text-slate-600"}`}>{r.failures}</td>
                </tr>
              );
            })}
            {runs.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-slate-500">No runs yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
