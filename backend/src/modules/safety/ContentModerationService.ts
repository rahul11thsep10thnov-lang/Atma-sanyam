import { PrimaryCategoryKey } from "../../data/categories";
import { SENSITIVE_CATEGORIES } from "../../data/categories";

export interface ModerationFlag {
  rule: string;
  severity: "BLOCKING" | "WARNING";
  excerpt?: string;
}

const PHONE_PATTERN = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/;
const AADHAAR_PATTERN = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
const BANK_ACCOUNT_PATTERN = /\b(?:account\s*(?:no\.?|number)\s*[:\-]?\s*)\d{8,18}\b/i;
const MINOR_AGE_PATTERN = /\b(\d{1,2})\s*[- ]?year[- ]?old\b/i;
const GRAPHIC_VIOLENCE_KEYWORDS = ["dismembered", "beheaded", "mutilated", "chopped into pieces", "burnt alive"];
const SEXUAL_CONTENT_KEYWORDS = ["raped", "sexually assaulted", "molested"];
const HATE_SPEECH_KEYWORDS = ["all [a-z]+ people are", "those people always"]; // deliberately narrow; real system would use a dedicated classifier
const SENSATIONALISM_KEYWORDS = ["shocking!!!", "you won't believe", "gruesome details inside"];
const SUICIDE_KEYWORDS = ["suicide", "hanged herself", "hanged himself", "took her own life", "took his own life"];

/**
 * Automated moderation layer (spec §38 / §11). Flags content for human
 * review rather than silently blocking, except for hard privacy violations
 * (PII) and content involving minors, which are BLOCKING by default —
 * consistent with the "especially conservative privacy rules for minors"
 * requirement in §11.
 */
export class ContentModerationService {
  moderate(scriptText: string, category: PrimaryCategoryKey): ModerationFlag[] {
    const flags: ModerationFlag[] = [];

    if (PHONE_PATTERN.test(scriptText)) {
      flags.push({ rule: "PHONE_NUMBER_PRESENT", severity: "BLOCKING", excerpt: scriptText.match(PHONE_PATTERN)?.[0] });
    }
    if (AADHAAR_PATTERN.test(scriptText)) {
      flags.push({ rule: "POSSIBLE_AADHAAR_NUMBER", severity: "BLOCKING" });
    }
    if (BANK_ACCOUNT_PATTERN.test(scriptText)) {
      flags.push({ rule: "FINANCIAL_ACCOUNT_NUMBER_PRESENT", severity: "BLOCKING" });
    }

    const minorMatch = scriptText.match(MINOR_AGE_PATTERN);
    if (minorMatch && Number(minorMatch[1]) < 18) {
      flags.push({
        rule: "MINOR_MENTIONED",
        severity: "BLOCKING",
        excerpt: minorMatch[0],
      });
    }

    if (GRAPHIC_VIOLENCE_KEYWORDS.some((k) => scriptText.toLowerCase().includes(k))) {
      flags.push({ rule: "GRAPHIC_VIOLENCE_DESCRIPTION", severity: "WARNING" });
    }
    if (SEXUAL_CONTENT_KEYWORDS.some((k) => scriptText.toLowerCase().includes(k))) {
      flags.push({ rule: "SEXUAL_OFFENCE_CONTENT", severity: "WARNING" });
    }
    if (SUICIDE_KEYWORDS.some((k) => scriptText.toLowerCase().includes(k))) {
      flags.push({ rule: "SUICIDE_RELATED_CONTENT", severity: "WARNING" });
    }
    if (SENSATIONALISM_KEYWORDS.some((k) => scriptText.toLowerCase().includes(k))) {
      flags.push({ rule: "SENSATIONALIST_LANGUAGE", severity: "WARNING" });
    }
    for (const pattern of HATE_SPEECH_KEYWORDS) {
      if (new RegExp(pattern, "i").test(scriptText)) {
        flags.push({ rule: "POSSIBLE_HATE_SPEECH", severity: "WARNING" });
      }
    }

    if (SENSITIVE_CATEGORIES.has(category)) {
      flags.push({ rule: "SENSITIVE_CATEGORY_REQUIRES_HUMAN_REVIEW", severity: "WARNING" });
    }

    return flags;
  }

  hasBlockingFlags(flags: ModerationFlag[]): boolean {
    return flags.some((f) => f.severity === "BLOCKING");
  }
}
