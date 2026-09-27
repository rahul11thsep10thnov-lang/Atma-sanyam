import { callClaudeForJson, isAnthropicConfigured } from "../../../lib/anthropicClient";
import { env } from "../../../config/env";
import { LLMJsonRequest, LLMProvider } from "./LLMProvider";

export class AnthropicLLMProvider implements LLMProvider {
  readonly key = "anthropic";
  readonly model = env.studio.llmModel;

  isConfigured(): boolean {
    return isAnthropicConfigured();
  }

  completeJson<T>(request: LLMJsonRequest): Promise<T> {
    return callClaudeForJson<T>({ model: this.model, system: request.system, prompt: request.prompt, maxTokens: request.maxTokens ?? 4096 });
  }
}
