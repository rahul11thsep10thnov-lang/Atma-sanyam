"use client";

import { useState } from "react";

const CONFIRMATION_PHRASE = "DELETE MY PROJECT DATA";

export function DeleteAllForm() {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/proxy/privacy/delete-all", {
      method: "POST",
      body: JSON.stringify({ confirmation_phrase: phrase }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.message || "Could not delete project data.");
      return;
    }
    setResult(`Deleted ${body.processed_items} lesson(s) and all associated assets.`);
    setPhrase("");
  }

  return (
    <div className="card border-red-200 space-y-3">
      <h2 className="text-sm font-semibold text-red-800">Delete All Project Data</h2>
      <p className="text-sm text-slate-600">
        Permanently deletes every lesson, source file, generated audio and video you own. This cannot be
        undone. Type <span className="font-mono font-medium">{CONFIRMATION_PHRASE}</span> to confirm.
      </p>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={CONFIRMATION_PHRASE}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-green-700">{result}</p>}
      <button
        onClick={submit}
        disabled={busy || phrase !== CONFIRMATION_PHRASE}
        className="btn-danger"
      >
        Delete all project data
      </button>
    </div>
  );
}
