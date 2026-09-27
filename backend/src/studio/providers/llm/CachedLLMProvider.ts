import { PrismaClient } from "@prisma/client";
import { cachedAi } from "../../cache";
import { LLMJsonRequest, LLMProvider } from "./LLMProvider";

/** Wraps any LLM provider with the ai_cache table: identical prompts are never paid for twice. */
export class CachedLLMProvider implements LLMProvider {
  readonly key: string;
  readonly model: string;

  constructor(private readonly inner: LLMProvider, private readonly prisma: PrismaClient) {
    this.key = inner.key;
    this.model = inner.model;
  }

  isConfigured(): boolean {
    return this.inner.isConfigured();
  }

  completeJson<T>(request: LLMJsonRequest): Promise<T> {
    return cachedAi(this.prisma, ["llm", this.inner.key, this.inner.model, request.system, request.prompt], () => this.inner.completeJson<T>(request));
  }
}
