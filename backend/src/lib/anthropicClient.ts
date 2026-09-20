import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { logger } from "./logger";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (!env.anthropicApiKey) return null;
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

export function isAnthropicConfigured(): boolean {
  return !!env.anthropicApiKey;
}

/**
 * Calls Claude with a prompt that must return a single JSON object, and
 * parses it. Callers should always have a rule-based fallback for when no
 * API key is configured (dev/test) — see each module's Rule-based/Mock
 * implementation.
 */
export async function callClaudeForJson<T>(params: {
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response contained no text block");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error({ text: textBlock.text }, "Claude response did not contain JSON");
    throw new Error("Claude response did not contain parseable JSON");
  }

  return JSON.parse(jsonMatch[0]) as T;
}
