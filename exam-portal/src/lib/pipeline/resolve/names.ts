import type { OrganizationType } from "@/generated/prisma/enums";
import { similarity } from "../changeDetection";

/** Same normalisation the Phase 1 backfill used for alias keys:
 * lower-case, letters and digits only. "S.S.C." === "SSC" === "ssc". */
export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "");
}

const STOPWORDS = new Set([
  "the", "of", "for", "and", "&", "in", "to", "a", "an", "on", "under",
  "recruitment", "recruitments", "examination", "examinations", "exam", "exams", "notification", "notice", "advertisement", "advt",
  "post", "posts", "various", "vacancy", "vacancies", "online", "application", "applications", "direct",
]);

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t));
}

/** 0..1 — how alike two entity names are. Takes the better of bigram
 * similarity and token containment, so "Constable 2027" matches
 * "Constable Recruitment 2027" while "SSC CGL" does not match "SSC CHSL". */
export function nameMatchScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  let containment = 0;
  if (ta.size && tb.size) {
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter += 1;
    containment = inter / Math.min(ta.size, tb.size);
    // Containment alone is too generous for one-token overlaps ("Board").
    if (inter < 2 && Math.min(ta.size, tb.size) > 1) containment = 0;
  }
  return Math.max(similarity(a, b), containment);
}

/** "Uttar Pradesh Police Recruitment and Promotion Board" → "UPPRPB". */
export function acronymOf(name: string): string | null {
  const words = name.replace(/[()]/g, " ").split(/[\s-]+/).filter((w) => /^[A-Za-z]/.test(w) && !["and", "of", "the", "for", "&"].includes(w.toLowerCase()));
  if (words.length < 3) return null;
  return words.map((w) => w[0].toUpperCase()).join("");
}

export function yearOf(...candidates: Array<string | null | undefined>): number | null {
  for (const c of candidates) {
    if (!c) continue;
    const m = /(?<!\d)(20\d{2})(?:\s*[-–/]\s*(?:20)?(\d{2}))?(?!\d)/.exec(c);
    if (m) return Number(m[1]);
  }
  return null;
}

/** "Combined Graduate Level Examination, 2027" → "Combined Graduate Level Examination". */
export function stripYear(name: string): string {
  return name
    .replace(/[,(]?\s*(?<!\d)20\d{2}(?:\s*[-–/]\s*(?:20)?\d{2})?\s*[)]?/g, " ")
    .replace(/\s+[-–—:]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Title-case an ALL-CAPS organization line without touching acronyms. */
export function canonicalCase(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const small = new Set(["and", "of", "the", "for"]);
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (i > 0 && small.has(w)) return w;
      if (w.length <= 2 && /^[a-z]+$/.test(w)) return w.toUpperCase(); // UP, MP, HP, TN…
      if (w.length <= 4 && /^[a-z]+$/.test(w) && ["ssc", "upsc", "ibps", "rrb", "rbi", "sbi", "nta", "drdo", "isro", "ntpc", "bsf", "crpf", "cisf", "itbp", "ssb", "afcat", "nda", "cds"].includes(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\b([A-Z])\.([A-Z])/g, "$1.$2");
}

export function inferOrganizationType(name: string, domain?: string | null): OrganizationType {
  const n = name.toLowerCase();
  if (/\b(union public service commission|upsc|staff selection commission|ssc|ministry|government of india|central|national|all india|institute of banking personnel|ibps|railway recruitment)\b/.test(n)) return "CENTRAL";
  if (/\b(high court|supreme court|district court|judicial|court)\b/.test(n)) return "COURT";
  if (/\b(army|navy|air force|airforce|defence|defense|coast guard|border security|bsf|crpf|cisf|itbp|agniveer|ordnance)\b/.test(n)) return "DEFENCE";
  if (/\b(university|vishwavidyalaya|iit|nit|iiit|aiims|college|institute of technology)\b/.test(n)) return "UNIVERSITY";
  if (/\b(municipal|nagar nigam|nagar palika|corporation of the city|mahanagar)\b/.test(n)) return "MUNICIPAL";
  if (/\b(limited|ltd|corporation|nigam|undertaking|bank|power|electricity|oil|gas|steel|coal)\b/.test(n)) return "PSU";
  if (/\b(state|public service commission|subordinate services|police|pradesh|board|rajasthan|bihar|gujarat|maharashtra|karnataka|kerala|tamil nadu|telangana|odisha|punjab|haryana|uttarakhand|jharkhand|assam|bengal|delhi)\b/.test(n)) return "STATE";
  if (domain && /\.nic\.in$|\.gov\.in$/.test(domain)) return "AUTONOMOUS";
  return "OTHER";
}

export interface CategoryRule {
  slug: string;
  name: string;
  pattern: RegExp;
}

/** Keyword rules for the seeded categories, most specific first. The
 * first match is the primary category; later matches are secondary. */
export const CATEGORY_RULES: CategoryRule[] = [
  { slug: "upsc", name: "UPSC", pattern: /\b(union public service commission|upsc|civil services|ias|ips|ifs|cds|nda|engineering services examination|ese)\b/i },
  { slug: "ssc", name: "SSC", pattern: /\b(staff selection commission|ssc|cgl|chsl|mts|combined graduate level|combined higher secondary)\b/i },
  { slug: "railway", name: "Railway", pattern: /\b(railway|railways|rrb|rrc|ntpc|metro rail|loco pilot|group d)\b/i },
  { slug: "banking", name: "Banking", pattern: /\b(bank|banking|ibps|sbi|rbi|nabard|probationary officer|clerk|po\b)/i },
  { slug: "defence", name: "Defence", pattern: /\b(army|navy|air force|airforce|defence|defense|coast guard|agniveer|bsf|crpf|cisf|itbp|ssb|afcat|territorial army|ordnance)\b/i },
  { slug: "police", name: "Police", pattern: /\b(police|constable|sub[- ]inspector|si\b|head constable|jail warder|home guard|fireman|fire)\b/i },
  { slug: "teaching", name: "Teaching", pattern: /\b(teacher|teaching|tet\b|ctet|tgt|pgt|prt|lecturer|professor|assistant professor|faculty|kvs|nvs|school|education)\b/i },
  { slug: "state-psc", name: "State PSC", pattern: /\b(public service commission|psc\b|subordinate services selection|ssb\b|state service|pcs\b|staff selection board)\b/i },
];

export const FALLBACK_CATEGORY = { slug: "other-government-jobs", name: "Other Government Jobs" };

export function inferCategories(texts: Array<string | null | undefined>): CategoryRule[] {
  const hay = texts.filter(Boolean).join(" \n ");
  const matched = CATEGORY_RULES.filter((r) => r.pattern.test(hay));
  // "UPSC" beats "State PSC" when both match on "public service commission".
  if (matched.some((m) => m.slug === "upsc")) return matched.filter((m) => m.slug !== "state-psc");
  return matched;
}
