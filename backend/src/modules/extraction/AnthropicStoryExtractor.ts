import { ExtractedStory, StoryExtractionInput, StoryExtractor } from "./StoryExtractor";
import { callClaudeForJson } from "../../lib/anthropicClient";
import { env } from "../../config/env";
import { RuleBasedStoryExtractor } from "./RuleBasedStoryExtractor";

const SYSTEM_PROMPT = `You extract structured facts from a family-related news article for an Indian
news platform. Extract ONLY facts stated in the source text — never infer, guess, or invent
anything not present. If a field is not mentioned, use null. Distinguish allegation vs confirmed
fact in how you phrase policeAction/legalStatus/currentStatus (e.g. "Police have accused..." not
"...did...").
Respond with ONLY a JSON object of this shape:
{
  "title": "string",
  "eventDate": "ISO date string or null",
  "state": "Indian state/UT name or null",
  "district": "district or null",
  "city": "city or null",
  "peopleInvolved": [{"name": "string", "role": "string", "ageRange": "string or null"}],
  "relationships": [{"personA": "string", "personB": "string", "relationship": "string"}],
  "whatHappened": "1-2 sentence factual summary",
  "background": "string or null",
  "policeAction": "string or null",
  "legalStatus": "string or null",
  "currentStatus": "string or null",
  "presentElements": ["subset of: what, who, where, when, cause, sequence, police_legal, current_status, background"]
}`;

/**
 * LLM-backed extraction, run once per family-relevant article (already
 * filtered by classification, so volume here is much lower than the
 * classification stage). Falls back to the rule-based extractor if the
 * call fails or no API key is configured.
 */
export class AnthropicStoryExtractor implements StoryExtractor {
  private readonly fallback = new RuleBasedStoryExtractor();

  async extract(input: StoryExtractionInput): Promise<ExtractedStory> {
    try {
      const result = await callClaudeForJson<{
        title: string;
        eventDate: string | null;
        state: string | null;
        district: string | null;
        city: string | null;
        peopleInvolved: { name: string; role: string; ageRange?: string | null }[];
        relationships: { personA: string; personB: string; relationship: string }[];
        whatHappened: string;
        background: string | null;
        policeAction: string | null;
        legalStatus: string | null;
        currentStatus: string | null;
        presentElements: string[];
      }>({
        model: env.scriptGenerationModel,
        system: SYSTEM_PROMPT,
        prompt: `Headline: ${input.headline}\n\nArticle extract:\n${input.summary}`,
        maxTokens: 1200,
      });

      return {
        title: result.title || input.headline,
        eventType: input.category,
        eventDate: result.eventDate ? new Date(result.eventDate) : null,
        state: result.state,
        district: result.district,
        city: result.city,
        peopleInvolved: result.peopleInvolved ?? [],
        relationships: result.relationships ?? [],
        whatHappened: result.whatHappened || input.summary,
        background: result.background,
        policeAction: result.policeAction,
        legalStatus: result.legalStatus,
        currentStatus: result.currentStatus,
        presentElements: result.presentElements ?? [],
        presentElementCount: (result.presentElements ?? []).length,
      };
    } catch {
      return this.fallback.extract(input);
    }
  }
}
