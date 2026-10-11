import type { ImageAsset } from "@/lib/types";

/**
 * budgettourism does not scrape images from search engines (see project image
 * policy). Until a destination has licensed photography — official
 * tourism-board imagery, a licensed stock library, or a user upload —
 * every card/hero renders one of these generated placeholders instead of
 * a fabricated photograph. The `source`/`copyright` fields are honest
 * about that so the image system (section 24) can be swapped in without
 * restructuring any component.
 */

const PALETTES: Array<[string, string]> = [
  ["#1F3B32", "#48765F"],
  ["#B45A3C", "#E08A1E"],
  ["#182F28", "#2F5A46"],
  ["#8C5410", "#E9992F"],
  ["#11221D", "#709983"],
  ["#6B3423", "#CB7A5D"]
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function placeholderSvgDataUrl(label: string, width = 1200, height = 800): string {
  const hash = hashString(label);
  const [from, to] = PALETTES[hash % PALETTES.length];
  const angle = (hash % 4) * 45;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1.4" fill="rgba(255,255,255,0.16)"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <rect width="${width}" height="${height}" fill="url(#p)"/>
    <g transform="translate(${width / 2} ${Math.round(height * 0.4)})" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="${Math.max(2, Math.round(width / 300))}" stroke-linecap="round" stroke-linejoin="round">
      <g transform="scale(${Math.max(1, width / 400)}) translate(-12 -14)">
        <path d="M12 2c-4 0-7 3-7 7 0 5 7 12 7 12s7-7 7-12c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
      </g>
    </g>
    <text x="50%" y="${Math.round(height * 0.58)}" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="1.5"
      font-size="${Math.max(11, Math.round(width / 38))}" fill="rgba(255,255,255,0.8)">PHOTO COMING SOON</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function placeholderImage(label: string, width = 1200, height = 800): ImageAsset {
  return {
    url: placeholderSvgDataUrl(label, width, height),
    alt: label,
    source: "budgettourism generated placeholder — pending licensed photography",
    copyright: "No copyright claimed; replace via the admin image pipeline before launch",
    width,
    height
  };
}
