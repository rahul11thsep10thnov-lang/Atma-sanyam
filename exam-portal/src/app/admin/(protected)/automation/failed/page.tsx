import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listFailedItems } from "@/lib/pipeline/review";
import { retryFailedItemAction, resolveFailedItemAction } from "../actions";

export const metadata: Metadata = { title: "Failed items" };

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function FailedItemsPage({ searchParams }: { searchParams: Promise<{ retried?: string; msg?: string; resolved?: string }> }) {
  const admin = await requireAdmin();
  const { retried, msg, resolved } = await searchParams;
  const items = await listFailedItems(200);
  const canOperate = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Failed items</h1>
        <p className="mt-1 text-sm text-slate-600">
          Unresolved pipeline errors. Each is retried automatically with backoff (15 min → 24 h, up to 6 attempts); “Retry now” ignores the backoff.
        </p>
      </div>
      {retried ? (
        <p className={`rounded-md px-3 py-2 text-sm ${retried === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} role="status">
          {retried === "ok" ? "Retry succeeded." : "Retry failed."} {msg}
        </p>
      ) : null}
      {resolved ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Marked as resolved.</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">What failed</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Attempts</th>
              <th className="px-3 py-2">Next retry</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2"><span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{e.errorType}</span></td>
                <td className="px-3 py-2 text-slate-700">
                  {e.source ? <div><Link href={`/admin/automation/sources/${e.source.id}/edit`} className="text-brand-700 hover:underline">{e.source.name}</Link></div> : null}
                  {e.document ? <div className="text-xs text-slate-500">{e.document.filename}</div> : null}
                  {e.notice ? <div className="text-xs"><Link href={`/admin/automation/inbox/${e.notice.id}`} className="text-brand-700 hover:underline">{e.notice.title}</Link></div> : null}
                </td>
                <td className="max-w-md px-3 py-2 text-slate-600"><div className="line-clamp-3 break-words" title={e.message}>{e.message}</div></td>
                <td className="px-3 py-2 text-slate-600">{e.retryCount + 1}<div className="text-xs text-slate-400">last {fmt(e.lastAttemptAt)}</div></td>
                <td className="px-3 py-2 text-slate-600">{fmt(e.nextRetryAt)}</td>
                <td className="px-3 py-2 text-right">
                  {canOperate ? (
                    <div className="flex justify-end gap-3">
                      <form action={retryFailedItemAction}><input type="hidden" name="id" value={e.id} /><button className="text-brand-700 hover:underline">Retry now</button></form>
                      <form action={resolveFailedItemAction}><input type="hidden" name="id" value={e.id} /><button className="text-slate-500 hover:underline">Resolve</button></form>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Nothing is failing. 🎉</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
