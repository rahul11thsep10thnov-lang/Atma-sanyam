export interface SafetyFlag {
  rule: string;
  severity: "BLOCKING" | "WARNING";
  excerpt: string;
  suggestion?: string;
}

// Verbs that assert wrongdoing as settled fact — must be hedged unless the
// text is describing a court finding/conviction (spec §10).
const ACCUSATION_VERBS = [
  "murdered",
  "killed",
  "raped",
  "assaulted",
  "stole",
  "kidnapped",
  "abducted",
  "strangled",
  "stabbed",
  "poisoned",
  "cheated",
  "defrauded",
];

const HEDGE_PHRASES = [
  "allegedly",
  "according to police",
  "according to the fir",
  "police said",
  "police have accused",
  "investigators said",
  "authorities reported",
  "the court found",
  "was accused of",
  "reportedly",
  "witnesses claim",
  "witnesses said",
  "the complaint alleges",
  "convicted",
  "found guilty",
];

const FABRICATED_QUOTE_PATTERN = /"[^"]{15,}"/; // a long quoted string is a red flag unless sourced elsewhere in pipeline metadata

/**
 * Enforces spec §10 — the AI must never convert an allegation into a
 * confirmed fact. Runs as a lint pass over generated script text and
 * returns flags; BLOCKING flags must be resolved (by regenerating or
 * editing the script) before the story can leave SAFETY_CHECKED.
 */
export class JournalisticSafetyService {
  lint(scriptText: string): SafetyFlag[] {
    const flags: SafetyFlag[] = [];
    const sentences = scriptText.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const hasAccusationVerb = ACCUSATION_VERBS.some((v) => lower.includes(v));
      if (!hasAccusationVerb) continue;

      const isHedged = HEDGE_PHRASES.some((phrase) => lower.includes(phrase));
      if (!isHedged) {
        flags.push({
          rule: "UNHEDGED_ALLEGATION",
          severity: "BLOCKING",
          excerpt: sentence.trim(),
          suggestion:
            "Attribute this claim explicitly (e.g. 'police have accused...', 'according to the FIR...') unless a court has already convicted.",
        });
      }
    }

    if (FABRICATED_QUOTE_PATTERN.test(scriptText)) {
      flags.push({
        rule: "POSSIBLE_FABRICATED_QUOTE",
        severity: "WARNING",
        excerpt: scriptText.match(FABRICATED_QUOTE_PATTERN)?.[0] ?? "",
        suggestion: "Quotes must come verbatim from a cited source; verify against source articles or remove.",
      });
    }

    return flags;
  }

  hasBlockingFlags(flags: SafetyFlag[]): boolean {
    return flags.some((f) => f.severity === "BLOCKING");
  }
}
