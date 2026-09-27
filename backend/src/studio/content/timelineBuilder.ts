import { ExtractedFact, TimelineEvent } from "../types";

const BACKGROUND_CUES = /\b(had been|had|years ago|months ago|since|were married|got married|married in|earlier|previously|long-standing|for years)\b/i;
const STATUS_CUES = /\b(investigation is|further investigation|is underway|are underway|has been sent|is being|remains|will be produced|next hearing|awaited|currently|so far|has registered|have registered|case has been registered)\b/i;
const WHEN_PATTERN = /\b(?:on\s)?(?:\d{1,2}(?:st|nd|rd|th)?\s[A-Z][a-z]+(?:\s\d{4})?|(?:on|last|this)\s(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s(?:morning|afternoon|evening|night))?|(?:around|at)\s\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.))/i;

function phase(sentence: string): number {
  if (STATUS_CUES.test(sentence)) return 2;
  if (BACKGROUND_CUES.test(sentence)) return 0;
  return 1;
}

/**
 * Stage: FACTUAL TIMELINE. Orders the narrative sentences chronologically
 * for storytelling — background first, then events in reported order, then
 * the current status — which is how a calm explainer is told (news copy is
 * usually written "most important first" instead). Only sentences from the
 * article are used; nothing is inferred.
 */
export function buildTimeline(facts: ExtractedFact[]): TimelineEvent[] {
  const narrative = facts.filter(
    (f) => (f.type === "EVENT" || f.type === "ALLEGATION" || f.type === "OFFICIAL_STATEMENT" || f.type === "CLAIM") && f.sourceSentence
  );
  const sorted = narrative
    .map((f, i) => ({ fact: f, index: f.timelineOrder ?? i, phase: phase(f.sourceSentence!) }))
    .sort((a, b) => a.phase - b.phase || a.index - b.index);

  return sorted.map(({ fact }, order) => ({
    order,
    when: fact.sourceSentence!.match(WHEN_PATTERN)?.[0],
    event: fact.value,
    sourceSentence: fact.sourceSentence!,
    isAllegation: fact.type === "ALLEGATION" || fact.type === "CLAIM",
  }));
}
