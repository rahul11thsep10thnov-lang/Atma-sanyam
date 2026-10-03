"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsDestination } from "@/lib/cms/types";
import { api, btnPrimary, field, label, Notice } from "./ui";

export function NewDestination({ base, states }: { base: string; states: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { destination } = await api<{ destination: CmsDestination }>("/api/admin/cms/destinations", { method: "POST", body: JSON.stringify({ name, state: state || null }) });
      router.push(`${base}/destinations/${destination.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the destination");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card-surface max-w-xl space-y-4 p-5">
      <label className={label}>Destination name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="e.g. Hampi" /></label>
      <label className={label}>State / UT
        <select value={state} onChange={(e) => setState(e.target.value)} className={field}>
          <option value="">Not set yet</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-xs text-charcoal-light">The destination starts as a DRAFT with an empty page. Fill it in the editor, or add it to the pipeline to collect content from sources.</p>
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create draft"}</button>
    </form>
  );
}
