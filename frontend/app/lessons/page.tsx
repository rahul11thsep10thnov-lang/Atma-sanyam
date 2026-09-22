import Link from "next/link";
import { backendFetch } from "@/lib/backend";
import { StatusBadge } from "@/components/StatusBadge";

interface LessonSummary {
  id: string;
  title: string;
  status: string;
  subject: string;
  created_at: string;
}

export default async function LessonsPage() {
  const lessons = await backendFetch<LessonSummary[]>("/lessons").catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Lessons</h1>
        <Link href="/lessons/new" className="btn-primary">
          New Lesson
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Subject</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e4dd]">
            {lessons.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No lessons yet.
                </td>
              </tr>
            )}
            {lessons.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/lessons/${l.id}`} className="text-slate-900 font-medium hover:underline">
                    {l.title || "(untitled lesson)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{l.subject || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
