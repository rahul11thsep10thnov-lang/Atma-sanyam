"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CMS_CATEGORIES, COMPANION_TYPES, PUBLICATION_STATUSES, type CmsDestination, type CmsImage, type CmsCategory, type CompanionType, type PublicationStatus } from "@/lib/cms/types";
import { AttractionsEditor } from "./AttractionsEditor";
import { HotelsEditor, RestaurantsEditor } from "./ListingsEditor";
import { ImageList } from "./ImageList";
import { ImageUploader } from "./ImageUploader";
import { api, btnDanger, btnPrimary, btnSaffron, btnSecondary, field, fmtDate, label, Notice, StageBadge, StatusBadge, thumbUrl } from "./ui";

const TABS = ["Basics", "Content", "Attractions", "Images", "Hotels", "Restaurants", "FAQ", "SEO", "Sources"] as const;
type Tab = (typeof TABS)[number];

/**
 * The destination editor: every field of the record in one place. Saving
 * PUTs the whole document; the server re-validates it and the public page
 * reflects the change on its next request.
 */
export function DestinationEditor({ initial, base, siteBase, states }: { initial: CmsDestination; base: string; siteBase: string; states: string[] }) {
  const router = useRouter();
  const [d, setD] = useState<CmsDestination>(initial);
  const [tab, setTab] = useState<Tab>("Basics");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
  const patch = (p: Partial<CmsDestination>) => { setD((x) => ({ ...x, ...p })); setDirty(true); };
  const txt = (k: keyof CmsDestination) => ({ value: (d[k] as string | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => patch({ [k]: e.target.value || null } as Partial<CmsDestination>) });

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(): Promise<CmsDestination | null> {
    setBusy(true);
    setMsg(null);
    try {
      const { destination } = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}`, { method: "PUT", body: JSON.stringify(d) });
      setD(destination);
      setDirty(false);
      setMsg({ tone: "ok", text: `Saved ${fmtDate(destination.updated_at)}. ${destination.status === "PUBLISHED" ? "The public page already shows this version." : "Publish to make it public."}` });
      router.refresh();
      return destination;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Save failed" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function action(a: "publish" | "unpublish" | "archive" | "duplicate") {
    if (dirty) { const saved = await save(); if (!saved) return; }
    setBusy(true);
    try {
      const { destination } = await api<{ destination: CmsDestination }>(`/api/admin/cms/destinations/${d.id}/action`, { method: "POST", body: JSON.stringify({ action: a }) });
      if (a === "duplicate") { router.push(`${base}/destinations/${destination.id}`); return; }
      setD(destination);
      setMsg({ tone: "ok", text: a === "publish" ? `Published — live at ${siteBase}/destinations/${destination.slug}` : `${a} done.` });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const approvedPool: CmsImage[] = [...d.images, ...d.attractions.flatMap((a) => a.images)].filter((i) => i.approval_status === "APPROVED");
  const pendingCandidates = d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "PENDING").length, 0) + d.images.filter((i) => i.approval_status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-charcoal">{d.name}</h1>
            <StatusBadge status={d.status} />
            <StageBadge stage={d.pipeline.stage} />
            {dirty && <span className="text-xs font-semibold text-saffron-700">Unsaved changes</span>}
          </div>
          <p className="mt-0.5 text-xs text-charcoal-light">{d.id} · /destinations/{d.slug} · updated {fmtDate(d.updated_at)}{d.published_at ? ` · published ${fmtDate(d.published_at)}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${siteBase}/destinations/${d.slug}?preview=1`} target="_blank" rel="noreferrer" className={btnSecondary}>Preview</a>
          {pendingCandidates > 0 && <Link href={`${base}/destinations/${d.id}/images`} className={btnSaffron}>Review {pendingCandidates} image candidates</Link>}
          <button type="button" disabled={busy} onClick={() => action("duplicate")} className={btnSecondary}>Duplicate</button>
          {d.status === "PUBLISHED" ? <button type="button" disabled={busy} onClick={() => action("unpublish")} className={btnSecondary}>Unpublish</button> : <button type="button" disabled={busy} onClick={() => action("publish")} className={btnSaffron}>Publish</button>}
          {d.status !== "ARCHIVED" && <button type="button" disabled={busy} onClick={() => action("archive")} className={btnDanger}>Archive</button>}
          <button type="button" disabled={busy || !dirty} onClick={save} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {d.seed && (
        <Notice tone={d.verification_status === "VERIFIED" ? "ok" : "warn"}>
          Master list row {d.seed.source_id}{d.seed.other_source_ids?.length ? ` (also ${d.seed.other_source_ids.join(", ")})` : ""} · {d.seed.relation === "CREATED" ? "created from" : "linked to"} {d.seed.source} · listed as “{d.seed.raw_type}”
          {d.seed.conflicts.length > 0 && <> · <strong>Check:</strong> {d.seed.conflicts.join("; ")}</>}
          <label className="mt-2 flex items-center gap-2 font-medium">
            <input type="checkbox" checked={d.verification_status === "VERIFIED"} onChange={(e) => patch({ verification_status: e.target.checked ? "VERIFIED" : "UNVERIFIED" })} />
            Name, state, location and facts checked against reliable sources (seed records start unverified)
          </label>
        </Notice>
      )}
      {d.pipeline.stage === "AWAITING_APPROVAL" && <Notice tone="warn">The pipeline is waiting for image approval on this destination. <Link href={`${base}/destinations/${d.id}/images`} className="font-semibold underline">Open the approval screen</Link>.</Notice>}
      {d.pipeline.stage === "READY_TO_PUBLISH" && <Notice tone="warn">Content and images are final. Review the tabs below, then press <strong>Publish</strong> (or publish from the <Link href={`${base}/pipeline`} className="font-semibold underline">pipeline screen</Link>).</Notice>}

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-forest-100">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-forest-700 text-forest-700" : "border-transparent text-charcoal-light hover:text-charcoal"}`}>
            {t}{t === "Attractions" && ` (${d.attractions.length})`}{t === "Hotels" && ` (${d.hotels.length})`}{t === "Restaurants" && ` (${d.restaurants.length})`}{t === "FAQ" && ` (${d.faq.length})`}
          </button>
        ))}
      </div>

      <div className="card-surface p-5">
        {tab === "Basics" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>Name<input value={d.name} onChange={(e) => patch({ name: e.target.value })} className={field} /></label>
            <label className={label}>Slug (URL)<input value={d.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} className={field} /></label>
            <label className={label}>Status
              <select value={d.status} onChange={(e) => patch({ status: e.target.value as PublicationStatus })} className={field}>{PUBLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className={label}>State / UT
              <select value={d.state ?? ""} onChange={(e) => patch({ state: e.target.value || null })} className={field}><option value="">Not set</option>{states.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className={label}>District<input {...txt("district")} className={field} /></label>
            <label className={label}>Region<input {...txt("region")} className={field} placeholder="North, South, North-East…" /></label>
            <label className={label}>Latitude<input value={d.latitude ?? ""} onChange={(e) => patch({ latitude: e.target.value === "" ? null : Number(e.target.value) })} className={field} /></label>
            <label className={label}>Longitude<input value={d.longitude ?? ""} onChange={(e) => patch({ longitude: e.target.value === "" ? null : Number(e.target.value) })} className={field} /></label>
            <label className={label}>Ideal duration<input {...txt("ideal_duration_text")} className={field} placeholder="2–3 days" /></label>
            <label className={`${label} lg:col-span-3`}>Headline<input {...txt("headline")} className={field} /></label>
            <label className={`${label} lg:col-span-3`}>Short description (cards, hero)<textarea rows={3} {...txt("short_description")} className={field} /></label>
            <label className={label}>Best time to visit<input {...txt("best_time_text")} className={field} /></label>
            <label className={label}>Nearest airport<input {...txt("nearest_airport")} className={field} /></label>
            <label className={label}>Nearest railway station<input {...txt("nearest_railway_station")} className={field} /></label>
            <fieldset className="lg:col-span-3">
              <legend className="text-sm font-medium text-charcoal">Categories (homepage sections and filters)</legend>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {CMS_CATEGORIES.map((c) => <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={d.categories.includes(c)} onChange={(e) => patch({ categories: e.target.checked ? [...d.categories, c] : d.categories.filter((x) => x !== c) })} />{c.replace("_", " ")}</label>)}
              </div>
            </fieldset>
            <fieldset className="lg:col-span-3">
              <legend className="text-sm font-medium text-charcoal">Who is it good for (recommendations)</legend>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {COMPANION_TYPES.map((c) => <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={d.companions.includes(c)} onChange={(e) => patch({ companions: e.target.checked ? [...d.companions, c] : d.companions.filter((x) => x !== c) })} />{c}</label>)}
              </div>
            </fieldset>
            <label className={label}>Full-guide slug (optional link to /india/{"{state}"}/{"{slug}"})<input {...txt("legacy_slug")} className={field} /></label>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={d.is_sample_data} onChange={(e) => patch({ is_sample_data: e.target.checked })} /> Mark as sample data</label>
          </div>
        )}

        {tab === "Content" && (
          <div className="space-y-4">
            <p className="text-xs text-charcoal-light">Plain text with blank lines between paragraphs. <code>**bold**</code>, <code>*italic*</code> and lines starting with <code>- </code> (lists) are rendered. Keep summaries original and concise — do not paste large passages from sources.</p>
            <label className={label}>About the place<textarea rows={10} {...txt("about")} className={field} /></label>
            <div>
              <label className={label}>Historical references<textarea rows={10} {...txt("history")} className={field} /></label>
              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={d.history_verified} onChange={(e) => patch({ history_verified: e.target.checked })} /> History verified against reliable sources (unverified history shows the “currently unavailable” notice publicly)</label>
            </div>
            <label className={label}>Getting there / transportation<textarea rows={5} {...txt("transportation")} className={field} /></label>
            <label className={label}>Travel information<textarea rows={5} {...txt("travel_info")} className={field} /></label>
          </div>
        )}

        {tab === "Attractions" && <AttractionsEditor attractions={d.attractions} destSlug={d.slug} onChange={(attractions) => patch({ attractions })} />}

        {tab === "Images" && (
          <div className="space-y-6">
            <section>
              <p className="text-sm font-medium text-charcoal">Hero image</p>
              <div className="mt-2 flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(d.hero_image, 640, 360)} alt={d.hero_image?.alt ?? "Hero"} className="aspect-video w-72 rounded-lg object-cover ring-1 ring-black/5" />
                <div className="flex-1 space-y-2 text-xs text-charcoal-light">
                  {d.hero_image ? <p>{d.hero_image.source} · {d.hero_image.license ?? "licence not recorded"}{d.hero_image.url.startsWith("placeholder://") && " · generated placeholder (not a photograph)"}</p> : <p>No hero image — a labelled placeholder is shown.</p>}
                  {approvedPool.length > 0 && (
                    <label className={label}>Choose from approved images
                      <select value={d.hero_image?.id ?? ""} onChange={(e) => patch({ hero_image: approvedPool.find((i) => i.id === e.target.value) ?? null })} className={field}>
                        <option value="">Keep current</option>
                        {approvedPool.map((i) => <option key={i.id} value={i.id}>{i.alt || i.id} — {i.source}</option>)}
                      </select>
                    </label>
                  )}
                  <ImageUploader compact onUploaded={(img) => patch({ hero_image: img })} />
                  {d.hero_image && <button type="button" className={btnSecondary} onClick={() => patch({ hero_image: null })}>Remove hero image</button>}
                </div>
              </div>
            </section>
            <ImageList images={d.images} onChange={(images) => patch({ images })} title="Destination gallery" max={12} />
          </div>
        )}

        {tab === "Hotels" && <HotelsEditor hotels={d.hotels} onChange={(hotels) => patch({ hotels })} />}
        {tab === "Restaurants" && <RestaurantsEditor restaurants={d.restaurants} onChange={(restaurants) => patch({ restaurants })} />}

        {tab === "FAQ" && (
          <div className="space-y-3">
            {d.faq.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-forest-100 p-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <input value={f.question} placeholder="Question" onChange={(e) => patch({ faq: d.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} className={field} />
                  <textarea rows={3} value={f.answer} placeholder="Answer" onChange={(e) => patch({ faq: d.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} className={field} />
                </div>
                <button type="button" className={`${btnSecondary} self-start text-terracotta-700`} onClick={() => patch({ faq: d.faq.filter((_, j) => j !== i) })}>Remove</button>
              </div>
            ))}
            <button type="button" className={btnSecondary} onClick={() => patch({ faq: [...d.faq, { question: "", answer: "" }] })}>+ Add question</button>
          </div>
        )}

        {tab === "SEO" && (
          <div className="grid gap-3">
            <label className={label}>Meta title <span className="text-xs text-charcoal-light">({(d.seo.title ?? "").length}/120 — blank uses “{d.name} Travel Guide — {d.state ?? "India"}”)</span><input value={d.seo.title ?? ""} onChange={(e) => patch({ seo: { ...d.seo, title: e.target.value || null } })} className={field} /></label>
            <label className={label}>Meta description <span className="text-xs text-charcoal-light">({(d.seo.description ?? "").length}/320)</span><textarea rows={3} value={d.seo.description ?? ""} onChange={(e) => patch({ seo: { ...d.seo, description: e.target.value || null } })} className={field} /></label>
            <label className={label}>Keywords (comma separated)<input value={d.seo.keywords.join(", ")} onChange={(e) => patch({ seo: { ...d.seo, keywords: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} className={field} /></label>
            <label className={label}>Canonical path (blank = /destinations/{d.slug})<input value={d.seo.canonical_path ?? ""} onChange={(e) => patch({ seo: { ...d.seo, canonical_path: e.target.value || null } })} className={field} /></label>
            <label className={label}>Open Graph image URL (blank = hero image)<input value={d.seo.og_image ?? ""} onChange={(e) => patch({ seo: { ...d.seo, og_image: e.target.value || null } })} className={field} /></label>
            <p className="text-xs text-charcoal-light">Structured data (schema.org TouristDestination with its TouristAttractions, BreadcrumbList and FAQPage) and the sitemap entry are generated automatically for published destinations.</p>
          </div>
        )}

        {tab === "Sources" && (
          <div className="space-y-5 text-sm">
            <div>
              <h3 className="font-semibold text-forest-700">Where each field came from</h3>
              {Object.keys(d.provenance).length === 0 ? <p className="mt-1 text-charcoal-light">No sources recorded yet.</p> : (
                <ul className="mt-2 divide-y divide-forest-100 rounded-lg border border-forest-100">
                  {Object.entries(d.provenance).map(([k, refs]) => (
                    <li key={k} className="grid gap-1 px-3 py-2 sm:grid-cols-[160px_1fr]">
                      <span className="font-medium text-charcoal">{k}</span>
                      <ul className="space-y-0.5 text-xs text-charcoal-light">
                        {refs.map((r, i) => <li key={i}><span className={r.status === "SOURCE_UNAVAILABLE" ? "text-terracotta-700" : "text-forest-700"}>{r.status}</span> · {r.label}{r.url && <> · <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.url}</a></>}{r.retrieved_at && ` · ${fmtDate(r.retrieved_at)}`}{r.note && ` · ${r.note}`}</li>)}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-forest-700">Pipeline log</h3>
              {d.pipeline.log.length === 0 ? <p className="mt-1 text-charcoal-light">This destination has not been through the pipeline.</p> : (
                <ol className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-lg border border-forest-100 bg-forest-50/40 p-3 font-mono text-xs">
                  {d.pipeline.log.map((l, i) => <li key={i} className={l.level === "error" ? "text-terracotta-700" : l.level === "warn" ? "text-saffron-700" : "text-charcoal"}>{fmtDate(l.at)} · {l.stage} · {l.message}</li>)}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
