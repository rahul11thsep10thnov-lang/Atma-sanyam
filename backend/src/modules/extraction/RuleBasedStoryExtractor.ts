import { ExtractedStory, StoryExtractionInput, StoryExtractor } from "./StoryExtractor";
import { INDIA_STATES } from "../../data/indiaLocations";

const POLICE_KEYWORDS = ["police", "fir", "case registered", "arrested", "investigat"];
const LEGAL_KEYWORDS = ["court", "chargesheet", "acquitted", "convicted", "bail", "custody"];
const STATUS_KEYWORDS = ["is reported to be", "remains", "currently", "as of", "condition is", "custody"];
const CAUSE_KEYWORDS = ["dispute", "argument", "quarrel", "feud", "allegedly", "reportedly", "over"];
const BACKGROUND_KEYWORDS = ["since", "years", "earlier", "previously", "had been", "long-running", "history"];

/**
 * Deterministic, no-LLM extraction used as a fallback (dev/test, or if the
 * LLM extractor fails) and as a cheap first pass. It does not aim to be as
 * good as an LLM extraction — its job is to make the pipeline fully
 * runnable offline and to give the suitability scorer a defensible signal
 * (does the text actually cover the 9 explanatory elements from §2).
 */
export class RuleBasedStoryExtractor implements StoryExtractor {
  async extract(input: StoryExtractionInput): Promise<ExtractedStory> {
    const text = `${input.headline}. ${input.summary}`;
    const lowerText = text.toLowerCase();

    const location = findLocation(text);
    const hasWho = /\b[A-Z][a-z]+ (Kumar|Singh|Sharma|Devi|Khan|Reddy|Rao|Das|Nair|Iyer|Patel|[A-Z][a-z]+)\b/.test(text);
    const hasWhat = input.summary.length > 40;
    const hasWhere = location.state !== null;
    const hasWhen = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|yesterday|\d{4})\b/i.test(text);
    const hasCause = CAUSE_KEYWORDS.some((k) => lowerText.includes(k));
    const hasSequence = input.summary.split(/[.!?]/).filter((s) => s.trim().length > 15).length >= 3;
    const hasPoliceLegal = POLICE_KEYWORDS.some((k) => lowerText.includes(k)) || LEGAL_KEYWORDS.some((k) => lowerText.includes(k));
    const hasCurrentStatus = STATUS_KEYWORDS.some((k) => lowerText.includes(k));
    const hasBackground = BACKGROUND_KEYWORDS.some((k) => lowerText.includes(k));

    const presentElements = [
      hasWhat && "what",
      hasWho && "who",
      hasWhere && "where",
      hasWhen && "when",
      hasCause && "cause",
      hasSequence && "sequence",
      hasPoliceLegal && "police_legal",
      hasCurrentStatus && "current_status",
      hasBackground && "background",
    ].filter((v): v is string => !!v);

    return {
      title: input.headline,
      eventType: input.category,
      eventDate: null,
      state: location.state,
      district: location.district,
      city: null,
      peopleInvolved: [],
      relationships: [],
      whatHappened: input.summary,
      background: hasBackground ? extractSentenceContaining(input.summary, BACKGROUND_KEYWORDS) : null,
      policeAction: hasPoliceLegal ? extractSentenceContaining(input.summary, POLICE_KEYWORDS) : null,
      legalStatus: hasPoliceLegal ? extractSentenceContaining(input.summary, LEGAL_KEYWORDS) : null,
      currentStatus: hasCurrentStatus ? extractSentenceContaining(input.summary, STATUS_KEYWORDS) : null,
      presentElementCount: presentElements.length,
      presentElements,
    };
  }
}

function findLocation(text: string): { state: string | null; district: string | null } {
  for (const state of INDIA_STATES) {
    for (const district of state.districts) {
      if (text.includes(district)) {
        return { state: state.name, district };
      }
    }
    if (text.includes(state.name)) {
      return { state: state.name, district: null };
    }
  }
  return { state: null, district: null };
}

function extractSentenceContaining(text: string, keywords: string[]): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const match = sentences.find((s) => keywords.some((k) => s.toLowerCase().includes(k)));
  return match ?? null;
}
