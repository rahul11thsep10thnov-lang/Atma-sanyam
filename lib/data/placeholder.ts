import type { ImageAsset } from "@/lib/types";

/**
 * TripToe does not scrape images from search engines (see project image
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
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Georgia, serif" font-size="${Math.round(width / 22)}" fill="rgba(255,255,255,0.92)">
      ${escapeXml(label)}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function placeholderImage(label: string, width = 1200, height = 800): ImageAsset {
  return {
    url: placeholderSvgDataUrl(label, width, height),
    alt: label,
    source: "TripToe generated placeholder — pending licensed photography",
    copyright: "No copyright claimed; replace via the admin image pipeline before launch",
    width,
    height
  };
}
