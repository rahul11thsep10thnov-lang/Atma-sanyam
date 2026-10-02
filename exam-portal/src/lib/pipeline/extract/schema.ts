import { z } from "zod";

export const NOTICE_TYPES = [
  "JOB",
  "ADMIT_CARD",
  "EXAM_DATE",
  "ANSWER_KEY",
  "RESULT",
  "MERIT_LIST",
  "SELECTION_LIST",
  "INTERVIEW",
  "DOCUMENT_VERIFICATION",
  "CORRIGENDUM",
  "DEADLINE_EXTENSION",
  "EXAM_POSTPONED",
  "EXAM_CANCELLED",
  "OTHER",
] as const;
export type NoticeTypeValue = (typeof NOTICE_TYPES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

/**
 * The structured shape every extractor (rules, Claude) produces. Absent
 * information is `null` / `[]` — never guessed. Dates are ISO yyyy-mm-dd.
 */
export const noticeExtractionSchema = z.object({
  notice_type: z.enum(NOTICE_TYPES),
  organization: z.string().nullable(),
  exam_name: z.string().nullable(),
  post_names: z.array(z.string()),
  department: z.string().nullable(),
  advertisement_number: z.string().nullable(),
  vacancies: z.number().int().nullable(),
  application_start_date: isoDate,
  application_end_date: isoDate,
  exam_date: isoDate,
  admit_card_date: isoDate,
  result_date: isoDate,
  eligibility: z.object({
    minimum_age: z.number().int().nullable(),
    maximum_age: z.number().int().nullable(),
    education: z.array(z.string()),
    experience: z.string().nullable(),
    nationality: z.string().nullable(),
  }),
  salary: z.string().nullable(),
  application_fee: z.string().nullable(),
  selection_process: z.array(z.string()),
  official_notification_url: z.string().nullable(),
  official_apply_url: z.string().nullable(),
  important_dates: z.array(z.object({ label: z.string(), date: isoDate })),
  reservation_information: z.string().nullable(),
  physical_requirements: z.string().nullable(),
  source_language: z.string().nullable(),
  summary: z.string().nullable(),
});

export type NoticeExtraction = z.infer<typeof noticeExtractionSchema>;

/** Where a value came from, so every field can be audited. */
export interface FieldProvenance {
  value: unknown;
  confidence: number; // 0..1
  sourcePage: number | null;
  sourceText: string | null;
  extractor: "rules" | "claude";
  verified: boolean; // evidence quote found verbatim in the document
}

export type ProvenanceMap = Partial<Record<keyof NoticeExtraction | "title", FieldProvenance>>;

export interface ExtractedNotice {
  data: NoticeExtraction;
  provenance: ProvenanceMap;
  overallConfidence: number;
  extractors: Array<"rules" | "claude">;
}

export function emptyExtraction(): NoticeExtraction {
  return {
    notice_type: "OTHER",
    organization: null,
    exam_name: null,
    post_names: [],
    department: null,
    advertisement_number: null,
    vacancies: null,
    application_start_date: null,
    application_end_date: null,
    exam_date: null,
    admit_card_date: null,
    result_date: null,
    eligibility: { minimum_age: null, maximum_age: null, education: [], experience: null, nationality: null },
    salary: null,
    application_fee: null,
    selection_process: [],
    official_notification_url: null,
    official_apply_url: null,
    important_dates: [],
    reservation_information: null,
    physical_requirements: null,
    source_language: null,
    summary: null,
  };
}

/** 1-based page a character offset falls on, given form-feed page breaks. */
export function pageOfOffset(text: string, offset: number): number {
  let page = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) if (text[i] === "\f") page += 1;
  return page;
}
