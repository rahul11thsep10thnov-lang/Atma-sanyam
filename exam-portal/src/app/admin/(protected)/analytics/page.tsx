import type { Metadata } from "next";
import { requireAdminApi } from "@/lib/auth/session";
import { getAnalyticsSummary } from "@/lib/services/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireAdminApi();
  const { totalViews, viewsLast30Days, byContentType, topContent } = await getAnalyticsSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Content view counts only — no IP addresses, user agents, cookies,
          or session identifiers are recorded (Section 17).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Total views (all time)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalViews}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Views (last 30 days)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{viewsLast30Days}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Views by content type</h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Content type</th>
                <th className="px-4 py-2">Views</th>
              </tr>
            </thead>
            <tbody>
              {byContentType.map((row) => (
                <tr key={row.contentType} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{row.contentType}</td>
                  <td className="px-4 py-2 text-slate-700">{row.count}</td>
                </tr>
              ))}
              {byContentType.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    No views recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Top 10 most-viewed content</h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Path</th>
                <th className="px-4 py-2">Views</th>
              </tr>
            </thead>
            <tbody>
              {topContent.map((row) => (
                <tr key={`${row.contentType}-${row.contentId}`} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600">{row.contentType}</td>
                  <td className="px-4 py-2">
                    <a href={row.path} className="text-brand-700 hover:underline">
                      {row.path}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{row.count}</td>
                </tr>
              ))}
              {topContent.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No views recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
