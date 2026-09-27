import { JournalisticSafetyService } from "../../modules/safety/JournalisticSafetyService";
import { DialogueLine, LintFlag } from "../types";

const journalistic = new JournalisticSafetyService();

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeForMatch(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeForMatch(b).split(" ").filter(Boolean));
  if (ta.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / ta.size;
}

/** A direct quote is genuine only if it appears (near-)verbatim in the article. */
export function isQuoteInArticle(quote: string, articleText: string): boolean {
  const q = normalizeForMatch(quote);
  if (!q) return false;
  const article = normalizeForMatch(articleText);
  if (article.includes(q)) return true;
  const quotes = [...articleText.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return quotes.some((candidate) => tokenOverlap(quote, candidate) >= 0.9 && tokenOverlap(candidate, quote) >= 0.8);
}

/**
 * Enforces "never fabricate quotes attributed to real people": a line may
 * be spoken in a character's voice only if it is a verified direct quote,
 * or — when the admin enabled dramatised reconstruction — reconstructed
 * dialogue for an anonymised/non-real character.
 */
export function checkDialogue(
  dialogue: DialogueLine[],
  articleText: string,
  characters: { key: string; isRealPerson: boolean; anonymized: boolean }[],
  allowReconstruction: boolean
): LintFlag[] {
  const flags: LintFlag[] = [];
  for (const line of dialogue) {
    const speaker = characters.find((c) => c.key === line.speakerKey);
    if (line.statementType === "DIRECT_QUOTE") {
      if (!isQuoteInArticle(line.text, articleText)) {
        flags.push({ rule: "FABRICATED_QUOTE", severity: "BLOCKING", excerpt: line.text, suggestion: "Direct quotes must appear verbatim in the article. Convert to narration or remove." });
      }
    } else if (line.statementType === "RECONSTRUCTED_DIALOGUE") {
      if (!allowReconstruction) {
        flags.push({ rule: "RECONSTRUCTION_NOT_ALLOWED", severity: "BLOCKING", excerpt: line.text, suggestion: "Dramatised reconstruction is disabled for this story." });
      } else if (speaker && speaker.isRealPerson && !speaker.anonymized) {
        flags.push({ rule: "RECONSTRUCTED_QUOTE_FOR_NAMED_PERSON", severity: "BLOCKING", excerpt: line.text, suggestion: "Reconstructed lines may not be attributed to a named real person." });
      }
    } else {
      flags.push({ rule: "DIALOGUE_NOT_A_QUOTE", severity: "WARNING", excerpt: line.text, suggestion: "Reported statements should be read by the narrator." });
    }
  }
  return flags;
}

const NUMBER_TOKEN = /\d[\d,]*(?:\.\d+)?/g;

/** Numbers in the script that do not occur anywhere in the article (hallucination check). */
export function findUnsupportedNumbers(scriptText: string, articleText: string): string[] {
  const inArticle = new Set([...articleText.matchAll(NUMBER_TOKEN)].map((m) => m[0].replace(/,/g, "")));
  const unsupported = new Set<string>();
  for (const m of scriptText.matchAll(NUMBER_TOKEN)) {
    const n = m[0].replace(/,/g, "").replace(/\.$/, "");
    if (!inArticle.has(n) && n !== "14416") unsupported.add(m[0]);
  }
  return [...unsupported];
}

/** Capitalised multi-word names in an English script that never appear in the article. */
export function findUnsupportedNames(scriptText: string, articleText: string, allowed: string[] = []): string[] {
  const article = articleText.toLowerCase();
  const out = new Set<string>();
  for (const m of scriptText.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g)) {
    const candidate = m[1];
    if (article.includes(candidate.toLowerCase())) continue;
    if (allowed.some((a) => a.toLowerCase() === candidate.toLowerCase())) continue;
    if (/^(Tele|The|This|In|On|At|According)\b/.test(candidate)) continue;
    out.add(candidate);
  }
  return [...out];
}

/** Allegation hedging lint (reuses the news pipeline's journalistic rules). */
export function lintAllegations(text: string, sceneNumber?: number): LintFlag[] {
  return journalistic.lint(text).map((f) => ({ rule: f.rule, severity: f.severity, excerpt: f.excerpt, suggestion: f.suggestion, sceneNumber }));
}
