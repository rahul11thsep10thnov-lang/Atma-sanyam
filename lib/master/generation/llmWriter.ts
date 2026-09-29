import Anthropic from "@anthropic-ai/sdk";
import { factCheck } from "./validator";
import { TemplateWriter } from "./templateWriter";
import type { ContentWriter, GeneratedPage, GenerationInput } from "./types";

/**
 * Optional LLM presentation layer (spec section 37 "AI features"). Opt-in via
 * AI_PROVIDER=anthropic + ANTHROPIC_API_KEY. The database stays the source of
 * truth: the model only *rephrases* the descriptive paragraphs the template
 * writer already produced from stored records. Each rewrite is re-checked with
 * the same fact-check as any other content; on an error, a refusal, or any
 * claim that cannot be traced to the input, the original template text is kept.
 */

const SYSTEM_PROMPT = `You edit travel-guide paragraphs for an Indian tourism website.
Rewrite the paragraph in simple, natural English for Indian travellers. Rules:
- Use ONLY the facts in the paragraph and the FACTS JSON. Never add prices, opening hours, dates, years, train or bus numbers, distances or historical events that are not present in them.
- Keep any wording that frames a story as tradition, legend or belief ("According to…"). Never present mythology as historical fact.
- Do not add recommendations, superlatives or claims of availability.
- Keep every currency amount in Indian format exactly as given.
- Return only the rewritten paragraph — no preamble, no markdown.`;

const REWRITABLE_SECTIONS = new Set(["why-visit", "today"]);

export class LlmWriter implements ContentWriter {
  readonly name: string;
  readonly version = "1.0.0";
  private client: Anthropic;
  private base = new TemplateWriter();

  constructor(private model: string = process.env.AI_MODEL ?? "claude-opus-5-5", client?: Anthropic) {
    this.name = `budgettourism-llm-writer:${model}`;
    this.client = client ?? new Anthropic();
  }

  async write(input: GenerationInput): Promise<GeneratedPage> {
    const page = this.base.write(input);
    for (const section of page.sections) {
      if (!REWRITABLE_SECTIONS.has(section.id)) continue;
      for (const paragraph of section.paragraphs) {
        if (paragraph.kind !== "fact" || paragraph.text.length < 60) continue;
        const rewritten = await this.rewrite(paragraph.text, input);
        if (!rewritten) continue;
        const original = paragraph.text;
        paragraph.text = rewritten;
        // Re-run the guard on the candidate; revert if it introduces anything untraceable.
        if (factCheck(page, input).status === "FAILED") paragraph.text = original;
      }
    }
    return { ...page, writer: { name: this.name, version: this.version } };
  }

  private async rewrite(text: string, input: GenerationInput): Promise<string | null> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 1500,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              paragraph: text,
              FACTS: {
                destination: input.destination,
                categories: input.categories,
                attractions: input.attractions.slice(0, 6).map((a) => a.name)
              }
            })
          }
        ]
      });
      if (response.stop_reason === "refusal") return null;
      const block = response.content.find((b) => b.type === "text");
      const out = block && block.type === "text" ? block.text.trim() : "";
      return out.length >= 40 ? out : null;
    } catch (error) {
      if (error instanceof Anthropic.APIError) return null; // fall back to template text
      throw error;
    }
  }
}

/** Chooses the writer: the LLM writer only when explicitly enabled and a key is present. */
export function getContentWriter(): ContentWriter {
  if (process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY) return new LlmWriter();
  return new TemplateWriter();
}
