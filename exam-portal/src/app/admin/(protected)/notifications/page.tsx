import type { Metadata } from "next";
import { requireAdminApi } from "@/lib/auth/session";
import { listNotificationsForAdmin } from "@/lib/services/notifications";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requireAdminApi();
  const { items, total } = await listNotificationsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fired automatically whenever a Job, Result, Admit Card, or Answer
          Key is published for the first time (Section 28) — {total} total.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Deliveries</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{n.type}</td>
                <td className="px-4 py-2 text-slate-700">{n.title}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {n.deliveries.map((d) => (
                      <span
                        key={d.id}
                        title={d.error ?? undefined}
                        className={
                          d.status === "SENT"
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                            : "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"
                        }
                      >
                        {d.channel}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDate(n.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No notifications yet — they fire automatically on first
                  publish.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
