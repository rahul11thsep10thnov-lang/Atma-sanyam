"use client";

import { useState } from "react";
import type { ImageAsset } from "@/lib/types";
import { CmsImg } from "./CmsImg";

export interface GalleryImage {
  asset: ImageAsset;
  caption: string | null;
  credit: string | null;
}

/** Main image plus thumbnails; keyboard-operable. Credits are always shown when a licence asks for them. */
export function ImageGallery({ images, creditLabel }: { images: GalleryImage[]; creditLabel: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;
  const current = images[Math.min(index, images.length - 1)];
  return (
    <figure className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="relative aspect-[16/10] w-full bg-forest-100">
        <CmsImg image={current.asset} className="h-full w-full object-cover" sizes="(min-width: 1024px) 640px, 100vw" fill />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2" role="tablist" aria-label="Gallery thumbnails">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === index ? "ring-saffron-500" : "ring-transparent hover:ring-forest-300"}`}
            >
              <CmsImg image={img.asset} className="h-full w-full object-cover" sizes="80px" fill />
            </button>
          ))}
        </div>
      )}
      {(current.caption || current.credit) && (
        <figcaption className="px-3 pb-3 text-[11px] text-charcoal-light">
          {current.caption && <span>{current.caption}</span>}
          {current.credit && <span className="block">{creditLabel}: {current.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
