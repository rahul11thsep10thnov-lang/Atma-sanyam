export interface LLMJsonRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/**
 * Large-language-model provider used for article analysis, master-script
 * writing and localisation. Every caller has a deterministic rule-based
 * fallback for when no provider is configured.
 */
export interface LLMProvider {
  readonly key: string;
  readonly model: string;
  isConfigured(): boolean;
  completeJson<T>(request: LLMJsonRequest): Promise<T>;
}
