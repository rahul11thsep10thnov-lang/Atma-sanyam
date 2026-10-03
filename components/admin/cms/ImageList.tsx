"use client";

import type { CmsImage } from "@/lib/cms/types";
import { ImageUploader } from "./ImageUploader";
import { Badge, btnSecondary, isPlaceholderUrl, thumbUrl } from "./ui";

/**
 * Image management for one owner (attraction, destination gallery, hotel,
 * restaurant): approve / reject / remove / reorder / replace, plus upload.
 */
export function ImageList({ images, onChange, max = 4, title, allowCandidates = true }: { images: CmsImage[]; onChange: (next: CmsImage[]) => void; max?: number; title?: string; allowCandidates?: boolean }) {
  const approved = images.filter((i) => i.approval_status === "APPROVED").length;
  const update = (id: string, patch: Partial<CmsImage>) => onChange(images.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next.map((img, i) => ({ ...img, sort_order: i })));
  };
  const approve = (img: CmsImage) => {
    if (approved >= max) return alert(`At most ${max} approved images are allowed here. Reject one first.`);
    update(img.id, { approval_status: "APPROVED" });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-charcoal">{title ?? "Images"} <span className="text-xs font-normal text-charcoal-light">· {approved}/{max} approved{allowCandidates ? `, ${images.filter((i) => i.approval_status === "PENDING").length} candidates` : ""}</span></p>
        <ImageUploader compact onUploaded={(img) => onChange([...images, { ...img, approval_status: approved < max ? "APPROVED" : "PENDING", sort_order: images.length }])} />
      </div>
      {images.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-charcoal/20 p-3 text-xs text-charcoal-light">No images yet — the page shows “No approved image available” until one is approved.</p>
      ) : (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, idx) => (
            <li key={img.id} className={`overflow-hidden rounded-xl border bg-white ${img.approval_status === "APPROVED" ? "border-forest-400" : img.approval_status === "REJECTED" ? "border-terracotta-200 opacity-60" : "border-forest-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(img)} alt={img.alt} className="aspect-[3/2] w-full object-cover" loading="lazy" />
              <div className="space-y-1 p-2 text-xs">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge tone={img.approval_status === "APPROVED" ? "bg-forest-100 text-forest-700" : img.approval_status === "REJECTED" ? "bg-terracotta-100 text-terracotta-700" : "bg-saffron-100 text-saffron-700"}>{img.approval_status}</Badge>
                  {isPlaceholderUrl(img.url) && <Badge tone="bg-charcoal/10 text-charcoal">generated placeholder</Badge>}
                </div>
                <p className="text-charcoal"><span className="text-charcoal-light">Source:</span> {img.source}{img.photographer ? ` · ${img.photographer}` : ""}</p>
                <p className="text-charcoal"><span className="text-charcoal-light">Licence:</span> {img.license ?? "not recorded"}{img.attribution_required ? " · attribution required" : ""}</p>
                {img.source_page_url && <a href={img.source_page_url} target="_blank" rel="noreferrer" className="block truncate text-forest-700 hover:underline">{img.source_page_url}</a>}
                <input value={img.caption ?? ""} placeholder="Caption" onChange={(e) => update(img.id, { caption: e.target.value || null })} className="mt-1 w-full rounded border border-forest-100 px-2 py-1" />
                <input value={img.alt} placeholder="Alt text" onChange={(e) => update(img.id, { alt: e.target.value })} className="w-full rounded border border-forest-100 px-2 py-1" />
                <div className="flex flex-wrap gap-1 pt-1">
                  {img.approval_status !== "APPROVED" && <button type="button" className={`${btnSecondary} !px-2 !py-0.5 !text-xs`} onClick={() => approve(img)}>Approve</button>}
                  {img.approval_status !== "REJECTED" && <button type="button" className={`${btnSecondary} !px-2 !py-0.5 !text-xs`} onClick={() => update(img.id, { approval_status: "REJECTED" })}>Reject</button>}
                  <button type="button" className={`${btnSecondary} !px-2 !py-0.5 !text-xs`} onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
                  <button type="button" className={`${btnSecondary} !px-2 !py-0.5 !text-xs`} onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
                  <button type="button" className={`${btnSecondary} !px-2 !py-0.5 !text-xs text-terracotta-700`} onClick={() => onChange(images.filter((i) => i.id !== img.id))}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
