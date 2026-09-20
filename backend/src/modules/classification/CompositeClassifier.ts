import { ClassificationInput, ClassificationResult, FamilyClassifier } from "./FamilyClassifier";
import { RuleBasedClassifier } from "./RuleBasedClassifier";
import { AnthropicClassifier } from "./AnthropicClassifier";
import { isAnthropicConfigured } from "../../lib/anthropicClient";
import { logger } from "../../lib/logger";

/** Below this rule-based score, we never bother spending an LLM call (§29 cost control). */
const PRE_FILTER_MIN_SCORE = 15;

/**
 * The classifier of record used by the pipeline. Implements the cascade
 * described in ARCHITECTURE.md §6: a free keyword pre-filter runs on every
 * article; only articles that clear the pre-filter bar spend an LLM call
 * for a precise score. Falls back to the rule-based result entirely when
 * no Anthropic key is configured (dev/test).
 */
export class CompositeClassifier implements FamilyClassifier {
  private readonly ruleBased = new RuleBasedClassifier();
  private readonly llm = new AnthropicClassifier();

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const preFilterResult = await this.ruleBased.classify(input);

    if (preFilterResult.familyRelevanceScore < PRE_FILTER_MIN_SCORE) {
      return preFilterResult;
    }

    if (!isAnthropicConfigured()) {
      return preFilterResult;
    }

    try {
      return await this.llm.classify(input);
    } catch (error) {
      logger.error({ err: error }, "AnthropicClassifier failed, falling back to rule-based result");
      return preFilterResult;
    }
  }
}
