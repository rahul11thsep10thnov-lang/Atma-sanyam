import type { NoticeType } from "@/generated/prisma/enums";

/**
 * The public website's sections. One notice can belong to several — an
 * "SSC CGL 2027 notification with exam calendar" is both a Latest Job and
 * an Exam Calendar item — so sections are a tag list on the notice, never
 * extra copies of it.
 */
export const SECTIONS = [
  "LATEST_JOBS",
  "RESULTS",
  "ADMIT_CARDS",
  "ANSWER_KEYS",
  "APPLICATION_STATUS",
  "EXAM_DATES",
  "EXAM_CALENDAR",
  "SYLLABUS",
  "ADMISSIONS",
  "SCHOLARSHIPS",
  "CORRECTION_WINDOWS",
  "MERIT_LISTS",
  "CUT_OFF_MARKS",
  "INTERVIEW_NOTICES",
  "COUNSELLING",
  "OTHER_NOTICES",
] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<Section, string> = {
  LATEST_JOBS: "Latest Jobs",
  RESULTS: "Results",
  ADMIT_CARDS: "Admit Cards",
  ANSWER_KEYS: "Answer Keys",
  APPLICATION_STATUS: "Application Status",
  EXAM_DATES: "Exam Dates",
  EXAM_CALENDAR: "Exam Calendar",
  SYLLABUS: "Syllabus",
  ADMISSIONS: "Admissions",
  SCHOLARSHIPS: "Scholarships",
  CORRECTION_WINDOWS: "Correction Windows",
  MERIT_LISTS: "Merit Lists",
  CUT_OFF_MARKS: "Cut-off Marks",
  INTERVIEW_NOTICES: "Interview Notices",
  COUNSELLING: "Counselling",
  OTHER_NOTICES: "Other Notices",
};

const BY_TYPE: Partial<Record<NoticeType, Section[]>> = {
  JOB: ["LATEST_JOBS"],
  APPLICATION_STARTED: ["LATEST_JOBS"],
  DEADLINE_EXTENSION: ["LATEST_JOBS"],
  CORRIGENDUM: ["LATEST_JOBS"],
  ADMIT_CARD: ["ADMIT_CARDS"],
  ANSWER_KEY: ["ANSWER_KEYS"],
  RESULT: ["RESULTS"],
  MERIT_LIST: ["MERIT_LISTS", "RESULTS"],
  SELECTION_LIST: ["MERIT_LISTS", "RESULTS"],
  INTERVIEW: ["INTERVIEW_NOTICES"],
  DOCUMENT_VERIFICATION: ["INTERVIEW_NOTICES"],
  EXAM_DATE: ["EXAM_DATES"],
  EXAM_POSTPONED: ["EXAM_DATES"],
  EXAM_CANCELLED: ["EXAM_DATES"],
  CORRECTION_WINDOW: ["CORRECTION_WINDOWS"],
};

/** Keyword signals checked against title (always) and the opening of the
 * text. Ordered only for readability; every match adds its section. */
const SIGNALS: Array<[Section, RegExp]> = [
  ["RESULTS", /\b(results?\s+(declared|announced|out|published)|declaration of result|score\s*card|marks\s+(sheet|statement))\b/i],
  ["ADMIT_CARDS", /\b(admit\s*card|hall\s*ticket|e-?admit|call\s*letter)\b/i],
  ["ANSWER_KEYS", /\b(answer\s*keys?|response\s*sheet)\b/i],
  ["APPLICATION_STATUS", /\b(application\s+status|status\s+of\s+(the\s+)?application|accepted\s*\/\s*rejected|list of (rejected|accepted) applications?)\b/i],
  ["EXAM_DATES", /\b(exam(ination)?\s+(date|schedule|time[-\s]?table)|date of (the )?exam(ination)?|exam\s+city)\b/i],
  ["EXAM_CALENDAR", /\b(exam(ination)?\s+calendar|annual\s+calendar|tentative\s+calendar|calendar of (exams|examinations))\b/i],
  ["SYLLABUS", /\b(syllabus|scheme of (the )?exam(ination)?|exam(ination)?\s+pattern)\b/i],
  ["ADMISSIONS", /\b(admissions?|entrance\s+(test|exam)|prospectus|seat\s+allotment)\b/i],
  ["SCHOLARSHIPS", /\b(scholarships?|fellowships?|stipend\s+scheme)\b/i],
  ["CORRECTION_WINDOWS", /\b(correction|edit|modification)\s+(window|facility)\b|\bcorrection in (the )?(online )?application/i],
  ["MERIT_LISTS", /\b(merit\s+list|select(ed|ion)\s+list|final\s+selection)\b/i],
  ["CUT_OFF_MARKS", /\bcut[-\s]?off\b/i],
  ["INTERVIEW_NOTICES", /\b(interview|viva[-\s]?voce|personality\s+test|document\s+verification|skill\s+test|physical\s+(efficiency|standard)\s+test|PET|PST)\b/],
  ["COUNSELLING", /\b(counsell?ing|choice\s+filling)\b/i],
  ["LATEST_JOBS", /\b(recruitment|vacanc(y|ies)|apply\s+online|applications?\s+(are|is)\s+invited|advertisement\s+no)\b/i],
];

/**
 * Sections for one notice: the type's own sections, plus every keyword
 * signal in the title (and, more conservatively, in the first part of the
 * text). Scholarship and admission notices never land in Latest Jobs by
 * keyword alone — they're stored separately from vacancies.
 */
export function classifySections(input: { noticeType: NoticeType; title?: string | null; text?: string | null }): Section[] {
  const out = new Set<Section>(BY_TYPE[input.noticeType] ?? []);
  const title = input.title ?? "";
  const head = (input.text ?? "").slice(0, 1200);
  for (const [section, re] of SIGNALS) {
    if (re.test(title)) out.add(section);
  }
  // From the body only the less ambiguous signals count.
  for (const [section, re] of SIGNALS) {
    if (["EXAM_CALENDAR", "CUT_OFF_MARKS", "CORRECTION_WINDOWS", "COUNSELLING", "APPLICATION_STATUS", "SYLLABUS"].includes(section) && re.test(head)) out.add(section);
  }
  if ((out.has("SCHOLARSHIPS") || out.has("ADMISSIONS")) && input.noticeType !== "JOB" && !/\b(recruitment|vacanc)/i.test(title)) {
    out.delete("LATEST_JOBS");
  }
  if (out.size === 0) out.add("OTHER_NOTICES");
  else out.delete("OTHER_NOTICES");
  return SECTIONS.filter((s) => out.has(s));
}

/** Lifecycle step shown in a recruitment's history timeline. */
export function lifecycleLabel(noticeType: NoticeType): string {
  const labels: Partial<Record<NoticeType, string>> = {
    JOB: "New notification",
    APPLICATION_STARTED: "Application started",
    DEADLINE_EXTENSION: "Last date extended",
    CORRECTION_WINDOW: "Correction window opened",
    CORRIGENDUM: "Corrigendum issued",
    ADMIT_CARD: "Admit card released",
    EXAM_DATE: "Exam date announced",
    EXAM_POSTPONED: "Exam date changed",
    EXAM_CANCELLED: "Exam cancelled",
    ANSWER_KEY: "Answer key released",
    RESULT: "Result declared",
    MERIT_LIST: "Merit list published",
    SELECTION_LIST: "Final selection list published",
    INTERVIEW: "Interview schedule",
    DOCUMENT_VERIFICATION: "Document verification",
  };
  return labels[noticeType] ?? "Update";
}
