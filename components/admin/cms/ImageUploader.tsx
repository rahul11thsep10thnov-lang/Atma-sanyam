"use client";

import { useState } from "react";
import type { CmsImage } from "@/lib/cms/types";
import { api, btnPrimary, btnSecondary, field, label, Notice } from "./ui";

/**
 * Manual image upload with the licence details the image policy requires.
 * The uploaded file becomes an APPROVED image record the caller attaches to
 * a destination, attraction, hotel or restaurant.
 */
export function ImageUploader({ onUploaded, compact = false }: { onUploaded: (img: CmsImage) => void; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ photographer: "", license: "", license_url: "", source_page_url: "", attribution_required: false, attribution_text: "", caption: "", alt: "" });
  const [file, setFile] = useState<File | null>(null);
  const set = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement>) => setMeta((m) => ({ ...m, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose an image file first.");
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(meta).forEach(([k, v]) => fd.append(k, String(v)));
      const { image } = await api<{ image: CmsImage }>("/api/admin/cms/upload", { method: "POST", body: fd });
      onUploaded(image);
      setFile(null);
      setMeta((m) => ({ ...m, caption: "", alt: "" }));
      if (compact) setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button type="button" className={btnSecondary} onClick={() => setOpen(true)}>Upload an image…</button>;

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-forest-200 bg-forest-50/40 p-4">
      <p className="text-sm font-medium text-charcoal">Upload a licensed image</p>
      <p className="mt-0.5 text-xs text-charcoal-light">Only upload images you have the right to publish. The licence and credit you enter are shown with the photo.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>Image file (JPEG, PNG or WebP, up to 15 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" required className={field} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className={label}>Licence <span className="text-terracotta-700">*</span><input required value={meta.license} onChange={set("license")} placeholder="e.g. CC BY-SA 4.0, Own work (all rights), Client supplied" className={field} /></label>
        <label className={label}>Licence URL<input value={meta.license_url} onChange={set("license_url")} className={field} /></label>
        <label className={label}>Photographer / rights holder<input value={meta.photographer} onChange={set("photographer")} className={field} /></label>
        <label className={label}>Source page URL<input value={meta.source_page_url} onChange={set("source_page_url")} className={field} /></label>
        <label className={label}>Alt text<input value={meta.alt} onChange={set("alt")} className={field} /></label>
        <label className={label}>Caption<input value={meta.caption} onChange={set("caption")} className={field} /></label>
        <label className="flex items-center gap-2 text-sm text-charcoal sm:col-span-2"><input type="checkbox" checked={meta.attribution_required} onChange={set("attribution_required")} /> Attribution required</label>
        {meta.attribution_required && <label className={`${label} sm:col-span-2`}>Attribution text<input value={meta.attribution_text} onChange={set("attribution_text")} className={field} /></label>}
      </div>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Uploading…" : "Upload"}</button>
        {compact && <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>}
      </div>
    </form>
  );
}
