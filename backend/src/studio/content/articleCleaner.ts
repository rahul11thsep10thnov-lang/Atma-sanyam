export interface CleaningResult {
  text: string;
  removedLines: string[];
  redactions: string[];
}

// Boilerplate that news pages wrap around the actual report.
const BOILERPLATE_PATTERNS = [
  /^(also read|read also|read more|recommended|related|watch|trending|advertisement|sponsored)\b/i,
  /^(click here|follow us|subscribe|download the app|sign up|share this|join our)\b/i,
  /^\(?(with inputs from|inputs from|edited by|written by|reported by)\b.*\)?$/i,
  /^(copyright|©|all rights reserved)/i,
  /^(first published|updated|published):?\s/i,
  /^(tags?|topics?):\s/i,
];

const DATELINE_PATTERN = /^[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?\s?(?:\((?:PTI|IANS|ANI|Reuters)\))?\s?[:\-]\s+/;
const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g;
const PHONE_PATTERN = /(?:\+91[-\s]?)?\b[6-9]\d{9}\b/g;
const AADHAAR_PATTERN = /\b\d{4}\s\d{4}\s\d{4}\b/g;

/**
 * Stage: CLEANING. Strips HTML and page boilerplate, normalises quotes,
 * dashes and whitespace, drops duplicated paragraphs, and redacts personal
 * contact details (phone, e-mail, Aadhaar-like numbers) that must never
 * reach a script. The cleaned text is the single source every later stage
 * (and every fact check) works from.
 */
export function cleanArticle(input: string): CleaningResult {
  const removedLines: string[] = [];
  const redactions: string[] = [];

  let text = input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, " - ")
    .replace(/…/g, "...")
    .replace(/\r\n?/g, "\n");

  const redact = (pattern: RegExp, label: string) => {
    text = text.replace(pattern, (match) => {
      redactions.push(`${label}: ${match}`);
      return "";
    });
  };
  redact(URL_PATTERN, "url");
  redact(EMAIL_PATTERN, "email");
  redact(PHONE_PATTERN, "phone");
  redact(AADHAAR_PATTERN, "id-number");

  const seen = new Set<string>();
  const paragraphs: string[] = [];
  for (const rawLine of text.split(/\n+/)) {
    let line = rawLine.replace(/[ \t]+/g, " ").trim();
    // Datelines such as "Jaipur:" or "NEW DELHI (PTI) -" at the start of the report.
    if (paragraphs.length === 0) line = line.replace(DATELINE_PATTERN, "");
    if (!line) continue;
    if (BOILERPLATE_PATTERNS.some((p) => p.test(line))) {
      removedLines.push(line);
      continue;
    }
    const fingerprint = line.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    if (seen.has(fingerprint)) {
      removedLines.push(line);
      continue;
    }
    seen.add(fingerprint);
    paragraphs.push(line);
  }

  return {
    text: paragraphs.join("\n\n").replace(/ +([,.;:!?])/g, "$1").replace(/\( +/g, "(").replace(/ +\)/g, ")"),
    removedLines,
    redactions,
  };
}
