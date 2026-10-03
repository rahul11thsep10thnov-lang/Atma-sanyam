import "@/lib/cms/server-guard";
import { fetchText, htmlToText, nowIso } from "../http";
import type { SourceRef } from "../../types";

/**
 * Incredible India (Ministry of Tourism) — primary source for "About the
 * place". The site is a JavaScript application; we read the page's metadata
 * and any server-rendered text and record exactly what was retrievable.
 */
const BASE = "https://www.incredibleindia.gov.in";

export interface IncredibleIndiaPage {
  title: string | null;
  description: string | null; // meta description
  text: string | null; // readable paragraphs found in the HTML
  url: string;
  source: SourceRef;
}

export async function incredibleIndiaLookup(destSlug: string, stateSlug: string | null): Promise<{ page: IncredibleIndiaPage | null; source: SourceRef }> {
  const candidates = [stateSlug ? `${BASE}/en/${stateSlug}/${destSlug}` : null, `${BASE}/en/${destSlug}`].filter((x): x is string => Boolean(x));
  let last = "not found";
  for (const url of candidates) {
    const r = await fetchText(url);
    if (!r.ok) { last = r.error ?? `HTTP ${r.status}`; if (r.status !== 404) break; continue; }
    const html = r.data!;
    const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => htmlToText(m[1])).filter((p) => p.length > 80);
    const text = paragraphs.length ? paragraphs.slice(0, 6).join("\n\n").slice(0, 4000) : null;
    if (!meta && !text) { last = "page has no readable text (client-rendered)"; continue; }
    const source: SourceRef = { label: "Incredible India", url, retrieved_at: nowIso(), status: "OK" };
    return { page: { title, description: meta ? htmlToText(meta) : null, text, url, source }, source };
  }
  return { page: null, source: { label: "Incredible India", url: candidates[0] ?? BASE, retrieved_at: nowIso(), status: "SOURCE_UNAVAILABLE", note: last } };
}
