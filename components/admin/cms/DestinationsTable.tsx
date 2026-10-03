"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminRow, BulkAction } from "@/lib/cms/admin";
import { CMS_CATEGORIES, COMPANION_TYPES, type CompanionType } from "@/lib/cms/types";
import { api, btnDanger, btnPrimary, btnSecondary, field, fmtDate, Notice, StageBadge, StatusBadge } from "./ui";

type SortKey = "name" | "state" | "status" | "attractions" | "images" | "hotels" | "restaurants" | "updated_at";

/**
 * The destinations table: search, filter, sort, per-row actions and bulk
 * editing. Every change goes through the admin API, and the public page
 * reflects it on the next request — no code change, no JSON editing.
 */
export function DestinationsTable({ rows: initial, base, states }: { rows: AdminRow[]; base: string; states: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const [flag, setFlag] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updated_at", dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkAction>("publish");
  const [payload, setPayload] = useState({ state: "", category: CMS_CATEGORIES[0] as string, companions: [] as CompanionType[], seo_title: "{name} Travel Guide — {state} | budgettourism", seo_description: "Plan a trip to {name}, {state}: attractions, history, budget hotels and restaurants." });
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (!needle || r.name.toLowerCase().includes(needle) || r.slug.includes(needle) || (r.state ?? "").toLowerCase().includes(needle)) &&
      (!status || r.status === status) &&
      (!state || r.state === state) &&
      (!flag || (flag === "incomplete" && r.incomplete) || (flag === "no_photo" && !r.has_photo) || (flag === "pending_images" && r.pending_images > 0) || (flag === "in_pipeline" && r.stage !== "NOT_IN_PIPELINE"))
    );
    const key = sort.key;
    return [...list].sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
    });
  }, [rows, q, status, state, flag, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  async function reload() {
    const { rows: fresh } = await api<{ rows: AdminRow[] }>("/api/admin/cms/destinations");
    setRows(fresh);
    router.refresh();
  }

  async function rowAction(id: string, action: string) {
    if (action === "delete" && !confirm("Delete this destination permanently? Its public page stops existing immediately.")) return;
    setBusy(true);
    setMsg(null);
    try {
      if (action === "delete") await api(`/api/admin/cms/destinations/${id}`, { method: "DELETE" });
      else await api(`/api/admin/cms/destinations/${id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      await reload();
      setMsg({ tone: "ok", text: `${action} done.` });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function runBulk() {
    const ids = [...selected];
    if (!ids.length) return setMsg({ tone: "error", text: "Select at least one destination." });
    if ((bulk === "delete" || bulk === "archive") && !confirm(`${bulk} ${ids.length} destination(s)?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const body = { ids, action: bulk, payload: { state: payload.state, category: payload.category, companions: payload.companions, seo_title: payload.seo_title, seo_description: payload.seo_description } };
      const r = await api<{ changed: number; errors: string[] }>("/api/admin/cms/destinations/bulk", { method: "POST", body: JSON.stringify(body) });
      await reload();
      setSelected(new Set());
      setMsg({ tone: r.errors.length ? "error" : "ok", text: `${r.changed} destination(s) updated.${r.errors.length ? ` ${r.errors.join("; ")}` : ""}` });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const th = (key: SortKey, text: string) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">
      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-forest-900">
        {text}{sort.key === key && <span aria-hidden>{sort.dir === 1 ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="card-surface flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1 text-xs font-medium text-charcoal">Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, slug or state" className={field} />
        </label>
        <label className="text-xs font-medium text-charcoal">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            <option value="">All</option>
            {["PUBLISHED", "DRAFT", "IN_REVIEW", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-charcoal">State
          <select value={state} onChange={(e) => setState(e.target.value)} className={field}>
            <option value="">All</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-charcoal">Show only
          <select value={flag} onChange={(e) => setFlag(e.target.value)} className={field}>
            <option value="">Everything</option>
            <option value="incomplete">Incomplete content</option>
            <option value="no_photo">Missing hero photo</option>
            <option value="pending_images">Images awaiting approval</option>
            <option value="in_pipeline">In the pipeline</option>
          </select>
        </label>
        <p className="text-xs text-charcoal-light">{visible.length} of {rows.length}</p>
      </div>

      <div className="card-surface flex flex-wrap items-end gap-3 p-4">
        <p className="w-full text-xs font-semibold uppercase tracking-wide text-forest-700">Bulk edit · {selected.size} selected</p>
        <label className="text-xs font-medium text-charcoal">Action
          <select value={bulk} onChange={(e) => setBulk(e.target.value as BulkAction)} className={field}>
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish (→ draft)</option>
            <option value="archive">Archive</option>
            <option value="set_state">Change state</option>
            <option value="add_category">Add category</option>
            <option value="remove_category">Remove category</option>
            <option value="set_companions">Set companion types</option>
            <option value="seo_template">Apply SEO template</option>
            <option value="delete">Delete</option>
          </select>
        </label>
        {bulk === "set_state" && (
          <label className="text-xs font-medium text-charcoal">State
            <select value={payload.state} onChange={(e) => setPayload((p) => ({ ...p, state: e.target.value }))} className={field}>
              <option value="">Choose…</option>
              {states.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        {(bulk === "add_category" || bulk === "remove_category") && (
          <label className="text-xs font-medium text-charcoal">Category
            <select value={payload.category} onChange={(e) => setPayload((p) => ({ ...p, category: e.target.value }))} className={field}>
              {CMS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        )}
        {bulk === "set_companions" && (
          <div className="flex flex-wrap gap-3 text-sm">
            {COMPANION_TYPES.map((c) => (
              <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={payload.companions.includes(c)} onChange={(e) => setPayload((p) => ({ ...p, companions: e.target.checked ? [...p.companions, c] : p.companions.filter((x) => x !== c) }))} />{c}</label>
            ))}
          </div>
        )}
        {bulk === "seo_template" && (
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-charcoal">Title template<input value={payload.seo_title} onChange={(e) => setPayload((p) => ({ ...p, seo_title: e.target.value }))} className={field} /></label>
            <label className="text-xs font-medium text-charcoal">Description template<input value={payload.seo_description} onChange={(e) => setPayload((p) => ({ ...p, seo_description: e.target.value }))} className={field} /></label>
            <p className="text-xs text-charcoal-light sm:col-span-2">Placeholders: {"{name}"} and {"{state}"}.</p>
          </div>
        )}
        <button type="button" disabled={busy || selected.size === 0} onClick={runBulk} className={bulk === "delete" ? btnDanger : btnPrimary}>Apply to {selected.size}</button>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-forest-100 bg-white">
        <table className="min-w-full divide-y divide-forest-100 text-sm">
          <thead className="bg-forest-50">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" aria-label="Select all visible" checked={allVisibleSelected} onChange={(e) => setSelected(e.target.checked ? new Set([...selected, ...visible.map((r) => r.id)]) : new Set([...selected].filter((id) => !visible.some((r) => r.id === id))))} /></th>
              {th("name", "Destination")}
              {th("state", "State")}
              {th("status", "Status")}
              {th("attractions", "Attractions")}
              {th("images", "Images")}
              {th("hotels", "Hotels")}
              {th("restaurants", "Restaurants")}
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">Pipeline</th>
              {th("updated_at", "Last updated")}
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100">
            {visible.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-saffron-50/50" : undefined}>
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} /></td>
                <td className="px-3 py-2">
                  <Link href={`${base}/destinations/${r.id}`} className="font-medium text-charcoal hover:text-forest-700">{r.name}</Link>
                  <span className="block text-xs text-charcoal-light">/destinations/{r.slug}{r.incomplete && <span className="ml-2 text-saffron-700">· incomplete</span>}{!r.has_photo && <span className="ml-2 text-terracotta-700">· no photo</span>}</span>
                </td>
                <td className="px-3 py-2 text-charcoal-light">{r.state ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2 text-charcoal-light">{r.attractions}</td>
                <td className="px-3 py-2 text-charcoal-light">{r.images}{r.pending_images > 0 && <Link href={`${base}/destinations/${r.id}/images`} className="ml-1 text-xs text-saffron-700 hover:underline">+{r.pending_images} to review</Link>}</td>
                <td className="px-3 py-2 text-charcoal-light">{r.hotels}</td>
                <td className="px-3 py-2 text-charcoal-light">{r.restaurants}</td>
                <td className="px-3 py-2"><StageBadge stage={r.stage} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-charcoal-light">{fmtDate(r.updated_at)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <Link href={`${base}/destinations/${r.id}`} className="text-forest-700 hover:underline">Edit</Link>
                    <a href={`${base.replace(/\/admin$/, "")}/destinations/${r.slug}?preview=1`} target="_blank" rel="noreferrer" className="text-forest-700 hover:underline">Preview</a>
                    {r.status === "PUBLISHED" ? <button type="button" disabled={busy} onClick={() => rowAction(r.id, "unpublish")} className="text-saffron-700 hover:underline">Unpublish</button> : <button type="button" disabled={busy} onClick={() => rowAction(r.id, "publish")} className="text-forest-700 hover:underline">Publish</button>}
                    <button type="button" disabled={busy} onClick={() => rowAction(r.id, "duplicate")} className="text-charcoal hover:underline">Duplicate</button>
                    <button type="button" disabled={busy} onClick={() => rowAction(r.id, "archive")} className="text-charcoal hover:underline">Archive</button>
                    <button type="button" disabled={busy} onClick={() => rowAction(r.id, "delete")} className="text-terracotta-700 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-charcoal-light">No destinations match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
