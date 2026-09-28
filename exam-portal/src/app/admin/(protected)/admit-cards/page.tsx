import type { Metadata } from "next";
import Link from "next/link";
import { listAdmitCardsForAdmin } from "@/lib/services/admitCards";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admit Cards" };

export default async function AdminAdmitCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { items, total, pageSize } = await listAdmitCardsForAdmin(page);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Admit Cards</h1>
        <Link
          href="/admin/admit-cards/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Admit Card
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Exam</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((admitCard) => (
              <tr key={admitCard.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-900">
                  {admitCard.title}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {admitCard.exam.title}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={admitCard.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatDate(admitCard.updatedAt)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/admit-cards/${admitCard.id}/edit`}
                    className="text-brand-700 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No admit cards yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/admin/admit-cards"
      />
    </div>
  );
}
