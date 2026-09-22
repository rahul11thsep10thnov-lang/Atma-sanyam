"use client";

import { useState } from "react";

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function runExport() {
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/proxy/privacy/export", { method: "POST" });
    const body = await res.json();
    setBusy(false);
    setStatus(res.ok ? `Export ${body.status.toLowerCase()}.` : "Export failed.");
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={runExport} disabled={busy} className="btn-secondary">
        {busy ? "Exporting…" : "Export My Data"}
      </button>
      {status && <span className="text-sm text-slate-600">{status}</span>}
    </div>
  );
}
