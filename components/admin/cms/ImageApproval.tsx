"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsDestination, CmsImage } from "@/lib/cms/types";
import { ImageUploader } from "./ImageUploader";
import { api, Badge, btnPrimary, btnSecondary, isPlaceholderUrl, Notice, thumbUrl } from "./ui";

const MAX = 4;

/**
 * Bulk image approval: every attraction of ONE destination on one screen.
 * Tick 1–4 images per attraction (and optionally a hero), then press
 * "Approve all selected images" once. Everything not ticked is rejected.
 */
export function ImageApproval({ initial, base }: { initial: CmsDestination; base: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const groups = useMemo(() => [
    { key: "__destination", name: `${d.name} — destination gallery`, images: d.images },
    ...d.attractions.filter((a) => a.status === "ACTIVE").map((a, i) => ({ key: a.id, name: `${i + 1}. ${a.name}`, images: a.images }))
  ], [d]);
  const [sel, setSel] = useState<Record<string, string[]>>(() => Object.fromEntries(groups.map((g) => [g.key, g.images.filter((i) => i.approval_status === "APPROVED").map((i) => i.id)])));
  const [hero, setHero] = useState<string>(d.hero_image?.id ?? "");
  const [uploads, setUploads] = useState<Record<string, CmsImage[]>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);

  const toggle = (g: string, id: string) =>
    setSel((s) => {
      const cur = s[g] ?? [];
      if (cur.includes(id)) return { ...s, [g]: cur.filter((x) => x !== id) };
      if (cur.length >= MAX) { setMsg({ tone: "warn", text: `Only ${MAX} images can be approved per attraction.` }); return s; }
      return { ...s, [g]: [...cur, id] };
    });

  const totalSelected = Object.values(sel).reduce((n, l) => n + l.length, 0);
  const emptyGroups = groups.filter((g) => g.key !== "__destination" && (sel[g.key] ?? []).length === 0).length;

  async function approve() {
    setBusy(true);
    setMsg(null);
    try {
      // Manually uploaded images are stored on the record first so they can be approved like any other candidate.
      let doc = d;
      if (Object.keys(uploads).length) {
        doc = { ...d, images: d.images.concat(uploads.__destination ?? []), attractions: d.attractions.map((a) => ({ ...a, images: a.images.concat(uploads[a.id] ?? []) })) };
        const res = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}`, { method: "PUT", body: JSON.stringify(doc) });
        doc = res.destination;
      }
      const selection = { ...sel, ...(hero ? { __hero: [hero] } : {}) };
      const { destination } = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}/images`, { method: "POST", body: JSON.stringify({ selection, reject_others: true, continue_pipeline: true }) });
      setD(destination);
      setUploads({});
      router.refresh();
      if (destination.pipeline.stage === "FINALIZING") {
        const r = await api<{ destination: CmsDestination }>("/api/admin/cms/pipeline", { method: "POST", body: JSON.stringify({ action: "finalize", id: destination.id }) });
        if (r.destination) setD(r.destination);
        setMsg({ tone: "ok", text: `${totalSelected} images approved and saved. The destination is ready for its final review — open the pipeline to publish it.` });
      } else {
        setMsg({ tone: "ok", text: `${totalSelected} images approved; the rest were rejected.` });
      }
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Approval failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-surface sticky top-16 z-20 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-charcoal">{totalSelected} selected across {groups.length} groups · max {MAX} per attraction{emptyGroups > 0 && <span className="ml-2 text-saffron-700">· {emptyGroups} attraction(s) with nothing selected will show “No approved image available”</span>}</p>
          <p className="text-xs text-charcoal-light">Pipeline stage: {d.pipeline.stage.replace(/_/g, " ")}{d.pipeline.stage === "READY_TO_PUBLISH" && <> · <Link href={`${base}/pipeline`} className="font-semibold text-forest-700 underline">publish from the pipeline</Link></>}</p>
        </div>
        <Link href={`${base}/destinations/${d.id}`} className={btnSecondary}>Open editor</Link>
        <button type="button" disabled={busy || totalSelected === 0} onClick={approve} className={btnPrimary}>{busy ? "Saving…" : "Approve all selected images"}</button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {groups.map((g) => {
        const chosen = sel[g.key] ?? [];
        const all = [...g.images, ...(uploads[g.key] ?? [])];
        return (
          <section key={g.key} className="card-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-forest-700">{g.name} <span className="text-sm font-normal text-charcoal-light">· {chosen.length}/{MAX} selected · {all.length} candidates</span></h2>
              <ImageUploader compact onUploaded={(img) => { setUploads((u) => ({ ...u, [g.key]: [...(u[g.key] ?? []), { ...img, approval_status: "CANDIDATE" }] })); toggle(g.key, img.id); }} />
            </div>
            {all.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-charcoal/20 p-3 text-sm text-charcoal-light">No candidates were found for this attraction (the image sources were unavailable or returned nothing with a usable licence). Upload a licensed image or leave it — the page will say “No approved image available”.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {all.map((img) => {
                  const on = chosen.includes(img.id);
                  return (
                    <li key={img.id}>
                      <label className={`block cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition ${on ? "border-forest-600 shadow-md" : "border-transparent ring-1 ring-black/5 hover:ring-forest-300"}`}>
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumbUrl(img)} alt={img.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                          <input type="checkbox" checked={on} onChange={() => toggle(g.key, img.id)} className="absolute left-2 top-2 h-5 w-5 accent-forest-700" aria-label={`Select ${img.alt}`} />
                          {on && <span className="absolute right-2 top-2 rounded-full bg-forest-700 px-2 py-0.5 text-[11px] font-bold text-white">{chosen.indexOf(img.id) + 1}</span>}
                          {isPlaceholderUrl(img.url) && <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">generated placeholder</span>}
                        </div>
                        <div className="space-y-0.5 p-2 text-[11px] leading-snug text-charcoal-light">
                          <p className="font-medium text-charcoal">{img.source}{img.photographer ? ` · ${img.photographer}` : ""}</p>
                          <p>{img.license ?? "licence not recorded"}{img.attribution_required ? " · credit required" : ""}</p>
                          {img.width && img.height && <p>{img.width}×{img.height}</p>}
                          {img.source_page_url && <a href={img.source_page_url} target="_blank" rel="noreferrer" className="block truncate text-forest-700 hover:underline" onClick={(e) => e.stopPropagation()}>source page ↗</a>}
                          <div className="flex items-center gap-1 pt-1">
                            {img.approval_status !== "CANDIDATE" && <Badge tone={img.approval_status === "APPROVED" ? "bg-forest-100 text-forest-700" : "bg-terracotta-100 text-terracotta-700"}>{img.approval_status}</Badge>}
                            <label className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}><input type="radio" name="hero" checked={hero === img.id} onChange={() => { setHero(img.id); if (!on) toggle(g.key, img.id); }} /> hero</label>
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
