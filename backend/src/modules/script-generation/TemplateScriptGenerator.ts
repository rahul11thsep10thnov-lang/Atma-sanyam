import { ScriptGenerationInput, GeneratedScript, ScriptGenerator, StoryScriptSections, assembleScript } from "./ScriptGenerator";

/**
 * Deterministic, template-based script assembler used as the offline/dev
 * fallback and as a safety net if the LLM generator fails. It composes the
 * §9 sections strictly from already-extracted facts — it never invents
 * anything beyond what ExtractedStory contains, so it trivially satisfies
 * §10 as long as ExtractedStory's own fields are already hedged correctly
 * (enforced upstream by the extractor + the JournalisticSafetyService lint
 * that always runs afterward regardless of which generator produced the text).
 */
export class TemplateScriptGenerator implements ScriptGenerator {
  async generate(input: ScriptGenerationInput): Promise<GeneratedScript> {
    const { extracted, sourceNames } = input;
    const locationText = [extracted.city, extracted.district, extracted.state].filter(Boolean).join(", ") || "an undisclosed location in India";

    const peopleText =
      extracted.peopleInvolved.length > 0
        ? extracted.peopleInvolved.map((p) => `${p.name}, described by reports as ${p.role}`).join("; ") +
          (extracted.relationships.length > 0
            ? ". " + extracted.relationships.map((r) => `${r.personA} and ${r.personB} are reported to be ${r.relationship}.`).join(" ")
            : "")
        : "Names and relationships of those involved have not been fully confirmed by reports.";

    const sections: StoryScriptSections = {
      introduction: `${extracted.title}. Here is what has been reported so far.`,
      location: `The incident was reported in ${locationText}.`,
      people: peopleText,
      background: extracted.background ?? "Reports have not provided further background on what led up to this incident.",
      sequence: extracted.whatHappened,
      authorities: extracted.policeAction ?? "No police or official action has been reported so far.",
      currentStatus: extracted.currentStatus ?? extracted.legalStatus ?? "The current status of the case has not been reported.",
      context: "This summary reflects only what has been reported by the sources cited below; it may be updated as more details emerge.",
      sourceAttribution: `AI-generated summary based on reports from ${sourceNames.join(", ")}.`,
    };

    return assembleScript(sections);
  }
}
