import { StoryExtractor } from "./StoryExtractor";
import { RuleBasedStoryExtractor } from "./RuleBasedStoryExtractor";
import { AnthropicStoryExtractor } from "./AnthropicStoryExtractor";
import { isAnthropicConfigured } from "../../lib/anthropicClient";

export * from "./StoryExtractor";

export function getStoryExtractor(): StoryExtractor {
  return isAnthropicConfigured() ? new AnthropicStoryExtractor() : new RuleBasedStoryExtractor();
}
