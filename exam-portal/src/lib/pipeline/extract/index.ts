import { ruleExtract, scoreOverall, type RuleInput } from "./rules";
import { claudeExtract, isClaudeConfigured, type ParseFn } from "./claude";
import type { ExtractedNotice, NoticeExtraction, ProvenanceMap } from "./schema";

export * from "./schema";
export { ruleExtract } from "./rules";
export { claudeExtract, isClaudeConfigured, buildPrompt, provenanceFromEvidence } from "./claude";

/** Confidence thresholds (spec §16), overridable per deployment. */
export const THRESHOLDS = {
  autoPublish: Number(process.env.AUTO_PUBLISH_MIN_CONFIDENCE ?? 0.95),
  review: Number(process.env.REVIEW_MIN_CONFIDENCE ?? 0.8),
  /** Below this, the rule extractor alone isn't trusted and Claude is
   * consulted (when configured). */
  claudeTrigger: Number(process.env.CLAUDE_TRIGGER_CONFIDENCE ?? 0.9),
};

export interface ExtractOptions {
  /** Force/skip the Claude stage regardless of rule confidence. */
  useClaude?: boolean;
  parseFn?: ParseFn;
}

/**
 * Staged extraction (spec §36): rules always; Claude only when configured
 * and the rules are not confident. Field-by-field merge: a verified Claude
 * value beats a rule value; a rule value beats an unverified Claude value;
 * an unverified Claude value is kept only when nothing else exists and is
 * flagged so it can never satisfy the auto-publish threshold.
 */
export async function extractNotice(input: RuleInput, options: ExtractOptions = {}): Promise<ExtractedNotice> {
  const rules = ruleExtract(input);
  const wantClaude = options.useClaude ?? (isClaudeConfigured() && rules.overallConfidence < THRESHOLDS.claudeTrigger);
  if (!wantClaude) return rules;

  let claude: ExtractedNotice | null = null;
  try {
    claude = await claudeExtract(input, options.parseFn);
  } catch (err) {
    // Claude being unavailable degrades to rules-only; never blocks ingest.
    console.error("Claude extraction failed, using rules only:", err instanceof Error ? err.message : err);
  }
  if (!claude) return rules;
  return mergeExtractions(rules, claude);
}

export function mergeExtractions(rules: ExtractedNotice, claude: ExtractedNotice): ExtractedNotice {
  const data = { ...rules.data } as NoticeExtraction;
  const provenance: ProvenanceMap = { ...rules.provenance };
  const fields = Object.keys(claude.data) as Array<keyof NoticeExtraction>;

  for (const field of fields) {
    const cp = claude.provenance[field];
    const rp = rules.provenance[field];
    const cv = claude.data[field];
    const cEmpty = cv === null || cv === undefined || (Array.isArray(cv) && cv.length === 0);
    if (cEmpty) continue;
    if (cp?.verified) {
      (data as Record<string, unknown>)[field] = cv;
      provenance[field] = rp && rp.value === cv ? { ...cp, confidence: Math.min(0.98, cp.confidence + 0.05) } : cp;
    } else if (!rp) {
      (data as Record<string, unknown>)[field] = cv;
      provenance[field] = cp ?? { value: cv, confidence: 0.3, sourcePage: null, sourceText: null, extractor: "claude", verified: false };
    }
    // else: keep the rule value (verified by construction).
  }
  // Lists without provenance (education, selection_process) — union.
  data.eligibility = {
    ...data.eligibility,
    education: [...new Set([...rules.data.eligibility.education, ...claude.data.eligibility.education])],
  };
  data.selection_process = claude.data.selection_process.length ? claude.data.selection_process : rules.data.selection_process;
  data.important_dates = claude.data.important_dates.length ? claude.data.important_dates : rules.data.important_dates;

  return { data, provenance, overallConfidence: scoreOverall(data, provenance), extractors: ["rules", "claude"] };
}

/** Cheap structural checks that run after extraction (spec "VALIDATION"). */
export function validateExtraction(data: NoticeExtraction, sourcePublishedAt?: Date | null): string[] {
  const errors: string[] = [];
  const d = (s: string | null) => (s ? new Date(s + "T00:00:00Z") : null);
  const start = d(data.application_start_date);
  const end = d(data.application_end_date);
  const exam = d(data.exam_date);
  if (start && end && start > end) errors.push("Application start date is after the end date.");
  if (end && exam && exam < end) errors.push("Exam date is before the application end date.");
  if (data.vacancies !== null && data.vacancies <= 0) errors.push("Vacancy count must be positive.");
  const { minimum_age, maximum_age } = data.eligibility;
  if (minimum_age !== null && maximum_age !== null && minimum_age > maximum_age) errors.push("Minimum age exceeds maximum age.");
  if (sourcePublishedAt && end && end.getTime() < sourcePublishedAt.getTime() - 365 * 24 * 3600 * 1000) {
    errors.push("Application end date is more than a year before the notice was published — likely a misread date.");
  }
  if (data.notice_type === "OTHER") errors.push("Notice type could not be determined.");
  if (!data.organization) errors.push("Organization not found in the document.");
  return errors;
}

/** Status the pipeline assigns from confidence + validation + source
 * authority (official domain = 1.0, other = 0.85). */
export function decideStatus(input: {
  overallConfidence: number;
  validationErrors: string[];
  sourceAuthority: number;
  hasUnverifiedFields: boolean;
  /** A new organization/exam/recruitment was created for this notice —
   * a human confirms the new entity before anything auto-publishes. */
  entitiesCreated?: boolean;
}): "AUTO_APPROVED" | "NEEDS_REVIEW" | "NEW" {
  const score = input.overallConfidence * input.sourceAuthority;
  if (input.validationErrors.length === 0 && !input.hasUnverifiedFields && !input.entitiesCreated && score >= THRESHOLDS.autoPublish) return "AUTO_APPROVED";
  if (score >= THRESHOLDS.review) return "NEEDS_REVIEW";
  return "NEW";
}
