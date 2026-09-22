"use client";

import { useState } from "react";

export function TestVoiceForm() {
  const [text, setText] = useState("Hello, let's begin today's lesson.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ duration_ms: number; generated_by: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/proxy/voices/test", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Voice generation failed.");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Test Voice</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <button onClick={submit} disabled={busy} className="btn-primary">
        {busy ? "Generating…" : "Test Voice"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-slate-700">
          Generated via <span className="font-medium">{result.generated_by}</span> — duration{" "}
          {(result.duration_ms / 1000).toFixed(1)}s.
        </p>
      )}
    </div>
  );
}
