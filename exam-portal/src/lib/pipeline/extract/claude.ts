import { z } from "zod";
import { noticeExtractionSchema, pageOfOffset, type ExtractedNotice, type NoticeExtraction, type ProvenanceMap } from "./schema";
import { scoreOverall } from "./rules";

/**
 * Claude-backed extractor, used only when ANTHROPIC_API_KEY is set and
 * only for documents the rule extractor is not confident about (staged
 * pipeline, spec §36). Hallucination guard (§38): the model must return a
 * verbatim `evidence` quote for every non-null field; a quote that isn't
 * found in the document text marks that field unverified and caps its
 * confidence, so an invented value can never auto-publish.
 */
export const claudeOutputSchema = noticeExtractionSchema.extend({
  evidence: z.array(
    z.object({
      field: z.string(),
      quote: z.string(),
    }),
  ),
});
export type ClaudeOutput = z.infer<typeof claudeOutputSchema>;

export const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TEXT_CHARS = 400_000;

export const SYSTEM_PROMPT = `You extract structured facts from Indian government recruitment and examination notices (job advertisements, admit cards, answer keys, results, corrigenda).

Rules you must follow:
- Only report what the document states. If a value is not present, return null (or an empty list). Never infer vacancies, dates, fees, ages, eligibility, salary or URLs from what is typical for the organization.
- Dates must be ISO yyyy-mm-dd. Indian notices write dd-mm-yyyy or dd/mm/yyyy — convert carefully (day first).
- notice_type: JOB for a recruitment advertisement; DEADLINE_EXTENSION when an existing deadline is extended; CORRIGENDUM for a correction; ADMIT_CARD, ANSWER_KEY, RESULT, MERIT_LIST, SELECTION_LIST, INTERVIEW, DOCUMENT_VERIFICATION, EXAM_DATE, EXAM_POSTPONED, EXAM_CANCELLED as named; APPLICATION_STARTED when the notice only announces that online applications have opened for an already-advertised recruitment; CORRECTION_WINDOW when an application correction/edit window opens; OTHER if none fits.
- organization: the issuing body's full name as written. exam_name: the examination/recruitment name as written.
- For EVERY non-null scalar field and for vacancies/dates, add an evidence entry {field, quote} where quote is a short verbatim excerpt (≤ 200 characters) copied exactly from the document that supports the value. No evidence means the field must be null.
- summary: two sentences, factual, in English.`;

export interface ClaudeExtractorInput {
  text: string;
  title?: string | null;
  sourceUrl?: string | null;
}

/** Shape of the one call we make; injectable so tests run without a key. */
export type ParseFn = (prompt: string) => Promise<{ parsed: ClaudeOutput | null; stopReason: string | null; model: string }>;

export function buildPrompt(input: ClaudeExtractorInput): string {
  const text = input.text.length > MAX_TEXT_CHARS ? input.text.slice(0, MAX_TEXT_CHARS) : input.text;
  return [
    input.title ? `Document title: ${input.title}` : null,
    input.sourceUrl ? `Source URL: ${input.sourceUrl}` : null,
    "Document text (page breaks are form-feed characters):",
    "<document>",
    text,
    "</document>",
    "Extract the structured notice.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeForSearch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Builds provenance from the model's evidence quotes, verifying each one
 * against the document. Unverified → confidence capped at 0.4. */
export function provenanceFromEvidence(output: ClaudeOutput, text: string): ProvenanceMap {
  const haystack = normalizeForSearch(text);
  const provenance: ProvenanceMap = {};
  const data = output as NoticeExtraction & { evidence: ClaudeOutput["evidence"] };
  const evidenceByField = new Map<string, string>();
  for (const e of output.evidence) if (e.quote.trim()) evidenceByField.set(e.field, e.quote);

  const fields = Object.keys(noticeExtractionSchema.shape) as Array<keyof NoticeExtraction>;
  for (const field of fields) {
    const value = data[field];
    const isEmpty = value === null || value === undefined || (Array.isArray(value) && value.length === 0);
    if (isEmpty) continue;
    const quote = evidenceByField.get(field);
    if (!quote) {
      // Structural/derived fields may legitimately lack a quote.
      if (field === "summary" || field === "source_language" || field === "important_dates" || field === "eligibility" || field === "selection_process") {
        provenance[field] = { value, confidence: 0.6, sourcePage: null, sourceText: null, extractor: "claude", verified: false };
      } else {
        provenance[field] = { value, confidence: 0.3, sourcePage: null, sourceText: null, extractor: "claude", verified: false };
      }
      continue;
    }
    const needle = normalizeForSearch(quote);
    const idx = needle.length >= 6 ? haystack.indexOf(needle) : -1;
    if (idx >= 0) {
      // Map normalized offset back approximately: count pages in the original up to a proportional offset.
      const approxOffset = Math.round((idx / Math.max(1, haystack.length)) * text.length);
      provenance[field] = { value, confidence: 0.9, sourcePage: pageOfOffset(text, approxOffset), sourceText: quote.slice(0, 240), extractor: "claude", verified: true };
    } else {
      provenance[field] = { value, confidence: 0.4, sourcePage: null, sourceText: quote.slice(0, 240), extractor: "claude", verified: false };
    }
  }
  return provenance;
}

/** Creates the real SDK-backed parse function. Lazy import keeps the SDK
 * out of every code path that never calls Claude. */
export async function createSdkParseFn(): Promise<ParseFn> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic();
  const model = process.env.AI_EXTRACTION_MODEL || DEFAULT_MODEL;
  const effort = (process.env.AI_EXTRACTION_EFFORT as "low" | "medium" | "high" | undefined) || "medium";
  return async (prompt) => {
    const response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort, format: zodOutputFormat(claudeOutputSchema) },
      messages: [{ role: "user", content: prompt }],
    });
    return { parsed: (response.parsed_output as ClaudeOutput | null) ?? null, stopReason: response.stop_reason, model: response.model };
  };
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function claudeExtract(input: ClaudeExtractorInput, parseFn?: ParseFn): Promise<ExtractedNotice | null> {
  const parse = parseFn ?? (await createSdkParseFn());
  const result = await parse(buildPrompt(input));
  if (!result.parsed || result.stopReason === "refusal") return null;
  const { evidence: _evidence, ...data } = result.parsed;
  void _evidence;
  const provenance = provenanceFromEvidence(result.parsed, input.text);
  return { data, provenance, overallConfidence: scoreOverall(data, provenance), extractors: ["claude"] };
}
