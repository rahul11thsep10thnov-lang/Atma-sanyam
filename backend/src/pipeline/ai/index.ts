import type { Env } from '../../config/env.js';
import { AnthropicProvider } from './anthropicProvider.js';
import { MockProvider } from './mockProvider.js';
import type { AiProvider } from './types.js';

/** The only place that decides which AI backend runs. The key never leaves the server. */
export function createAiProvider(env: Env): AiProvider {
  if (env.MOCK_AI) return new MockProvider({ faultRate: env.MOCK_AI_FAULT_RATE, latencyMs: env.MOCK_AI_LATENCY_MS });
  return new AnthropicProvider({
    apiKey: env.AI_API_KEY!,
    generationModel: env.AI_GENERATION_MODEL,
    reviewModel: env.AI_REVIEW_MODEL,
    effort: env.AI_EFFORT,
    priceOverride: { input: env.AI_PRICE_INPUT_PER_MTOK, output: env.AI_PRICE_OUTPUT_PER_MTOK },
  });
}
