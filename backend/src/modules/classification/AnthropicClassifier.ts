import { ClassificationInput, ClassificationResult, FamilyClassifier } from "./FamilyClassifier";
import { PrimaryCategoryKey } from "../../data/categories";
import { callClaudeForJson } from "../../lib/anthropicClient";
import { env } from "../../config/env";

const VALID_CATEGORIES: PrimaryCategoryKey[] = [
  "FAMILY_DISPUTE",
  "HUSBAND_WIFE",
  "IN_LAWS",
  "SIBLING_DISPUTE",
  "PARENT_CHILD",
  "PROPERTY_INHERITANCE",
  "DOMESTIC_CONFLICT",
  "FAMILY_CRIME",
  "FAMILY_MURDER",
  "FAMILY_MISSING_PERSON",
  "FAMILY_KIDNAPPING",
  "FAMILY_FRAUD",
  "NEIGHBOUR_DISPUTE",
  "OTHER_HUMAN_INTEREST",
  "NOT_RELEVANT",
];

const SYSTEM_PROMPT = `You are a news classification assistant for an Indian family-news platform.
Classify each article into exactly one of these categories: ${VALID_CATEGORIES.join(", ")}.
The platform's editorial focus is family disputes, conflicts, and crimes: husband-wife disputes,
in-law disputes, sibling disputes, parent-child disputes, property/inheritance disputes, domestic
violence, family murder, missing persons/kidnapping involving families, family fraud, and
neighbour disputes rooted in family/property issues. General news unrelated to family life must be
classified NOT_RELEVANT.
Respond with ONLY a JSON object: {"primaryCategory": "...", "familyRelevanceScore": 0-100, "reasoning": "one sentence"}`;

/**
 * LLM-backed classifier, run only on articles that already passed the
 * cheap RuleBasedClassifier pre-filter (cost control, §29). Uses the
 * smaller/cheaper model tier since this call runs on every ingested
 * article that reaches this stage.
 */
export class AnthropicClassifier implements FamilyClassifier {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const result = await callClaudeForJson<{
      primaryCategory: string;
      familyRelevanceScore: number;
      reasoning: string;
    }>({
      model: env.classificationModel,
      system: SYSTEM_PROMPT,
      prompt: `Headline: ${input.headline}\n\nArticle extract:\n${input.summary}`,
      maxTokens: 300,
    });

    const primaryCategory = VALID_CATEGORIES.includes(result.primaryCategory as PrimaryCategoryKey)
      ? (result.primaryCategory as PrimaryCategoryKey)
      : "NOT_RELEVANT";

    return {
      primaryCategory,
      familyRelevanceScore: clamp(result.familyRelevanceScore, 0, 100),
      reasoning: result.reasoning ?? "",
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
