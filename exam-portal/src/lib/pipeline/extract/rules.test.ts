import { describe, it, expect } from "vitest";
import { ruleExtract } from "./rules";
import { validateExtraction, decideStatus, mergeExtractions, THRESHOLDS } from "./index";
import { provenanceFromEvidence, type ClaudeOutput } from "./claude";
import { emptyExtraction } from "./schema";
import { UPPRPB_CONSTABLE_ADVT, SSC_CGL_NOTICE, ADMIT_CARD_NOTICE, DEADLINE_EXTENSION_NOTICE, RESULT_NOTICE } from "./__fixtures__/notices";

describe("ruleExtract — job advertisement", () => {
  const r = ruleExtract({ text: UPPRPB_CONSTABLE_ADVT, title: "Recruitment of Constable (Civil Police) 2027 — Advertisement", sourceUrl: "https://uppbpb.gov.in/files/advt.pdf" });

  it("classifies and reads the core facts without inventing anything", () => {
    expect(r.data.notice_type).toBe("JOB");
    expect(r.data.organization).toBe("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD");
    expect(r.data.advertisement_number).toBe("PRPB-01/2027");
    expect(r.data.vacancies).toBe(60244);
    expect(r.data.application_start_date).toBe("2026-12-27");
    expect(r.data.application_end_date).toBe("2027-01-16");
    expect(r.data.application_fee).toBe("Rs. 400");
    expect(r.data.eligibility.minimum_age).toBe(18);
    expect(r.data.eligibility.maximum_age).toBe(22);
    expect(r.data.eligibility.education.map((e) => e.toLowerCase())).toContain("10+2");
    expect(r.data.official_apply_url).toBe("https://uppbpb.gov.in/apply");
    expect(r.data.exam_date).toBeNull(); // not stated → null, not guessed
    expect(r.data.result_date).toBeNull();
    expect(r.data.source_language).toBe("en");
  });

  it("captures the selection stages in order", () => {
    expect(r.data.selection_process).toEqual([
      "Physical test",
      "Written examination",
      "Medical examination",
      "Document verification",
    ]);
  });

  it("records provenance (source line + page) for every extracted field", () => {
    expect(r.provenance.vacancies?.sourceText).toContain("60244");
    expect(r.provenance.vacancies?.sourcePage).toBe(1);
    expect(r.provenance.application_end_date?.sourceText).toContain("16-01-2027");
    expect(r.provenance.application_fee?.extractor).toBe("rules");
    expect(r.overallConfidence).toBeGreaterThan(0.8);
  });
});

describe("ruleExtract — other notice types", () => {
  it("SSC CGL notice: date range, tentative vacancies, fee", () => {
    const r = ruleExtract({ text: SSC_CGL_NOTICE, title: "Combined Graduate Level Examination, 2027 — Notice" });
    expect(r.data.notice_type).toBe("JOB");
    expect(r.data.organization).toBe("STAFF SELECTION COMMISSION");
    expect(r.data.exam_name).toContain("Combined Graduate Level Examination, 2027");
    expect(r.data.vacancies).toBe(14582);
    expect(r.data.application_fee).toBe("Rs. 100");
    expect(r.data.eligibility.minimum_age).toBe(18);
    expect(r.data.eligibility.maximum_age).toBe(32);
    expect(r.data.department).toContain("Department of Personnel");
  });

  it("admit card: type, availability date, exam date", () => {
    const r = ruleExtract({ text: ADMIT_CARD_NOTICE, title: "Admit Card — Constable (Civil Police) 2027 Written Exam" });
    expect(r.data.notice_type).toBe("ADMIT_CARD");
    expect(r.data.admit_card_date).toBe("2027-02-10");
    expect(r.data.exam_date).toBe("2027-02-17");
    expect(r.data.vacancies).toBeNull();
  });

  it("deadline extension beats the generic JOB classification and reads the new date", () => {
    const r = ruleExtract({ text: DEADLINE_EXTENSION_NOTICE, title: "Corrigendum: Extension of last date — Constable 2027" });
    expect(r.data.notice_type).toBe("DEADLINE_EXTENSION");
    expect(r.data.application_end_date).toBe("2027-01-26"); // the NEW date, not the old one
    expect(r.data.advertisement_number).toBe("PRPB-01/2027");
  });

  it("result notice", () => {
    const r = ruleExtract({ text: RESULT_NOTICE, title: "Result of CBT-1 NTPC CEN 05/2027" });
    expect(r.data.notice_type).toBe("RESULT");
    expect(r.data.result_date).toBe("2027-03-03");
    expect(r.data.organization).toBe("RAILWAY RECRUITMENT BOARD");
  });

  it("an unrelated document yields OTHER with low confidence and nulls", () => {
    const r = ruleExtract({ text: "Holiday list for the calendar year 2027. Office will remain closed on the following days.", title: "Holiday list 2027" });
    expect(r.data.notice_type).toBe("OTHER");
    expect(r.data.vacancies).toBeNull();
    expect(r.overallConfidence).toBeLessThan(THRESHOLDS.review);
  });
});

describe("validateExtraction / decideStatus", () => {
  it("flags impossible dates and ages", () => {
    const data = { ...emptyExtraction(), notice_type: "JOB" as const, organization: "X", application_start_date: "2027-02-01", application_end_date: "2027-01-01", vacancies: 0 };
    data.eligibility = { ...data.eligibility, minimum_age: 30, maximum_age: 20 };
    const errors = validateExtraction(data);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/start date is after/),
      expect.stringMatching(/Vacancy count/),
      expect.stringMatching(/Minimum age exceeds/),
    ]));
  });

  it("auto-approves only when confident, validated, verified and official", () => {
    expect(decideStatus({ overallConfidence: 0.97, validationErrors: [], sourceAuthority: 1, hasUnverifiedFields: false })).toBe("AUTO_APPROVED");
    expect(decideStatus({ overallConfidence: 0.97, validationErrors: [], sourceAuthority: 0.85, hasUnverifiedFields: false })).toBe("NEEDS_REVIEW");
    expect(decideStatus({ overallConfidence: 0.97, validationErrors: ["x"], sourceAuthority: 1, hasUnverifiedFields: false })).toBe("NEEDS_REVIEW");
    expect(decideStatus({ overallConfidence: 0.97, validationErrors: [], sourceAuthority: 1, hasUnverifiedFields: true })).toBe("NEEDS_REVIEW");
    expect(decideStatus({ overallConfidence: 0.5, validationErrors: [], sourceAuthority: 1, hasUnverifiedFields: false })).toBe("NEW");
  });
});

describe("Claude evidence verification + merge", () => {
  const text = UPPRPB_CONSTABLE_ADVT;
  const base: ClaudeOutput = {
    ...emptyExtraction(),
    notice_type: "JOB",
    organization: "Uttar Pradesh Police Recruitment and Promotion Board",
    vacancies: 60244,
    application_end_date: "2027-01-16",
    salary: "Level 3, Rs. 21700-69100",
    exam_date: "2027-03-15", // NOT in the document — a hallucination
    evidence: [
      { field: "organization", quote: "UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD" },
      { field: "vacancies", quote: "Total number of vacancies: 60244" },
      { field: "application_end_date", quote: "Last date of application: 16-01-2027" },
      { field: "salary", quote: "Level 3 of the pay matrix, Rs. 21700 - 69100" },
      { field: "exam_date", quote: "Examination will be held on 15-03-2027" },
    ],
  };

  it("verifies quotes that exist and caps the ones that don't", () => {
    const p = provenanceFromEvidence(base, text);
    expect(p.vacancies).toMatchObject({ verified: true, confidence: 0.9, sourcePage: 1 });
    expect(p.organization?.verified).toBe(true);
    expect(p.exam_date).toMatchObject({ verified: false });
    expect(p.exam_date!.confidence).toBeLessThanOrEqual(0.4);
    expect(p.notice_type?.verified).toBe(false); // no quote given
  });

  it("merge: verified Claude beats rules, rules beat unverified Claude, hallucination flagged", () => {
    const rules = ruleExtract({ text, title: "Recruitment of Constable (Civil Police) 2027" });
    const p = provenanceFromEvidence(base, text);
    const { evidence: _e, ...data } = base;
    void _e;
    const merged = mergeExtractions(rules, { data, provenance: p, overallConfidence: 0, extractors: ["claude"] });
    expect(merged.data.organization).toBe("Uttar Pradesh Police Recruitment and Promotion Board"); // verified Claude wins
    expect(merged.provenance.organization?.extractor).toBe("claude");
    expect(merged.data.notice_type).toBe("JOB");
    expect(merged.provenance.notice_type?.extractor).toBe("rules"); // Claude had no evidence → rules kept
    expect(merged.data.exam_date).toBe("2027-03-15"); // kept only because nothing else exists…
    expect(merged.provenance.exam_date?.verified).toBe(false); // …but flagged, so it can never auto-publish
    expect(merged.extractors).toEqual(["rules", "claude"]);
  });
});
