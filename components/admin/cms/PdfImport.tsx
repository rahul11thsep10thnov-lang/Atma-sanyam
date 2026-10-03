"use client";

import Link from "next/link";
import { useState } from "react";
import type { ImportRecord } from "@/lib/cms/types";
import { api, btnPrimary, btnSecondary, field, label, Notice } from "./ui";

type Row = Omit<ImportRecord["candidates"][number], "state"> & { state: string };

/**
 * PDF → destination list. Upload, review the extracted names (edit, un-tick,
 * set a state), then confirm: one DRAFT record per ticked name, queued in
 * order for the one-at-a-time pipeline.
 */
export function PdfImport({ base, states, previous }: { base: string; states: string[]; previous: Array<{ id: string; file_name: string; uploaded_at: string; candidates: number; confirmed_at: string | null; created: number }> }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<ImportRecord | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [done, setDone] = useState<{ created: number } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setDone(null);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (text.trim()) fd.append("text", text);
      const { import: r } = await api<{ import: ImportRecord }>("/api/admin/cms/import", { method: "POST", body: fd });
      setRec(r);
      setRows(r.candidates.map((c) => ({ ...c, state: c.state ?? "" })));
      if (r.candidates.length === 0) setMsg({ tone: "error", text: "No place names were found. If the PDF is a scan without a text layer, paste the names instead." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!rec) return;
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return setMsg({ tone: "error", text: "Tick at least one destination." });
    if (!confirm(`Create ${selected.length} draft destination(s) and queue them for the pipeline?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ created: number }>("/api/admin/cms/import", { method: "PUT", body: JSON.stringify({ id: rec.id, candidates: rows.map(({ slug, name, selected, state }) => ({ slug, name, selected, state })) }) });
      setDone(r);
      setRec(null);
      setRows([]);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const dupes = rows.filter((r) => r.duplicate_of).length;

  return (
    <div className="space-y-5">
      {done && <Notice tone="ok">{done.created} destination(s) created as drafts and queued. <Link href={`${base}/pipeline`} className="font-semibold underline">Open the pipeline</Link> to start processing them one at a time.</Notice>}
      {!rec && (
        <form onSubmit={upload} className="card-surface grid gap-4 p-5 lg:grid-cols-2">
          <div>
            <label className={label}>PDF with destination names
              <input type="file" accept="application/pdf,.pdf" className={field} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <p className="mt-1 text-xs text-charcoal-light">One name per line works best (“1. Hampi”, “Hampi — Karnataka”, “DESTINATION 001 Hampi” are all understood). Numbering, bullets and page numbers are stripped automatically.</p>
          </div>
          <label className={label}>…or paste a list
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} className={field} placeholder={"Hampi, Karnataka\nKhajuraho\nMysuru"} />
          </label>
          {msg && <div className="lg:col-span-2"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
          <div className="lg:col-span-2"><button type="submit" disabled={busy || (!file && !text.trim())} className={btnPrimary}>{busy ? "Reading…" : "Extract destinations"}</button></div>
        </form>
      )}

      {rec && (
        <div className="space-y-3">
          <div className="card-surface flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 text-sm">
              <p className="font-medium text-charcoal">{rec.file_name}{rec.page_count ? ` · ${rec.page_count} pages` : ""} · {rec.raw_line_count} lines read · {rows.length} place names found{dupes > 0 && ` · ${dupes} already exist (un-ticked)`}</p>
              <p className="text-xs text-charcoal-light">Review the list: fix a name, choose a state where known, and un-tick anything that is not a destination. Nothing is created until you confirm.</p>
            </div>
            <button type="button" className={btnSecondary} onClick={() => setRows((r) => r.map((x) => ({ ...x, selected: !x.duplicate_of })))}>Select all new</button>
            <button type="button" className={btnSecondary} onClick={() => setRows((r) => r.map((x) => ({ ...x, selected: false })))}>Clear</button>
            <button type="button" className={btnSecondary} onClick={() => { setRec(null); setRows([]); }}>Start over</button>
            <button type="button" disabled={busy || selectedCount === 0} onClick={confirmImport} className={btnPrimary}>{busy ? "Creating…" : `Create ${selectedCount} and queue`}</button>
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="overflow-x-auto rounded-xl border border-forest-100 bg-white">
            <table className="min-w-full divide-y divide-forest-100 text-sm">
              <thead className="bg-forest-50 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Create</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Line in PDF</th><th className="px-3 py-2">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {rows.map((r, i) => (
                  <tr key={r.slug} className={r.selected ? undefined : "opacity-60"}>
                    <td className="px-3 py-1.5 text-charcoal-light">{i + 1}</td>
                    <td className="px-3 py-1.5"><input type="checkbox" checked={r.selected} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} aria-label={`Create ${r.name}`} /></td>
                    <td className="px-3 py-1.5"><input value={r.name} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-full rounded border border-forest-100 px-2 py-1" /></td>
                    <td className="px-3 py-1.5">
                      <select value={r.state} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, state: e.target.value } : x)))} className="rounded border border-forest-100 px-2 py-1">
                        <option value="">—</option>{states.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-charcoal-light">{r.slug}</td>
                    <td className="px-3 py-1.5 text-xs text-charcoal-light">{r.raw}</td>
                    <td className="px-3 py-1.5 text-xs">{r.duplicate_of ? <span className="text-saffron-700">Already exists ({r.duplicate_of})</span> : <span className="text-forest-700">New</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previous.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-700">Previous imports</h2>
          <ul className="mt-2 divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white text-sm">
            {previous.map((p) => <li key={p.id} className="flex flex-wrap gap-x-4 px-3 py-2"><span className="font-medium text-charcoal">{p.file_name}</span><span className="text-charcoal-light">{new Date(p.uploaded_at).toLocaleString()}</span><span className="text-charcoal-light">{p.candidates} names</span><span className={p.confirmed_at ? "text-forest-700" : "text-saffron-700"}>{p.confirmed_at ? `${p.created} created` : "not confirmed"}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
