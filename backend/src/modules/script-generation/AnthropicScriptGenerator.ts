import { ScriptGenerationInput, GeneratedScript, ScriptGenerator, StoryScriptSections, assembleScript } from "./ScriptGenerator";
import { callClaudeForJson } from "../../lib/anthropicClient";
import { env } from "../../config/env";
import { TemplateScriptGenerator } from "./TemplateScriptGenerator";

const SYSTEM_PROMPT = `You write narration scripts for a serious, sober Indian family-news video platform.
Write a 2-4 minute narration (target 2-3 minutes, ~260-450 words) STRICTLY grounded in the facts
given to you. Never invent facts, quotes, motives, or police/court statements not present in the
input. Distinguish allegation vs confirmed fact: use phrases like "reportedly", "according to
police", "according to the FIR", "investigators said", "the court found", "allegedly" wherever a
claim is not a settled, convicted fact. Do not sensationalize; be factual and respectful, especially
for sensitive topics (domestic violence, minors, sexual offences, suicide) — omit unnecessary
personal identifying details.
Respond with ONLY a JSON object with these string fields: introduction, location, people,
background, sequence, authorities, currentStatus, context, sourceAttribution.`;

/**
 * LLM-backed script generator. Falls back to the deterministic
 * TemplateScriptGenerator if the call fails, so the pipeline never stalls
 * on an LLM outage.
 */
export class AnthropicScriptGenerator implements ScriptGenerator {
  private readonly fallback = new TemplateScriptGenerator();

  async generate(input: ScriptGenerationInput): Promise<GeneratedScript> {
    try {
      const facts = {
        title: input.extracted.title,
        location: [input.extracted.city, input.extracted.district, input.extracted.state].filter(Boolean).join(", "),
        eventDate: input.extracted.eventDate,
        peopleInvolved: input.extracted.peopleInvolved,
        relationships: input.extracted.relationships,
        whatHappened: input.extracted.whatHappened,
        background: input.extracted.background,
        policeAction: input.extracted.policeAction,
        legalStatus: input.extracted.legalStatus,
        currentStatus: input.extracted.currentStatus,
        sources: input.sourceNames,
      };

      const sections = await callClaudeForJson<StoryScriptSections>({
        model: env.scriptGenerationModel,
        system: SYSTEM_PROMPT,
        prompt: `Facts (JSON):\n${JSON.stringify(facts, null, 2)}`,
        maxTokens: 1500,
      });

      return assembleScript(sections);
    } catch {
      return this.fallback.generate(input);
    }
  }
}
