import { backendFetch } from "@/lib/backend";
import { StatusBadge } from "@/components/StatusBadge";
import { BatchControls } from "./BatchControls";

interface BatchItem {
  lesson_id: string;
  status: string;
  error: string;
}
interface BatchDetail {
  id: string;
  name: string;
  status: string;
  total_lessons: number;
  completed: number;
  failed: number;
  items: BatchItem[];
}

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
  const batch = await backendFetch<BatchDetail>(`/batches/${params.id}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{batch.name}</h1>
          <div className="mt-1">
            <StatusBadge status={batch.status} />
          </div>
        </div>
      </div>

      <div className="card">
        <p className="text-sm text-slate-700 font-medium">
          {batch.completed} / {batch.total_lessons} completed
          {batch.failed > 0 ? `, ${batch.failed} failed` : ""}
        </p>
      </div>

      <BatchControls batchId={batch.id} />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Lesson</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e4dd]">
            {batch.items.map((item) => (
              <tr key={item.lesson_id}>
                <td className="px-4 py-3">
                  <a href={`/lessons/${item.lesson_id}`} className="hover:underline">
                    {item.lesson_id}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-red-600">{item.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
