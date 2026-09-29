import type { GeneratedPage, GeneratedSection, GenerationInput, Cell } from "./types";

/**
 * Fact-check pass over generated content (spec sections 44 and 46).
 * It does not judge whether a statement is *true* — it enforces that the writer
 * did not introduce anything that is not in the structured input:
 *   • every ₹ amount, clock time, 4-digit year and 5-digit number (train/bus numbers)
 *     must appear in the input records;
 *   • tradition text must be framed as tradition ("According to…", "legend", "believed"…);
 *   • sections that display time-sensitive data from unverified records must carry a caveat;
 *   • missing data must be reported, not blank.
 * Budget sections are computed estimates: their ₹ figures are exempt but must be labelled "Estimated".
 */

export interface Violation {
  rule: "UNSUPPORTED_AMOUNT" | "UNSUPPORTED_TIME" | "UNSUPPORTED_YEAR" | "UNSUPPORTED_NUMBER" | "TRADITION_NOT_FRAMED" | "MISSING_CAVEAT" | "UNLABELLED_ESTIMATE" | "EMPTY_SECTION";
  section: string;
  detail: string;
}

export interface FactCheckResult {
  status: "PASSED" | "FAILED";
  violations: Violation[];
  checked_claims: number;
}

const FRAMING = /according to|tradition|legend|folklore|is believed|are believed|is said to|are said to|holds that|in the belief|account/i;

const cellText = (c: Cell) => (typeof c === "string" ? c : c.text);

function sectionTexts(s: GeneratedSection): string[] {
  return [
    ...s.paragraphs.map((p) => p.text),
    ...s.bullets.map(cellText),
    ...(s.table ? s.table.rows.flat().map(cellText) : [])
  ];
}

const norm = (t: string) => t.toLowerCase().replace(/[₹,\s]/g, "");

export function factCheck(page: GeneratedPage, input: GenerationInput): FactCheckResult {
  const haystack = norm(JSON.stringify(input));
  const haystackTimes = JSON.stringify(input).toLowerCase();
  const violations: Violation[] = [];
  let checked = 0;

  for (const s of page.sections) {
    const isEstimate = s.id === "budget";
    const texts = sectionTexts(s);

    if (texts.length === 0 && s.missing.length === 0) {
      violations.push({ rule: "EMPTY_SECTION", section: s.id, detail: "section has no content and does not report missing data" });
    }

    for (const text of texts) {
      if (!isEstimate) {
        for (const m of text.matchAll(/₹\s?[\d,]+/g)) {
          checked++;
          if (!haystack.includes(norm(m[0]).replace("₹", ""))) violations.push({ rule: "UNSUPPORTED_AMOUNT", section: s.id, detail: m[0] });
        }
      }
      for (const m of text.matchAll(/\b\d{1,2}:\d{2}\s?(?:am|pm)?\b/gi)) {
        checked++;
        if (!haystackTimes.includes(m[0].toLowerCase())) violations.push({ rule: "UNSUPPORTED_TIME", section: s.id, detail: m[0] });
      }
      for (const m of text.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)) {
        checked++;
        if (!haystackTimes.includes(m[0])) violations.push({ rule: "UNSUPPORTED_YEAR", section: s.id, detail: m[0] });
      }
      for (const m of text.matchAll(/\b\d{5}\b/g)) {
        checked++;
        if (!haystackTimes.includes(m[0])) violations.push({ rule: "UNSUPPORTED_NUMBER", section: s.id, detail: `${m[0]} (train/bus/other number)` });
      }
    }

    s.paragraphs
      .filter((p) => p.kind === "tradition")
      .forEach((p) => {
        checked++;
        if (!FRAMING.test(p.text) && !FRAMING.test(p.label ?? "")) violations.push({ rule: "TRADITION_NOT_FRAMED", section: s.id, detail: p.text.slice(0, 80) });
      });

    if (isEstimate && s.table && !s.paragraphs.some((p) => /estimated/i.test(p.text))) {
      violations.push({ rule: "UNLABELLED_ESTIMATE", section: s.id, detail: "budget figures must be labelled as estimated" });
    }

    const showsTimeSensitive = ["top-places", "how-to-reach", "where-to-stay", "shopping", "local-transport"].includes(s.id);
    if (showsTimeSensitive && s.table && s.verification.status !== "VERIFIED" && s.notices.length === 0) {
      violations.push({ rule: "MISSING_CAVEAT", section: s.id, detail: "unverified time-sensitive data shown without a caveat" });
    }
  }

  return { status: violations.length === 0 ? "PASSED" : "FAILED", violations, checked_claims: checked };
}

// ------------------------------------------------------------------ SEO

export interface SeoInput {
  meta_title: string;
  meta_description: string;
  h1: string;
  keywords: string[];
}

export interface SeoIssue {
  field: string;
  message: string;
  /** ERROR blocks publication; WARNING is advisory (e.g. keyword density on very short pages). */
  severity: "ERROR" | "WARNING";
}

/** Title ≤ 60, description 70–160, no keyword stuffing, one H1 that matches the destination. */
export function validateSeo(seo: SeoInput, destinationName: string, bodyText = ""): SeoIssue[] {
  const issues: SeoIssue[] = [];
  if (seo.meta_title.length > 60) issues.push({ field: "meta_title", severity: "ERROR", message: `${seo.meta_title.length} characters (max 60)` });
  if (seo.meta_description.length > 160) issues.push({ field: "meta_description", severity: "ERROR", message: `${seo.meta_description.length} characters (max 160)` });
  if (seo.meta_description.length < 70) issues.push({ field: "meta_description", severity: "ERROR", message: `${seo.meta_description.length} characters is too short to be useful (min 70)` });
  if (!seo.meta_title.toLowerCase().includes(destinationName.toLowerCase())) issues.push({ field: "meta_title", severity: "ERROR", message: "title does not name the destination" });
  if (!seo.h1.toLowerCase().includes(destinationName.toLowerCase())) issues.push({ field: "h1", severity: "ERROR", message: "H1 does not name the destination" });
  if (seo.keywords.length > 8) issues.push({ field: "keywords", severity: "ERROR", message: "more than 8 keywords looks like stuffing" });
  const words = bodyText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 100) {
    const count = words.filter((w) => w.replace(/[^a-z]/g, "") === destinationName.toLowerCase()).length;
    if (count / words.length > 0.04) issues.push({ field: "body", severity: "WARNING", message: `"${destinationName}" makes up ${((count / words.length) * 100).toFixed(1)}% of the text (max 4%)` });
  }
  return issues;
}
