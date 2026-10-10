"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImportReport, PlanSummary } from "@/lib/cms/masterImport";
import { api, btnPrimary, btnSecondary, Notice } from "./ui";

/** Upload a version of the master workbook, preview the plan, then apply it. */
export function MasterImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function run(mode: "preview" | "apply") {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mode);
      const out = await api<{ plan: PlanSummary; report: ImportReport | null }>("/api/admin/cms/master-import", { method: "POST", body: fd });
      setPlan(out.plan);
      if (out.report) {
        const c = out.report.counts;
        setMsg({ tone: "ok", text: `Applied: ${c.created} created, ${c.linked_existing} linked, ${c.already_imported} already imported, ${c.held_for_review} held for review, ${c.failures} failures.` });
        router.refresh();
      }
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPlan(null); }} className="text-sm" />
        <button type="button" disabled={!file || busy} onClick={() => run("preview")} className={btnSecondary}>{busy ? "Working…" : "Preview"}</button>
        <button type="button" disabled={!file || busy || !plan} onClick={() => run("apply")} className={btnPrimary}>Apply import</button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {plan && (
        <div className="text-sm">
          <p>{plan.rows} destination rows · {plan.clusters} trip clusters · sheets: {plan.sheets.join(", ")}</p>
          <p className="mt-1">Plan: {Object.entries(plan.tally).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
          {plan.attention.length > 0 && (
            <ul className="mt-2 max-h-72 space-y-0.5 overflow-auto text-xs">
              {plan.attention.map((a) => <li key={a.source_id}><strong>{a.kind}</strong> {a.source_id} {a.name} — {a.reason}{a.conflicts.length ? ` [${a.conflicts.join("; ")}]` : ""}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
