"use client";

import { useState } from "react";
import { emptyAttraction, type CmsAttraction } from "@/lib/cms/types";
import { ImageList } from "./ImageList";
import { Badge, btnSecondary, field, label, num } from "./ui";

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Numbered attraction list: add, edit, delete, reorder, manual override, rating display, images, map URL, sources. */
export function AttractionsEditor({ attractions, destSlug, onChange }: { attractions: CmsAttraction[]; destSlug: string; onChange: (next: CmsAttraction[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<CmsAttraction>) => onChange(attractions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= attractions.length) return;
    const next = [...attractions];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next.map((a, i) => ({ ...a, sort_order: i, manual_order: a.id === attractions[idx].id ? true : a.manual_order })));
  };
  const add = () => {
    const id = `${destSlug}-att-${Date.now().toString(36)}`;
    const a = { ...emptyAttraction(id, "", "New attraction"), sort_order: attractions.length, manual_order: true, sources: [{ label: "Admin entry", url: null, retrieved_at: new Date().toISOString(), status: "MANUAL" as const }] };
    onChange([...attractions, a]);
    setOpen(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-light">{attractions.length} attractions. Order here is the order on the page; moving one pins it (manual override) so the pipeline never re-ranks it.</p>
        <button type="button" className={btnSecondary} onClick={add}>+ Add attraction</button>
      </div>
      <ol className="space-y-2">
        {attractions.map((a, idx) => {
          const approved = a.images.filter((i) => i.approval_status === "APPROVED").length;
          const candidates = a.images.filter((i) => i.approval_status === "CANDIDATE").length;
          const isOpen = open === a.id;
          return (
            <li key={a.id} className={`rounded-xl border bg-white ${a.status === "HIDDEN" ? "border-charcoal/10 opacity-70" : "border-forest-100"}`}>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">{idx + 1}</span>
                <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} className="min-w-0 flex-1 text-left">
                  <span className="font-medium text-charcoal">{a.name || "Untitled"}</span>
                  <span className="ml-2 text-xs text-charcoal-light">{a.rating !== null ? `★ ${a.rating.toFixed(1)}${a.review_count !== null ? ` (${a.review_count})` : ""}` : "Rating unavailable"} · {approved} approved{candidates ? `, ${candidates} candidates` : ""}</span>
                </button>
                {a.manual_order && <Badge tone="bg-saffron-100 text-saffron-700">pinned</Badge>}
                {a.status === "HIDDEN" && <Badge tone="bg-charcoal/10 text-charcoal">hidden</Badge>}
                <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
                <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
                <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => setOpen(isOpen ? null : a.id)}>{isOpen ? "Close" : "Edit"}</button>
                <button type="button" className={`${btnSecondary} !px-2 !py-0.5 text-terracotta-700`} onClick={() => confirm(`Delete “${a.name}”?`) && onChange(attractions.filter((x) => x.id !== a.id))}>Delete</button>
              </div>
              {isOpen && (
                <div className="space-y-4 border-t border-forest-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={label}>Name<input value={a.name} onChange={(e) => update(a.id, { name: e.target.value, slug: a.slug || slugOf(e.target.value) })} className={field} /></label>
                    <label className={label}>Slug<input value={a.slug} onChange={(e) => update(a.id, { slug: slugOf(e.target.value) })} className={field} /></label>
                    <label className={`${label} sm:col-span-2`}>Short description<textarea rows={3} value={a.short_description} onChange={(e) => update(a.id, { short_description: e.target.value })} className={field} /></label>
                    <label className={label}>Category<input value={a.category ?? ""} placeholder="Temple, Fort, Museum…" onChange={(e) => update(a.id, { category: e.target.value || null })} className={field} /></label>
                    <label className={label}>Location text<input value={a.location_text ?? ""} onChange={(e) => update(a.id, { location_text: e.target.value || null })} className={field} /></label>
                    <label className={label}>Latitude<input value={a.latitude ?? ""} onChange={(e) => update(a.id, { latitude: num(e.target.value) })} className={field} /></label>
                    <label className={label}>Longitude<input value={a.longitude ?? ""} onChange={(e) => update(a.id, { longitude: num(e.target.value) })} className={field} /></label>
                    <label className={label}>Google Maps URL<input value={a.map_url ?? ""} onChange={(e) => update(a.id, { map_url: e.target.value || null })} className={field} /></label>
                    <label className={label}>Official website<input value={a.official_website ?? ""} onChange={(e) => update(a.id, { official_website: e.target.value || null })} className={field} /></label>
                  </div>
                  <fieldset className="rounded-lg border border-forest-100 p-3">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-forest-700">Rating</legend>
                    <p className="text-xs text-charcoal-light">Only enter a rating you took from an authorised source and name that source. Leave blank to show “Rating unavailable”.</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <label className={label}>Rating (0–5)<input value={a.rating ?? ""} onChange={(e) => update(a.id, { rating: num(e.target.value) })} className={field} /></label>
                      <label className={label}>Review count<input value={a.review_count ?? ""} onChange={(e) => update(a.id, { review_count: num(e.target.value) })} className={field} /></label>
                      <label className={label}>Rating source<input value={a.rating_source ?? ""} placeholder="Google Places API" onChange={(e) => update(a.id, { rating_source: e.target.value || null })} className={field} /></label>
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={a.manual_order} onChange={(e) => update(a.id, { manual_order: e.target.checked })} /> Manual order (pipeline must not re-rank)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={a.status === "HIDDEN"} onChange={(e) => update(a.id, { status: e.target.checked ? "HIDDEN" : "ACTIVE" })} /> Hide from the page</label>
                  </div>
                  <ImageList images={a.images} onChange={(images) => update(a.id, { images })} title="Attraction images" />
                  {a.sources.length > 0 && (
                    <div className="text-xs text-charcoal-light">
                      <p className="font-semibold uppercase tracking-wide text-forest-700">Sources</p>
                      <ul className="mt-1 space-y-0.5">
                        {a.sources.map((s, i) => <li key={i}>{s.label} · {s.status}{s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" className="text-forest-700 hover:underline">{s.url}</a></>}{s.note ? ` · ${s.note}` : ""}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {attractions.length === 0 && <p className="rounded-lg border border-dashed border-charcoal/20 p-4 text-sm text-charcoal-light">No attractions yet. Add one by hand or run the pipeline for this destination.</p>}
    </div>
  );
}
