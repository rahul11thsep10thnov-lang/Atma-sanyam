import { ClassificationInput, ClassificationResult, FamilyClassifier } from "./FamilyClassifier";
import { PrimaryCategoryKey } from "../../data/categories";

interface CategoryRule {
  category: PrimaryCategoryKey;
  keywords: string[];
  /** Base score contribution when at least one keyword hits. */
  weight: number;
}

// Ordered from most specific to least specific — the first matching rule
// with the highest keyword-hit count wins.
const RULES: CategoryRule[] = [
  { category: "FAMILY_MURDER", keywords: ["murder", "killed his", "killed her", "stabbed to death", "strangled", "beheaded"], weight: 90 },
  { category: "FAMILY_KIDNAPPING", keywords: ["kidnap", "abduct"], weight: 85 },
  { category: "FAMILY_MISSING_PERSON", keywords: ["missing person", "went missing", "traced missing"], weight: 75 },
  { category: "DOMESTIC_CONFLICT", keywords: ["domestic violence", "dowry harassment", "cruelty by husband", "domestic abuse"], weight: 85 },
  { category: "HUSBAND_WIFE", keywords: ["husband", "wife", "divorce", "marital dispute", "spouse"], weight: 70 },
  { category: "IN_LAWS", keywords: ["in-law", "mother-in-law", "father-in-law", "sister-in-law", "brother-in-law"], weight: 70 },
  { category: "SIBLING_DISPUTE", keywords: ["brothers fight", "sister dispute", "siblings", "between brothers"], weight: 65 },
  { category: "PARENT_CHILD", keywords: ["son assaulted father", "daughter dispute", "son-mother", "parents and son"], weight: 65 },
  { category: "PROPERTY_INHERITANCE", keywords: ["property dispute", "ancestral property", "inheritance dispute", "land dispute", "will dispute"], weight: 75 },
  { category: "FAMILY_FRAUD", keywords: ["cheated by relative", "family fraud", "duped by uncle"], weight: 60 },
  { category: "NEIGHBOUR_DISPUTE", keywords: ["neighbour dispute", "neighbor dispute", "boundary wall dispute"], weight: 55 },
  { category: "FAMILY_CRIME", keywords: ["family dispute", "family feud", "family clash", "family attacked"], weight: 60 },
  { category: "OTHER_HUMAN_INTEREST", keywords: ["family reunion", "family struggle", "family sacrifice"], weight: 40 },
];

const GENERAL_NEWS_NEGATIVE_KEYWORDS = [
  "sensex",
  "nifty",
  "stock market",
  "cricket match",
  "election result",
  "budget session",
  "gdp growth",
  "weather forecast",
];

/**
 * Cheap, deterministic, zero-cost classifier. Used two ways:
 *  1. As a pre-filter that rejects obviously irrelevant articles before any
 *     LLM call is made (cost control, §29).
 *  2. As the classifier of record when no ANTHROPIC_API_KEY is configured
 *     (dev/test/offline mode).
 */
export class RuleBasedClassifier implements FamilyClassifier {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const text = `${input.headline} ${input.summary}`.toLowerCase();

    if (GENERAL_NEWS_NEGATIVE_KEYWORDS.some((k) => text.includes(k))) {
      return {
        primaryCategory: "NOT_RELEVANT",
        familyRelevanceScore: 0,
        reasoning: "Matched general-news negative keyword list.",
      };
    }

    let bestRule: CategoryRule | null = null;
    let bestHits = 0;

    for (const rule of RULES) {
      const hits = rule.keywords.filter((k) => text.includes(k)).length;
      if (hits > 0 && (bestRule === null || hits > bestHits || rule.weight > (bestRule?.weight ?? 0))) {
        if (bestRule === null || hits >= bestHits) {
          bestRule = rule;
          bestHits = hits;
        }
      }
    }

    if (!bestRule) {
      return {
        primaryCategory: "NOT_RELEVANT",
        familyRelevanceScore: 5,
        reasoning: "No family-related keywords matched.",
      };
    }

    const score = Math.min(100, bestRule.weight + (bestHits - 1) * 5);
    return {
      primaryCategory: bestRule.category,
      familyRelevanceScore: score,
      reasoning: `Matched ${bestHits} keyword(s) for category ${bestRule.category}.`,
    };
  }
}
