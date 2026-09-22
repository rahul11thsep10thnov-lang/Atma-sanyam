import { backendFetch } from "@/lib/backend";
import { StatusBadge } from "@/components/StatusBadge";
import { LessonDetail } from "@/types/lesson";
import { PipelineActions } from "./PipelineActions";
import { DeleteLessonButton } from "./DeleteLessonButton";

export default async function LessonDetailPage({ params }: { params: { id: string } }) {
  const lesson = await backendFetch<LessonDetail>(`/lessons/${params.id}`);
  const analysis = lesson.analysis as { topic?: string; objectives?: string[] } | null;
  const example = lesson.example?.generated as
    | { statement?: string; expected_result?: number; unit?: string }
    | undefined;
  const finalVideo = lesson.videos.find((v) => v.kind === "final");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{lesson.title || "(untitled lesson)"}</h1>
          <div className="mt-1">
            <StatusBadge status={lesson.status} />
          </div>
        </div>
      </div>

      <PipelineActions lessonId={lesson.id} />

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Source material</h2>
        <p className="text-sm text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
          {lesson.source_text || "—"}
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">AI analysis</h2>
        {analysis ? (
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              <span className="font-medium">Topic:</span> {analysis.topic}
            </p>
            {analysis.objectives && (
              <ul className="list-disc list-inside">
                {analysis.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Not analyzed yet. Click Analyze above.</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Generated example</h2>
        {example ? (
          <p className="text-sm text-slate-700">
            {example.statement}{" "}
            {example.expected_result != null && (
              <span className="font-medium">
                → {example.expected_result} {example.unit}
              </span>
            )}
            {lesson.example?.verified && <span className="ml-2 badge bg-green-100 text-green-800">Verified</span>}
          </p>
        ) : (
          <p className="text-sm text-slate-500">No example generated yet.</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Teaching plan</h2>
        {lesson.teaching_plan?.scenes ? (
          <p className="text-sm text-slate-700">{lesson.teaching_plan.scenes.length} scenes generated.</p>
        ) : (
          <p className="text-sm text-slate-500">No teaching plan generated yet.</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Final video</h2>
        {finalVideo ? (
          <a
            href={`/api/proxy/assets/${finalVideo.id}/download?type=video`}
            className="btn-secondary"
          >
            Download MP4
          </a>
        ) : (
          <p className="text-sm text-slate-500">No final video rendered yet.</p>
        )}
      </div>

      <div>
        <DeleteLessonButton lessonId={lesson.id} />
      </div>
    </div>
  );
}
