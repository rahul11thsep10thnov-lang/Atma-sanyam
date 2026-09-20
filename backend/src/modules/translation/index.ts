import { TranslationService } from "./TranslationService";
import { AnthropicTranslationService } from "./AnthropicTranslationService";
import { PassthroughTranslationService } from "./PassthroughTranslationService";
import { isAnthropicConfigured } from "../../lib/anthropicClient";

export * from "./TranslationService";

export function getTranslationService(): TranslationService {
  return isAnthropicConfigured() ? new AnthropicTranslationService() : new PassthroughTranslationService();
}
