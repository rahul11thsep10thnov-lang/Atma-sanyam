import { placeholderImage } from "@/lib/data/placeholder";
import type { ImageAsset } from "@/lib/types";
import type { CmsImage } from "./types";

/** Turns a stored CMS image into the asset shape the existing image components render. */
export function assetOf(img: CmsImage | null, fallbackLabel: string, w = 1600, h = 900): ImageAsset {
  if (!img) return placeholderImage(fallbackLabel, w, h);
  if (img.url.startsWith("placeholder://")) {
    const label = decodeURIComponent(img.url.replace("placeholder://", "").split("?")[0]);
    return placeholderImage(label || fallbackLabel, w, h);
  }
  const url = img.local_path ?? img.url;
  return {
    url,
    alt: img.alt || fallbackLabel,
    source: img.source,
    copyright: img.license ?? (img.attribution_text ? `© ${img.attribution_text}` : "License not recorded"),
    width: img.width ?? undefined,
    height: img.height ?? undefined
  };
}

export const isPlaceholder = (img: CmsImage | null | undefined) => !img || img.url.startsWith("placeholder://");

/** Structured, linkable credit (serialisable — safe to pass to client components). */
export interface ImageCredit {
  /** "Photo by {who} on {source}" (Unsplash's required wording) or "{who} · {license} · {source}". */
  style: "unsplash" | "standard";
  who: string | null;
  who_url: string | null;
  license: string | null;
  license_url: string | null;
  source: string | null;
  source_url: string | null;
}

export function creditOf(img: CmsImage): ImageCredit | null {
  if (img.url.startsWith("placeholder://")) return null;
  const who = img.photographer ?? img.attribution_text;
  if (!who && !img.license) return null;
  if (img.provider === "unsplash") return { style: "unsplash", who: img.photographer, who_url: img.photographer_url ?? null, license: null, license_url: null, source: "Unsplash", source_url: "https://unsplash.com/?utm_source=budgettourism&utm_medium=referral" };
  return { style: "standard", who, who_url: img.photographer_url ?? null, license: img.license, license_url: img.license_url, source: img.source, source_url: img.source_page_url };
}

/** Attribution line shown under an approved image when its licence asks for one. */
export function attributionLine(img: CmsImage): string | null {
  if (!img.attribution_required && !img.photographer && !img.license) return null;
  const who = img.attribution_text ?? img.photographer;
  return [who, img.license, img.source].filter(Boolean).join(" · ");
}
