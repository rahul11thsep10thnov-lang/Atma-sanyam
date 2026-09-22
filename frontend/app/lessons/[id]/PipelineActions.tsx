"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES: { key: string; label: string }[] = [
  { key: "analyze", label: "Analyze" },
  { key: "transform", label: "Regenerate Example" },
  { key: "generate-script", label: "Regenerate Script" },
  { key: "generate-audio", label: "Regenerate Voice" },
  { key: "preview", label: "Generate Preview" },
  { key: "render", label: "Render Video" },
  { key: "quality-check", label: "Quality Check" },
  { key: "approve", label: "Approve" },
];

export function PipelineActions({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(stage: string) {
    setRunning(stage);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/lessons/${lessonId}/${stage}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || `${stage} failed.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${stage} failed.`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Pipeline</h2>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => run(s.key)}
            disabled={running !== null}
            className="btn-secondary"
          >
            {running === s.key ? "Running…" : s.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">
        Run stages in order: Analyze → Regenerate Example → Regenerate Script → Regenerate Voice → Render
        Video → Quality Check → Approve.
      </p>
    </div>
  );
}
