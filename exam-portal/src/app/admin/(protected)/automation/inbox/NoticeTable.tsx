import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/enums";
import type { listNotices } from "@/lib/pipeline/review";
import { ConfidenceBar, NoticeStatusBadge, NoticeTypeBadge, PriorityBadge } from "@/components/admin/NoticeBadges";
import { approveNoticeAction, publishNoticeAction, rejectNoticeAction } from "./actions";

type Row = Awaited<ReturnType<typeof listNotices>>["rows"][number];

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function NoticeTable({ rows, role, returnTo }: { rows: Row[]; role: AdminRole; returnTo: string }) {
  const canReview = role !== "AUTHOR";
  const canPublish = role === "SUPER_ADMIN" || role === "EDITOR";
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-3 py-2">Notice</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Organization / recruitment</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Found</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => {
            const errors = (n.validationErrors as string[] | null) ?? [];
            return (
              <tr key={n.id} className="border-t border-slate-100 align-top">
                <td className="max-w-md px-3 py-2">
                  <div className="flex items-start gap-2">
                    <PriorityBadge priority={n.priority} />
                    <Link href={`/admin/automation/inbox/${n.id}`} className="font-medium text-slate-900 hover:underline">{n.title}</Link>
                  </div>
                  {errors.length ? <div className="mt-1 text-xs text-red-600">{errors.length} validation issue{errors.length > 1 ? "s" : ""}: {errors[0]}</div> : null}
                  {n.duplicateOf ? <div className="mt-1 text-xs text-purple-700">duplicate of: {n.duplicateOf.title}</div> : null}
                  {n._count.duplicates ? <div className="mt-1 text-xs text-slate-500">{n._count.duplicates} duplicate{n._count.duplicates > 1 ? "s" : ""} point here</div> : null}
                </td>
                <td className="px-3 py-2"><NoticeTypeBadge type={n.noticeType} /></td>
                <td className="px-3 py-2"><NoticeStatusBadge status={n.status} /></td>
                <td className="px-3 py-2"><ConfidenceBar value={n.overallConfidence} /></td>
                <td className="px-3 py-2 text-slate-700">
                  <div>{n.organization ? <>{n.organization.name}{n.organization.isAutoCreated ? <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700" title="Created by the pipeline — confirm it">new</span> : null}</> : <span className="text-red-600">no organization</span>}</div>
                  <div className="text-xs text-slate-500">{n.recruitment ? n.recruitment.title : "no recruitment"}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {n.source?.name ?? n.sourceDomain ?? "—"}
                  {n.sourceUrl ? <div><a href={n.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">open</a></div> : null}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmt(n.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-3 whitespace-nowrap">
                    {canReview && (n.status === "NEW" || n.status === "NEEDS_REVIEW" || n.status === "AUTO_APPROVED") ? (
                      <form action={approveNoticeAction}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="text-blue-700 hover:underline">Approve</button></form>
                    ) : null}
                    {canPublish && (n.status === "APPROVED" || n.status === "AUTO_APPROVED") ? (
                      <form action={publishNoticeAction}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="text-emerald-700 hover:underline">Publish</button></form>
                    ) : null}
                    {canReview && n.status !== "REJECTED" && n.status !== "PUBLISHED" ? (
                      <form action={rejectNoticeAction}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="text-red-600 hover:underline">Reject</button></form>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Nothing here.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
