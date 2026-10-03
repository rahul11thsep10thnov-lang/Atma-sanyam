"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PROVIDER_LABEL, type CmsDestination, type CmsImage, type ImageSearchState } from "@/lib/cms/types";
import { ImageUploader } from "./ImageUploader";
import { api, Badge, btnPrimary, btnSaffron, btnSecondary, isPlaceholderUrl, Notice, thumbUrl } from "./ui";

const MAX = 4;

const SEARCH_TONE: Record<ImageSearchState["status"], string> = {
  COMPLETED: "bg-forest-100 text-forest-700",
  PARTIAL: "bg-saffron-100 text-saffron-700",
  NO_RESULTS: "bg-charcoal/10 text-charcoal",
  FAILED: "bg-terracotta-100 text-terracotta-700",
  NOT_RUN: "bg-charcoal/5 text-charcoal-light"
};

const host = (u: string | null | undefined) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

interface Group {
  key: string;
  title: string;
  search: ImageSearchState | null;
  images: CmsImage[];
}

interface FinalizeResponse {
  finalized: boolean;
  issues: Array<{ target: string; message: string }>;
  destination: CmsDestination | null;
  next: { id: string; name: string; stage: string } | null;
}

/**
 * The one screen the admin works in: every attraction of the current destination with its ~10
 * candidates. Select 1–4 per attraction, then FINALIZE — the server validates, stores the images
 * as each provider's terms require, and the pipeline moves on to the next destination.
 */
export function ImageApproval({ initial, base, siteBase }: { initial: CmsDestination; base: string; siteBase: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const groups: Group[] = useMemo(() => [
    ...d.attractions.filter((a) => a.status === "ACTIVE").map((a, i) => ({ key: a.id, title: `${i + 1}. ${a.name}`, search: a.image_search ?? null, images: a.images })),
    { key: "__destination", title: `${d.name} — destination gallery (hero & photos)`, search: d.gallery_search ?? null, images: d.images }
  ], [d]);
  const [sel, setSel] = useState<Record<string, string[]>>(() => Object.fromEntries(groups.map((g) => [g.key, g.images.filter((i) => i.approval_status === "APPROVED" && !isPlaceholderUrl(i.url)).map((i) => i.id)])));
  const [hero, setHero] = useState<string>(d.hero_image && !isPlaceholderUrl(d.hero_image.url) ? d.hero_image.id : "");
  const [uploads, setUploads] = useState<Record<string, CmsImage[]>>({});
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: React.ReactNode } | null>(null);
  const [zoom, setZoom] = useState<CmsImage | null>(null);
  const [done, setDone] = useState<FinalizeResponse | null>(null);

  const maxFor = (key: string) => (key === "__destination" ? 12 : MAX);
  const toggle = (g: string, id: string) =>
    setSel((s) => {
      const cur = s[g] ?? [];
      if (cur.includes(id)) return { ...s, [g]: cur.filter((x) => x !== id) };
      if (cur.length >= maxFor(g)) {
        setMsg({ tone: "warn", text: `Only ${maxFor(g)} images can be selected here — unselect one first.` });
        return s;
      }
      return { ...s, [g]: [...cur, id] };
    });

  const candidatesOf = (g: Group) => [...g.images.filter((i) => i.approval_status !== "REJECTED" || restored.has(i.id)), ...(uploads[g.key] ?? [])].filter((i) => !isPlaceholderUrl(i.url) || i.approval_status === "APPROVED");
  const rejectedOf = (g: Group) => g.images.filter((i) => i.approval_status === "REJECTED" && !restored.has(i.id));
  const attractionGroups = groups.filter((g) => g.key !== "__destination");
  const totalSelected = Object.values(sel).reduce((n, l) => n + l.length, 0);
  const withoutSelection = attractionGroups.filter((g) => (sel[g.key] ?? []).length === 0 && candidatesOf(g).length > 0);

  async function reload() {
    const { destination } = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}`);
    setD(destination);
  }

  async function research(target: string) {
    setBusy(`search:${target}`);
    setMsg(null);
    try {
      const r = await api<{ destination: CmsDestination }>("/api/admin/cms/pipeline", { method: "POST", body: JSON.stringify({ action: "search_images", id: d.id, target }) });
      if (r.destination) setD(r.destination);
      setMsg({ tone: "ok", text: "Image search finished — see the status next to each attraction." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Search failed" });
    } finally {
      setBusy(null);
    }
  }

  async function finalize(allowEmpty = false) {
    setBusy("finalize");
    setMsg(null);
    try {
      if (Object.values(uploads).some((l) => l.length)) {
        const doc = { ...d, images: d.images.concat(uploads.__destination ?? []), attractions: d.attractions.map((a) => ({ ...a, images: a.images.concat(uploads[a.id] ?? []) })) };
        const r = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}`, { method: "PUT", body: JSON.stringify(doc) });
        setD(r.destination);
        setUploads({});
      }
      const res = await fetch(`/api/admin/cms/destinations/${d.id}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection: { ...sel, ...(hero ? { __hero: [hero] } : {}) }, allow_empty: allowEmpty }) });
      const r = (await res.json()) as FinalizeResponse & { error?: string };
      if (!res.ok && r.error) throw new Error(r.error);
      if (!r.finalized) {
        const onlyEmpty = r.issues.length === 1 && /No image selected/.test(r.issues[0].message);
        if (onlyEmpty && confirm(`${r.issues[0].target}\n\nThese attractions have candidates but nothing is selected. Finalise anyway? They will show “No approved image available”.`)) return finalize(true);
        setMsg({ tone: "error", text: <ul className="list-disc pl-5">{r.issues.map((i, k) => <li key={k}><strong>{i.target}:</strong> {i.message}</li>)}</ul> });
        return;
      }
      setDone(r);
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Finalisation failed" });
    } finally {
      setBusy(null);
    }
  }

  if (done?.finalized) {
    return (
      <div className="card-surface space-y-4 p-6">
        <p className="font-display text-2xl font-bold text-forest-700">{d.name} finalised ✓</p>
        <p className="text-sm text-charcoal-light">Approved images were stored with their licence and credit. The page is {done.destination?.status === "PUBLISHED" ? "published" : "marked ready for review — publish it from the destinations table when you have read it"}.</p>
        {done.issues.length > 0 && <Notice tone="warn"><ul className="list-disc pl-5">{done.issues.map((i, k) => <li key={k}>{i.target}: {i.message}</li>)}</ul></Notice>}
        <div className="flex flex-wrap gap-2">
          {done.next ? <Link href={`${base}/review`} className={btnPrimary}>Next destination: {done.next.name} →</Link> : <span className="text-sm text-charcoal">The queue is finished.</span>}
          <a href={`${siteBase}/destinations/${d.slug}?preview=1`} target="_blank" rel="noreferrer" className={btnSecondary}>View the page</a>
          <Link href={`${base}/pipeline`} className={btnSecondary}>Pipeline</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-surface sticky top-16 z-20 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-charcoal">{totalSelected} selected · {attractionGroups.length} attractions · 1–{MAX} per attraction</p>
          <p className="text-xs text-charcoal-light">
            Stage: {d.pipeline.stage.replace(/_/g, " ")}
            {withoutSelection.length > 0 && <span className="ml-2 text-saffron-700">· {withoutSelection.length} attraction(s) with candidates but nothing selected</span>}
          </p>
        </div>
        <button type="button" disabled={Boolean(busy)} onClick={() => research("all")} className={btnSecondary}>{busy === "search:all" ? "Searching…" : "Re-run image search"}</button>
        <Link href={`${base}/destinations/${d.id}`} className={btnSecondary}>Open editor</Link>
        <button type="button" disabled={Boolean(busy)} onClick={() => finalize(false)} className={btnSaffron}>{busy === "finalize" ? "Finalising…" : `FINALIZE ${d.name.toUpperCase()}`}</button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {groups.map((g) => {
        const chosen = sel[g.key] ?? [];
        const list = candidatesOf(g);
        const rejected = rejectedOf(g);
        const s = g.search;
        return (
          <section key={g.key} className="card-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-forest-700">{g.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal-light">
                  <span>Image search:</span>
                  <Badge tone={SEARCH_TONE[s?.status ?? "NOT_RUN"]}>{(s?.status ?? "NOT_RUN").replace("_", " ")}</Badge>
                  {s?.providers.map((p) => (
                    <span key={p.provider} title={p.note ?? ""} className="rounded-full bg-forest-50 px-2 py-0.5">
                      {PROVIDER_LABEL[p.provider]}: {p.status === "OK" ? `${p.found} found, ${p.kept} kept` : p.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  ))}
                  {s && <span className="font-medium text-charcoal">Final candidates: {s.final_candidates}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-xs text-charcoal-light">{chosen.length}/{maxFor(g.key)} selected</span>
                <button type="button" disabled={Boolean(busy)} onClick={() => research(g.key)} className={`${btnSecondary} !text-xs`}>{busy === `search:${g.key}` ? "Searching…" : "Search again"}</button>
                <ImageUploader compact onUploaded={(img) => { setUploads((u) => ({ ...u, [g.key]: [...(u[g.key] ?? []), { ...img, approval_status: "PENDING" }] })); toggle(g.key, img.id); }} />
              </div>
            </div>

            {list.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-charcoal/20 p-3 text-sm text-charcoal-light">
                {s?.status === "FAILED" ? "No provider could be reached for this search (see the status above). Use “Search again” once they are reachable, or upload a licensed photograph." : s ? "No trustworthy candidates were found. Upload a licensed photograph, or finalise without one (“No approved image available”)." : "The image search has not run for this item yet."}
              </p>
            ) : (
              <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {list.map((img, idx) => {
                  const on = chosen.includes(img.id);
                  const provider = PROVIDER_LABEL[img.provider ?? "seed"] ?? img.source;
                  return (
                    <li key={img.id} className={`flex flex-col overflow-hidden rounded-xl border-2 bg-white transition ${on ? "border-forest-600 shadow-md" : "border-forest-100"}`}>
                      <div className="flex items-center justify-between bg-forest-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest-700">
                        <span>Image {idx + 1}</span>
                        {on && <span className="rounded-full bg-forest-700 px-2 text-white">Selected #{chosen.indexOf(img.id) + 1}</span>}
                      </div>
                      <button type="button" onClick={() => setZoom(img)} className="relative block" aria-label={`Enlarge ${img.alt}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbUrl(img)} alt={img.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                        {img.rejection_reason && restored.has(img.id) && <span className="absolute bottom-1 left-1 rounded bg-terracotta-700/90 px-1.5 text-[10px] text-white">restored by you</span>}
                      </button>
                      <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 p-2 text-[11px] leading-snug">
                        <dt className="text-charcoal-light">Provider</dt><dd className="font-medium text-charcoal">{provider}</dd>
                        <dt className="text-charcoal-light">Photographer</dt>
                        <dd className="truncate text-charcoal">{img.photographer ? (img.photographer_url ? <a href={img.photographer_url} target="_blank" rel="noreferrer" className="hover:underline">{img.photographer}</a> : img.photographer) : "—"}</dd>
                        <dt className="text-charcoal-light">License</dt>
                        <dd className="text-charcoal">{img.license ? (img.license_url ? <a href={img.license_url} target="_blank" rel="noreferrer" className="hover:underline">{img.license}</a> : img.license) : "not recorded"}{img.attribution_required ? " · credit required" : ""}</dd>
                        <dt className="text-charcoal-light">Source</dt><dd className="truncate text-charcoal">{host(img.source_page_url) ?? "—"}</dd>
                        {img.width && img.height ? <><dt className="text-charcoal-light">Size</dt><dd className="text-charcoal">{img.width}×{img.height}</dd></> : null}
                        {img.source_query && <><dt className="text-charcoal-light">Found by</dt><dd className="truncate text-charcoal-light" title={img.source_query}>{img.source_query}</dd></>}
                      </dl>
                      <div className="flex gap-1 border-t border-forest-100 p-2">
                        {img.source_page_url && <a href={img.source_page_url} target="_blank" rel="noreferrer" className={`${btnSecondary} flex-1 !px-1 !text-[11px]`}>Open source page</a>}
                        <button type="button" onClick={() => toggle(g.key, img.id)} className={`${on ? btnPrimary : btnSecondary} flex-1 !px-1 !text-[11px]`}>{on ? "Selected ✓" : "Select"}</button>
                      </div>
                      <label className="flex items-center gap-1 border-t border-forest-100 px-2 py-1 text-[11px] text-charcoal-light">
                        <input type="radio" name="hero" checked={hero === img.id} onChange={() => { setHero(img.id); if (!on) toggle(g.key, img.id); }} /> Use as page hero
                      </label>
                    </li>
                  );
                })}
              </ol>
            )}

            {rejected.length > 0 && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-charcoal-light">Filtered out automatically ({rejected.length}) — shown for transparency</summary>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {rejected.map((img) => (
                    <li key={img.id} className="flex gap-2 rounded-lg border border-charcoal/10 bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl(img, 160, 120)} alt={img.alt} className="h-14 w-20 shrink-0 rounded object-cover opacity-70" loading="lazy" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="truncate text-charcoal">{PROVIDER_LABEL[img.provider ?? "seed"]} · {img.alt}</p>
                        <p className="text-terracotta-700">{(img.rejection_reason ?? "Rejected").replace(/^AUTO [A-Z_]+: /, "")}</p>
                        {!/LICENSE|AI_GENERATED/.test(img.rejection_reason ?? "") && <button type="button" onClick={() => setRestored((r) => new Set(r).add(img.id))} className="text-forest-700 hover:underline">Show as candidate anyway</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}

      {zoom && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.preview_url ?? zoom.url} alt={zoom.alt} className="max-h-[80vh] w-auto rounded-lg object-contain" referrerPolicy="no-referrer" />
            <figcaption className="mt-2 text-sm text-white/90">{zoom.alt} — {zoom.photographer ?? "unknown"} · {zoom.license} · {PROVIDER_LABEL[zoom.provider ?? "seed"]}{zoom.description ? ` — ${zoom.description.slice(0, 200)}` : ""}</figcaption>
            <button type="button" onClick={() => setZoom(null)} className={`${btnSecondary} mt-2`}>Close</button>
          </figure>
        </div>
      )}
      <button type="button" onClick={reload} className="text-xs text-charcoal-light underline">Reload from server</button>
    </div>
  );
}
