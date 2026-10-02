import { parseIndianDate } from "../parsers/html";
import {
  emptyExtraction,
  pageOfOffset,
  type ExtractedNotice,
  type FieldProvenance,
  type NoticeExtraction,
  type NoticeTypeValue,
  type ProvenanceMap,
} from "./schema";

export interface RuleInput {
  text: string;
  title?: string | null;
  sourceUrl?: string | null;
}

const toIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Ordered: the first matching rule wins, so specific types (deadline
 * extension) are tested before generic ones (job). Scores are the
 * confidence attached to the classification. */
const TYPE_RULES: Array<{ type: NoticeTypeValue; re: RegExp; confidence: number }> = [
  { type: "DEADLINE_EXTENSION", re: /\b(extension|extended|extend)\b[^.\n]{0,60}\b(last date|closing date|date of (?:submission|application)|deadline)|\b(last date|closing date)[^.\n]{0,60}\b(extended|extension)/i, confidence: 0.9 },
  { type: "EXAM_CANCELLED", re: /\b(examination|exam|recruitment|notification)\b[^.\n]{0,40}\b(cancelled|canceled|withdrawn|scrapped)\b|\bcancellation of\b/i, confidence: 0.9 },
  { type: "EXAM_POSTPONED", re: /\b(postponed|postponement|rescheduled|deferred)\b/i, confidence: 0.9 },
  { type: "CORRIGENDUM", re: /\b(corrigendum|addendum|erratum|amendment)\b/i, confidence: 0.85 },
  { type: "DOCUMENT_VERIFICATION", re: /\bdocument\s+verification\b|\bDV\s+(schedule|list)\b/i, confidence: 0.85 },
  { type: "INTERVIEW", re: /\b(interview|viva[-\s]?voce|personality test)\b[^.\n]{0,40}\b(schedule|call|list|date|letter)\b|\bcall letter for interview\b/i, confidence: 0.8 },
  { type: "ANSWER_KEY", re: /\banswer\s*keys?\b/i, confidence: 0.9 },
  { type: "ADMIT_CARD", re: /\b(admit\s*card|hall\s*ticket|e-?admit|call\s*letter)\b/i, confidence: 0.9 },
  { type: "SELECTION_LIST", re: /\b(final\s+selection|select(?:ed|ion)\s+list|list of (?:finally\s+)?selected candidates)\b/i, confidence: 0.85 },
  { type: "MERIT_LIST", re: /\bmerit\s+list\b/i, confidence: 0.85 },
  { type: "RESULT", re: /\b(results?|score\s*card|marks\s+(?:sheet|statement)|cut[-\s]?off)\b/i, confidence: 0.8 },
  { type: "EXAM_DATE", re: /\b(exam(?:ination)?\s+(?:date|schedule|calendar|time[-\s]?table)|date of (?:the )?exam(?:ination)?)\b/i, confidence: 0.75 },
  { type: "JOB", re: /\b(recruitment|vacanc(?:y|ies)|advertisement|advt\.?|applications? (?:are|is) invited|apply online|online applications?)\b/i, confidence: 0.85 },
];

function classify(title: string, text: string): { type: NoticeTypeValue; confidence: number; sourceText: string } {
  const head = `${title}\n${text.slice(0, 1500)}`;
  for (const rule of TYPE_RULES) {
    const m = rule.re.exec(title);
    if (m) return { type: rule.type, confidence: rule.confidence, sourceText: title };
  }
  for (const rule of TYPE_RULES) {
    const m = rule.re.exec(head);
    if (m) return { type: rule.type, confidence: Math.max(0.5, rule.confidence - 0.2), sourceText: lineAt(head, m.index) };
  }
  return { type: "OTHER", confidence: 0.3, sourceText: title };
}

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const endNl = text.indexOf("\n", index);
  const end = endNl === -1 ? text.length : endNl;
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 240);
}

/** Finds a labelled date: `label … <date>` within the same line/sentence. */
function labelledDate(text: string, label: RegExp): { date: string; index: number; line: string } | null {
  const re = new RegExp("(?:" + label.source + ")" + String.raw`[^\n]{0,80}?((?:\d{1,2}[-/.\s](?:[A-Za-z]{3,9}|\d{1,2})[-/.\s]\d{4})|(?:\d{4}-\d{2}-\d{2}))`, "i");
  const m = re.exec(text);
  if (!m) return null;
  const parsed = parseIndianDate(m[1]);
  if (!parsed) return null;
  return { date: toIso(parsed)!, index: m.index, line: lineAt(text, m.index) };
}

function prov(text: string, value: unknown, confidence: number, index: number | null, line: string | null): FieldProvenance {
  return {
    value,
    confidence,
    sourcePage: index === null ? null : pageOfOffset(text, index),
    sourceText: line,
    extractor: "rules",
    verified: true,
  };
}

/**
 * Deterministic extraction: regex/keyword rules over the document text.
 * Always runs (no API key needed) and never invents a value — anything
 * not matched stays null. Confidence reflects how explicit the match was.
 */
export function ruleExtract(input: RuleInput): ExtractedNotice {
  const text = input.text ?? "";
  const title = (input.title ?? "").trim();
  const data: NoticeExtraction = emptyExtraction();
  const provenance: ProvenanceMap = {};

  // --- notice type -----------------------------------------------------
  const cls = classify(title, text);
  data.notice_type = cls.type;
  provenance.notice_type = prov(text, cls.type, cls.confidence, null, cls.sourceText);

  // --- organization / exam / department (header lines) ----------------
  const headLines = text.split(/\r?\n|\f/).map((l) => l.trim()).filter(Boolean).slice(0, 15);
  const orgLine = headLines.find((l) =>
    /\b(commission|board|university|department|directorate|corporation|council|authority|bank|police|railway|institute|limited|ltd\.?|ministry|court|municipal|nigam|ayog|parishad)\b/i.test(l) && l.length < 160,
  );
  if (orgLine) {
    data.organization = orgLine.replace(/\s+/g, " ");
    provenance.organization = prov(text, data.organization, /^[A-Z0-9 .,&()'-]+$/.test(orgLine) ? 0.85 : 0.7, text.indexOf(orgLine), orgLine);
  }
  const examLine = [title, ...headLines].find((l) => /\b(examination|exam|recruitment of|recruitment for|combined|common|entrance)\b/i.test(l) && l.length < 200);
  if (examLine) {
    data.exam_name = examLine.replace(/\s+/g, " ").replace(/\s*[-–—]\s*(notification|notice|advertisement|advt\.?)\s*$/i, "").trim();
    provenance.exam_name = prov(text, data.exam_name, examLine === title ? 0.75 : 0.65, examLine === title ? null : text.indexOf(examLine), examLine);
  }
  const deptMatch = /\b(?:department|directorate|ministry)\s+of\s+([A-Z][A-Za-z&, ]{3,80})/i.exec(text);
  if (deptMatch) {
    data.department = deptMatch[0].replace(/\s+/g, " ").trim();
    provenance.department = prov(text, data.department, 0.7, deptMatch.index, lineAt(text, deptMatch.index));
  }

  // --- advertisement number -------------------------------------------
  const advt = /\b(?:advertisement|advt\.?|notification|notice)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\/\-.()]{1,40})/i.exec(text);
  if (advt) {
    data.advertisement_number = advt[1].replace(/[.,;]+$/, "");
    provenance.advertisement_number = prov(text, data.advertisement_number, 0.85, advt.index, lineAt(text, advt.index));
  }

  // --- vacancies --------------------------------------------------------
  const vac =
    /\b(?:total\s+(?:number\s+of\s+)?(?:vacanc(?:y|ies)|posts?)|(?:number|no\.?)\s+of\s+(?:vacanc(?:y|ies)|posts?)|vacanc(?:y|ies))\s*[:\-]?\s*(\d{1,3}(?:,\d{3})+|\d+)\b/i.exec(text) ??
    /\b(\d{1,3}(?:,\d{3})+|\d{2,6})\s+(?:vacanc(?:y|ies)|posts?)\b/i.exec(text);
  if (vac) {
    const n = Number(vac[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0 && n < 10_000_000) {
      data.vacancies = n;
      provenance.vacancies = prov(text, n, /total/i.test(vac[0]) ? 0.9 : 0.75, vac.index, lineAt(text, vac.index));
    }
  }

  // --- dates ------------------------------------------------------------
  const dateRules: Array<{ key: keyof NoticeExtraction; label: RegExp; confidence: number }> = [
    { key: "application_end_date", label: /\b(?:last|closing|end(?:ing)?)\s+date\b[^\n]{0,40}?(?:for|of)?[^\n]{0,30}?(?:application|submission|registration|apply|receipt|online)?|\bapplication[s]?\s+(?:close|closes|closing|end|ends)\b|\bdeadline\b/i, confidence: 0.9 },
    { key: "application_start_date", label: /\b(?:start(?:ing)?|opening|commencement|commencing)\s+(?:date|of)\b[^\n]{0,40}?(?:application|registration|online)?|\bapplication[s]?\s+(?:start|starts|begin|begins|open|opens)\b|\bonline\s+application\s+(?:from|starts)\b/i, confidence: 0.85 },
    { key: "exam_date", label: /\b(?:date\s+of\s+(?:the\s+)?(?:written\s+)?exam(?:ination)?|exam(?:ination)?\s+(?:date|is scheduled|will be held|to be held)|exam(?:ination)?\s+on)\b/i, confidence: 0.85 },
    { key: "admit_card_date", label: /\b(?:admit\s*cards?|hall\s*tickets?|call\s*letters?)\b[^\n]{0,40}?(?:available|download|issued|released|from)\b/i, confidence: 0.8 },
    { key: "result_date", label: /\b(?:results?)\b[^\n]{0,30}?(?:declared|published|announced|on)\b/i, confidence: 0.8 },
  ];
  for (const rule of dateRules) {
    let found = rule.key === "application_end_date" && data.notice_type === "DEADLINE_EXTENSION"
      ? labelledDate(text, /\b(?:extended|extension|extend)\b[^\n]{0,100}?\b(?:up\s*to|upto|to|till|until)\b/i)
      : null;
    found ??= labelledDate(text, rule.label);
    if (found) {
      (data as Record<string, unknown>)[rule.key] = found.date;
      provenance[rule.key] = prov(text, found.date, rule.confidence, found.index, found.line);
    }
  }
  if (data.notice_type === "DEADLINE_EXTENSION" && data.application_end_date) {
    provenance.application_end_date!.confidence = Math.min(0.95, provenance.application_end_date!.confidence + 0.05);
  }

  // --- fee, age, salary ------------------------------------------------
  const fee = /\b(?:(?:application|examination|exam|registration)\s+fees?|fees?\s+payable|fees?\s*:)[^\n]{0,60}?(?:rs\.?|₹|inr|rupees)\s*([\d,]+(?:\.\d+)?)(?:\s*\/-)?/i.exec(text);
  if (fee) {
    data.application_fee = `Rs. ${fee[1].replace(/,/g, "")}`;
    provenance.application_fee = prov(text, data.application_fee, 0.8, fee.index, lineAt(text, fee.index));
  }
  const ageRange = /\b(?:age(?:\s+limit)?)\b[^\n]{0,40}?(\d{2})\s*(?:to|-|–|and)\s*(\d{2})\s*(?:years|yrs)/i.exec(text) ?? /\b(\d{2})\s*(?:to|-|–)\s*(\d{2})\s*(?:years|yrs)\b[^\n]{0,30}?\bage\b/i.exec(text);
  if (ageRange) {
    const min = Number(ageRange[1]);
    const max = Number(ageRange[2]);
    if (min >= 14 && max <= 70 && min < max) {
      data.eligibility.minimum_age = min;
      data.eligibility.maximum_age = max;
      provenance.eligibility = prov(text, { minimum_age: min, maximum_age: max }, 0.85, ageRange.index, lineAt(text, ageRange.index));
    }
  } else {
    const minAge = /\bminimum\s+age\b[^\n]{0,20}?(\d{2})/i.exec(text);
    const maxAge = /\bmaximum\s+age\b[^\n]{0,20}?(\d{2})/i.exec(text);
    if (minAge) data.eligibility.minimum_age = Number(minAge[1]);
    if (maxAge) data.eligibility.maximum_age = Number(maxAge[1]);
    if (minAge || maxAge) {
      const idx = (minAge ?? maxAge)!.index;
      provenance.eligibility = prov(text, { minimum_age: data.eligibility.minimum_age, maximum_age: data.eligibility.maximum_age }, 0.75, idx, lineAt(text, idx));
    }
  }
  const salary = /\b(?:pay\s+(?:scale|level|band|matrix)|salary|remuneration|emoluments?)\b[^\n]{0,20}?[:\-]?\s*((?:rs\.?|₹|inr|level)[^\n]{3,80})/i.exec(text);
  if (salary) {
    data.salary = salary[1].replace(/\s+/g, " ").trim().slice(0, 120);
    provenance.salary = prov(text, data.salary, 0.65, salary.index, lineAt(text, salary.index));
  }

  // --- education ---------------------------------------------------------
  const edu = text.match(/\b(10th|matric(?:ulation)?|12th|intermediate|10\+2|graduat(?:e|ion)|bachelor'?s?(?: degree)?|master'?s?(?: degree)?|post[-\s]?graduat(?:e|ion)|diploma|b\.?tech|b\.?e\.?|m\.?tech|mbbs|llb|b\.?ed|iti)\b/gi);
  if (edu) {
    const uniq = [...new Set(edu.map((e) => e.replace(/\s+/g, " ")))].slice(0, 6);
    data.eligibility.education = uniq;
  }

  // --- selection process -------------------------------------------------
  const stages: string[] = [];
  for (const [re, label] of [
    [/\bphysical\s+(?:efficiency|standard|measurement)\s+test\b|\bPET\b|\bPST\b|\bPMT\b/i, "Physical test"],
    [/\bwritten\s+(?:exam|test)|\btier[-\s]?[i1v]+\b|\bprelim(?:inary)?\b|\bmains?\b|\bcomputer\s+based\s+test\b|\bCBT\b/i, "Written examination"],
    [/\btyping\s+test\b|\bskill\s+test\b|\bdata\s+entry\b/i, "Skill/typing test"],
    [/\binterview\b|\bpersonality\s+test\b|\bviva\b/i, "Interview"],
    [/\bmedical\s+(?:exam|test|examination)\b/i, "Medical examination"],
    [/\bdocument\s+verification\b/i, "Document verification"],
  ] as Array<[RegExp, string]>) {
    if (re.test(text)) stages.push(label);
  }
  data.selection_process = stages;

  // --- URLs -------------------------------------------------------------
  const urls = [...new Set((text.match(/https?:\/\/[^\s)>\]]+/gi) ?? []).map((u) => u.replace(/[.,;]+$/, "")))];
  const apply = urls.find((u) => /apply|online|registration|register|candidate|login/i.test(u));
  if (apply) {
    data.official_apply_url = apply;
    provenance.official_apply_url = prov(text, apply, 0.7, text.indexOf(apply), apply);
  }
  const official = urls.find((u) => u !== apply) ?? null;
  if (official || input.sourceUrl) {
    data.official_notification_url = official ?? input.sourceUrl ?? null;
    provenance.official_notification_url = prov(text, data.official_notification_url, official ? 0.7 : 0.6, official ? text.indexOf(official) : null, official);
  }

  // --- language / summary ----------------------------------------------
  const devanagari = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  data.source_language = text.length === 0 ? null : devanagari > text.length * 0.2 ? "hi" : devanagari > 0 ? "hi+en" : "en";
  const firstSentence = text.replace(/\s+/g, " ").trim().slice(0, 260);
  data.summary = title ? `${title}${firstSentence ? ` — ${firstSentence}` : ""}`.slice(0, 400) : firstSentence || null;

  // --- important dates (all labelled dates we found) --------------------
  for (const key of ["application_start_date", "application_end_date", "exam_date", "admit_card_date", "result_date"] as const) {
    const v = data[key];
    if (v) data.important_dates.push({ label: key.replace(/_/g, " "), date: v });
  }

  return {
    data,
    provenance,
    overallConfidence: scoreOverall(data, provenance),
    extractors: ["rules"],
  };
}

/** Weighted average over the fields that matter for publishing. Missing
 * key fields pull the score down rather than being ignored. */
export function scoreOverall(data: NoticeExtraction, provenance: ProvenanceMap): number {
  const weights: Array<[keyof ProvenanceMap, number]> = [
    ["notice_type", 3],
    ["organization", 3],
    ["exam_name", 2],
    ["application_end_date", 2],
    ["vacancies", 1],
    ["exam_date", 1],
  ];
  let total = 0;
  let sum = 0;
  for (const [key, w] of weights) {
    const p = provenance[key];
    const relevant =
      key === "vacancies" || key === "application_end_date" ? data.notice_type === "JOB" || data.notice_type === "DEADLINE_EXTENSION" : key === "exam_date" ? ["ADMIT_CARD", "EXAM_DATE", "EXAM_POSTPONED"].includes(data.notice_type) : true;
    if (!relevant) continue;
    total += w;
    sum += (p?.confidence ?? 0) * w;
  }
  return total === 0 ? 0 : Math.round((sum / total) * 100) / 100;
}
