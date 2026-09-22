import Link from "next/link";
import { backendFetch } from "@/lib/backend";
import { StatusBadge } from "@/components/StatusBadge";

interface BatchSummary {
  id: string;
  name: string;
  status: string;
  total_lessons: number;
  completed: number;
  failed: number;
}

export default async function BatchesPage() {
  const batches = await backendFetch<BatchSummary[]>("/batches").catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Batches</h1>
      <p className="text-sm text-slate-500">
        Generate many videos through the same pipeline. Create a batch from the Lessons page, then start it
        here once you've reviewed a preview.
      </p>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Progress</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e4dd]">
            {batches.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No batches yet.
                </td>
              </tr>
            )}
            {batches.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/batches/${b.id}`} className="text-slate-900 font-medium hover:underline">
                    {b.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {b.completed} / {b.total_lessons} completed{b.failed > 0 ? `, ${b.failed} failed` : ""}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
