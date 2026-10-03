import "@/lib/cms/server-guard";
import { slugify } from "@/lib/master/ids";
import { getDb } from "@/lib/master/repo";
import { getDestinationBySlug } from "../store";
import type { ImportCandidate } from "../types";

/**
 * PDF → destination names. Reads the text layer of the PDF, keeps lines that
 * look like place names, strips numbering and decoration, splits off a state
 * when the line is "Name, State" / "Name – State", and removes duplicates
 * (within the file and against destinations that already exist).
 */

export interface ExtractedPdf {
  page_count: number | null;
  raw_line_count: number;
  candidates: ImportCandidate[];
}

const HEADER_WORDS = /^(destinations?|places?|list|tourism|index|contents?|table of contents|page|sr\.? no\.?|s\.? ?no\.?|no\.|name|state|serial)\b/i;
/** Lines that are document prose, not names (titles, purpose notes, disclaimers). */
const PROSE = /\b(destinations|tourism|purpose|important|seed list|curated|pipeline|website|database|publication|validate|claim|intentionally|weighted)\b/i;

export function cleanLine(raw: string): string {
  return raw
    .replace(/^\s*(destination|place|dest\.?)\s*[#:-]?\s*\d+\s*[-–:.)]?\s*/i, "") // DESTINATION 001 —
    .replace(/^\s*\d{1,4}(?=[A-Z])/, "") // "1Jammu" — number glued to the name by the PDF's table layout
    .replace(/^\s*[\(\[]?\d{1,4}[\)\].:\-–]\s*/, "") // 1. / 001) / 12 -
    .replace(/^\s*[•●▪■◦\-–*·]+\s*/, "") // bullets
    .replace(/\s*[.…]{3,}\s*\d+\s*$/, "") // dotted leaders + page number
    .replace(/\s+\d{1,4}\s*$/, (m) => (/\d{4}/.test(m) ? m : "")) // trailing page numbers, keep years
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikePlace(line: string): boolean {
  if (line.length < 3 || line.length > 60) return false;
  if (PROSE.test(line)) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  if (/^\d+$/.test(line)) return false;
  if (HEADER_WORDS.test(line) && line.split(" ").length <= 3) return false;
  if (line.split(" ").length > 7) return false;
  if (/[.!?;]$/.test(line) && line.split(" ").length > 4) return false; // sentences, not names
  if (/\b(page|chapter|section|copyright|©|www\.|http)\b/i.test(line)) return false;
  return true;
}

export function splitState(line: string): { name: string; state: string | null } {
  const states = getDb().states;
  const m = line.match(/^(.+?)\s*[,(–\-|]\s*([A-Za-z &]+?)\)?\s*$/);
  if (m) {
    const st = states.find((s) => s.name.toLowerCase() === m[2].trim().toLowerCase());
    if (st) return { name: m[1].trim(), state: st.name };
  }
  return { name: line, state: null };
}

/** "Jammu & Kashmir" / "Jammu and Kashmir" → the state record, when a line is a section heading. */
function stateHeading(line: string): string | null {
  const key = (x: string) => x.toLowerCase().replace(/&/g, "and").replace(/[^a-z]+/g, " ").trim();
  const k = key(line);
  if (!k) return null;
  return getDb().states.find((st) => key(st.name) === k)?.name ?? null;
}

export function candidatesFromText(text: string): ExtractedPdf {
  const lines = text.replace(/\r/g, "").split("\n");
  const seen = new Map<string, string | null>();
  const candidates: ImportCandidate[] = [];
  let section: string | null = null;
  for (const raw of lines) {
    const heading = stateHeading(raw.trim());
    if (heading) {
      section = heading;
      continue;
    }
    const number = raw.trim().match(/^(\d{1,4})(?=\D)/)?.[1];
    const cleaned = cleanLine(raw);
    if (!looksLikePlace(cleaned)) continue;
    const split = splitState(cleaned);
    const state = split.state ?? section;
    const pretty = split.name.replace(/\s+/g, " ").trim().replace(/^[a-z]/, (c) => c.toUpperCase());
    let slug = slugify(pretty);
    if (!slug) continue;
    if (seen.has(slug)) {
      // Same name again: a genuine duplicate in the same state, or a different place of the same name elsewhere.
      if (!state || seen.get(slug) === state) continue;
      slug = `${slug}-${slugify(state)}`;
      if (seen.has(slug)) continue;
    }
    seen.set(slug, state);
    const existing = getDestinationBySlug(slug);
    candidates.push({ raw: raw.trim(), name: pretty, slug, state, position: number ? Number(number) : null, duplicate_of: existing ? existing.id : null, selected: true });
  }
  return { page_count: null, raw_line_count: lines.filter((l) => l.trim()).length, candidates };
}

export async function extractFromPdf(buffer: Buffer): Promise<ExtractedPdf> {
  // pdf-parse is CommonJS and its package entry runs a self-test when it is not `require`d,
  // so the library file is loaded directly (lazily — only the import route needs it).
  type Parser = (data: Buffer) => Promise<{ text: string; numpages: number }>;
  const mod = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as Parser | { default: Parser };
  const pdfParse: Parser = typeof mod === "function" ? mod : mod.default;
  const parsed = await pdfParse(buffer);
  const out = candidatesFromText(parsed.text ?? "");
  return { ...out, page_count: parsed.numpages ?? null };
}
