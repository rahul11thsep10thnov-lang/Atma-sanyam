import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { generationResponseSchema, reviewResponseSchema } from '../questionSchema.js';
import { costUsd, type PriceOverride } from './pricing.js';
import { buildGenerationPrompt, buildReviewPrompt, GENERATOR_SYSTEM, REVIEWER_SYSTEM } from './prompts.js';
import {
  InvalidAiOutputError,
  PermanentAiError,
  type AiProvider,
  type AiUsage,
  type CallOptions,
  type GenerateParams,
  type ReviewParams,
} from './types.js';

export interface AnthropicConfig {
  apiKey: string;
  generationModel: string;
  reviewModel: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  priceOverride?: PriceOverride;
}

// Models that accept the server-side refusal fallback ("default" routing).
const FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-fable-5-1']);

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Strict JSON first; then tolerate code fences / text around the object. */
export function parseStructured<T>(text: string, schema: z.ZodType<T>): ParseResult<T> {
  const candidates = [text.trim()];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  let error = 'no JSON object found';
  for (const c of candidates) {
    let json: unknown;
    try {
      json = JSON.parse(c);
    } catch (e) {
      error = `invalid JSON: ${(e as Error).message}`;
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return { ok: true, data: parsed.data };
    error = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }
  return { ok: false, error };
}

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  readonly generationModel: string;
  readonly reviewModel: string;
  private readonly client: Anthropic;

  constructor(private readonly cfg: AnthropicConfig) {
    this.generationModel = cfg.generationModel;
    this.reviewModel = cfg.reviewModel;
    // The SDK retries 408/409/429/5xx and connection errors itself.
    this.client = new Anthropic({ apiKey: cfg.apiKey, maxRetries: 2 });
  }

  async generate(params: GenerateParams, opts: CallOptions) {
    const { data, usage } = await this.structuredCall(
      this.generationModel,
      GENERATOR_SYSTEM,
      buildGenerationPrompt(params),
      generationResponseSchema,
      opts.timeoutMs
    );
    return { questions: data.questions, usage };
  }

  async review(params: ReviewParams, opts: CallOptions) {
    const { data, usage } = await this.structuredCall(
      this.reviewModel,
      REVIEWER_SYSTEM,
      buildReviewPrompt(params),
      reviewResponseSchema,
      opts.timeoutMs
    );
    return { reviews: data.reviews, usage };
  }

  /**
   * One structured-output request, plus at most one correction round-trip if
   * the reply still fails schema validation. Throws InvalidAiOutputError
   * (retryable at batch level) or PermanentAiError (not worth retrying).
   */
  private async structuredCall<T>(
    model: string,
    system: string,
    prompt: string,
    schema: z.ZodType<T>,
    timeoutMs: number
  ): Promise<{ data: T; usage: AiUsage }> {
    const format = betaZodOutputFormat(schema);
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }];
    const usage: AiUsage = { model, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    let lastError = '';

    for (let round = 0; round < 2; round++) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await this.client.beta.messages.create(
          {
            model,
            max_tokens: 32000,
            system,
            messages,
            thinking: { type: 'adaptive' },
            output_config: { effort: this.cfg.effort, format: { type: 'json_schema', schema: format.schema } },
            ...(FALLBACK_MODELS.has(model)
              ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
              : {}),
          },
          { timeout: timeoutMs }
        );
      } catch (e) {
        if (
          e instanceof Anthropic.AuthenticationError ||
          e instanceof Anthropic.PermissionDeniedError ||
          e instanceof Anthropic.NotFoundError ||
          e instanceof Anthropic.BadRequestError
        ) {
          throw new PermanentAiError(`AI provider rejected the request (${e.status}): ${e.message}`);
        }
        throw e; // rate limit / 5xx / timeout after SDK retries: retry the batch later
      }

      usage.inputTokens += response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0);
      usage.outputTokens += response.usage.output_tokens;
      usage.costUsd = costUsd(model, usage.inputTokens, usage.outputTokens, this.cfg.priceOverride);

      if (response.stop_reason === 'refusal') {
        throw new PermanentAiError(`The model declined this request${response.stop_details?.category ? ` (${response.stop_details.category})` : ''}.`);
      }
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      const parsed = parseStructured(text, schema);
      if (parsed.ok) return { data: parsed.data, usage };
      lastError = response.stop_reason === 'max_tokens' ? 'reply was cut off (max_tokens)' : parsed.error;

      // Correction: keep the conversation append-only (reply unchanged, then the fix request).
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: `Your reply did not match the required JSON schema (${lastError}). Reply again with only the complete, corrected JSON object.`,
      });
    }
    throw new InvalidAiOutputError(`AI output failed schema validation after a correction attempt: ${lastError}`, usage);
  }
}
