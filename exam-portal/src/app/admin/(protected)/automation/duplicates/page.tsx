import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDuplicateGroups } from "@/lib/pipeline/review";
import { NoticeStatusBadge } from "@/components/admin/NoticeBadges";
import { reopenNoticeAction } from "../inbox/actions";

export const metadata: Metadata = { title: "Duplicates" };

export default async function DuplicatesPage({ searchParams }: { searchParams: Promise<{ reopened?: string }> }) {
  const admin = await requireAdmin();
  const { reopened } = await searchParams;
  const rows = await listDuplicateGroups(200);
  const canReview = admin.role !== "AUTHOR";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Duplicates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Notices the pipeline matched to an existing one (same URL, same file, same advertisement number, or a near-identical title with the same dates). Nothing here is published; a wrong call can be undone.
        </p>
      </div>
      {reopened ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Moved back to the review queue.</p> : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Duplicate</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Original</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const reason = (n.changeSummary as { duplicate?: { reason: string; score: number } } | null)?.duplicate;
              return (
                <tr key={n.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <Link href={`/admin/automation/inbox/${n.id}`} className="font-medium text-slate-900 hover:underline">{n.title}</Link>
                    <div className="text-xs text-slate-500">{n.source?.name ?? n.sourceDomain} · {n.sourceUrl ? <a href={n.sourceUrl} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">source</a> : null}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{reason ? `${reason.reason} (${Math.round(reason.score * 100)}%)` : "manual"}</td>
                  <td className="px-3 py-2">
                    {n.duplicateOf ? (
                      <>
                        <Link href={`/admin/automation/inbox/${n.duplicateOf.id}`} className="font-medium text-slate-900 hover:underline">{n.duplicateOf.title}</Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><NoticeStatusBadge status={n.duplicateOf.status} /> {n.duplicateOf.source?.name}</div>
                      </>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canReview ? (
                      <form action={reopenNoticeAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="returnTo" value="/admin/automation/duplicates" />
                        <button className="text-brand-700 hover:underline">Not a duplicate</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No duplicates.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
