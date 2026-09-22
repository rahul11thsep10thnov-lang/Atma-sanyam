import Link from "next/link";
import { backendFetch } from "@/lib/backend";
import { PrivacyNotice } from "@/components/PrivacyNotice";

interface LessonSummary {
  id: string;
  title: string;
  status: string;
}
interface BatchSummary {
  id: string;
  status: string;
}

export default async function DashboardPage() {
  const [lessons, batches] = await Promise.all([
    backendFetch<LessonSummary[]>("/lessons").catch(() => []),
    backendFetch<BatchSummary[]>("/batches").catch(() => []),
  ]);

  const completed = lessons.filter((l) => l.status === "COMPLETED").length;
  const processing = lessons.filter((l) =>
    ["ANALYZING", "TRANSFORMING", "GENERATING_AUDIO", "RENDERING", "QUALITY_CHECK"].includes(l.status)
  ).length;
  const failed = lessons.filter((l) => l.status === "FAILED").length;

  const stats = [
    { label: "Total lessons", value: lessons.length },
    { label: "Videos completed", value: completed },
    { label: "Videos processing", value: processing },
    { label: "Videos failed", value: failed },
    { label: "Total batches", value: batches.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Turn teaching material into faceless whiteboard lesson videos with a consistent, natural AI teacher voice.
        </p>
      </div>

      <PrivacyNotice />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-2xl font-semibold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/lessons/new" className="btn-primary">
          New Lesson
        </Link>
        <Link href="/lessons/new" className="btn-secondary">
          Upload Material
        </Link>
        <Link href="/batches" className="btn-secondary">
          Create Batch
        </Link>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent lessons</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-slate-500">No lessons yet. Upload your first teaching document to begin.</p>
        ) : (
          <ul className="divide-y divide-[#e6e4dd]">
            {lessons.slice(0, 5).map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <Link href={`/lessons/${l.id}`} className="text-slate-800 hover:underline">
                  {l.title || "(untitled lesson)"}
                </Link>{" "}
                — {l.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
