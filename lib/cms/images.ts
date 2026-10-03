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

/** Attribution line shown under an approved image when its licence asks for one. */
export function attributionLine(img: CmsImage): string | null {
  if (!img.attribution_required && !img.photographer && !img.license) return null;
  const who = img.attribution_text ?? img.photographer;
  return [who, img.license, img.source].filter(Boolean).join(" · ");
}
