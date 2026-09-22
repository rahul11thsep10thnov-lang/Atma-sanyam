"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Manifest {
  source_document: boolean;
  extracted_text: boolean;
  generated_lesson: boolean;
  generated_audio_count: number;
  preview_video_count: number;
  final_video_count: number;
  thumbnail_count: number;
}

/** Implements the "explain before confirm" deletion flow (build spec
 * privacy section 4): first call returns a manifest of what will be
 * deleted; only a second, explicit confirm actually deletes. */
export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchManifest() {
    setBusy(true);
    const res = await fetch(`/api/proxy/privacy/delete-lesson/${lessonId}`, {
      method: "POST",
      body: JSON.stringify({ confirm: false }),
    });
    const body = await res.json();
    setManifest(body.manifest);
    setBusy(false);
  }

  async function confirmDelete() {
    setBusy(true);
    await fetch(`/api/proxy/privacy/delete-lesson/${lessonId}`, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    router.push("/lessons");
  }

  if (!manifest) {
    return (
      <button onClick={fetchManifest} disabled={busy} className="btn-danger">
        Delete Data
      </button>
    );
  }

  return (
    <div className="card border-red-200 space-y-3">
      <p className="text-sm font-medium text-slate-900">Delete this lesson?</p>
      <p className="text-sm text-slate-600">This will permanently delete:</p>
      <ul className="text-sm text-slate-700 list-disc list-inside space-y-0.5">
        {manifest.source_document && <li>Source document</li>}
        {manifest.extracted_text && <li>Extracted text</li>}
        {manifest.generated_lesson && <li>Generated lesson</li>}
        {manifest.generated_audio_count > 0 && <li>{manifest.generated_audio_count} generated audio file(s)</li>}
        {manifest.preview_video_count > 0 && <li>{manifest.preview_video_count} preview video(s)</li>}
        {manifest.final_video_count > 0 && <li>{manifest.final_video_count} final video(s)</li>}
        {manifest.thumbnail_count > 0 && <li>{manifest.thumbnail_count} thumbnail(s)</li>}
        <li>Temporary processing assets</li>
      </ul>
      <p className="text-sm font-medium text-red-700">This action cannot be undone.</p>
      <div className="flex gap-2">
        <button onClick={() => setManifest(null)} className="btn-secondary">
          Cancel
        </button>
        <button onClick={confirmDelete} disabled={busy} className="btn-danger">
          Delete permanently
        </button>
      </div>
    </div>
  );
}
