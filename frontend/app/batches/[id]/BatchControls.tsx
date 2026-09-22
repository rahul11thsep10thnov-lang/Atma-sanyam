"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Estimate {
  lesson_count: number;
  estimated_audio_minutes: number;
  estimated_processing_minutes: number;
  estimated_storage_gb: number;
}

/** Batch safety gate (build spec section 55): shows the estimate and
 * requires an explicit confirmation echoing the lesson count before a
 * large batch actually starts. */
export function BatchControls({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestEstimate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/proxy/batches/${batchId}/start`, {
      method: "POST",
      body: JSON.stringify({ confirm: false }),
    });
    const body = await res.json();
    setEstimate(body.estimate);
    setBusy(false);
  }

  async function confirmStart() {
    if (!estimate) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/proxy/batches/${batchId}/start`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, expected_lesson_count: estimate.lesson_count }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.message || "Could not start batch.");
      return;
    }
    router.refresh();
  }

  async function pauseOrCancel(action: "pause" | "cancel") {
    setBusy(true);
    await fetch(`/api/proxy/batches/${batchId}/${action}`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  if (!estimate) {
    return (
      <div className="flex gap-2">
        <button onClick={requestEstimate} disabled={busy} className="btn-primary">
          Start Batch
        </button>
        <button onClick={() => pauseOrCancel("pause")} disabled={busy} className="btn-secondary">
          Pause
        </button>
        <button onClick={() => pauseOrCancel("cancel")} disabled={busy} className="btn-danger">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="card border-amber-200 space-y-3">
      <p className="text-sm font-medium text-slate-900">
        You are about to generate {estimate.lesson_count} video{estimate.lesson_count === 1 ? "" : "s"}.
      </p>
      <ul className="text-sm text-slate-700 space-y-1">
        <li>Estimated narration audio: ~{estimate.estimated_audio_minutes.toFixed(0)} minutes</li>
        <li>Estimated processing time: ~{estimate.estimated_processing_minutes.toFixed(0)} minutes</li>
        <li>Estimated storage: ~{estimate.estimated_storage_gb.toFixed(2)} GB</li>
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setEstimate(null)} className="btn-secondary">
          Cancel
        </button>
        <button onClick={confirmStart} disabled={busy} className="btn-primary">
          Confirm and start
        </button>
      </div>
    </div>
  );
}
