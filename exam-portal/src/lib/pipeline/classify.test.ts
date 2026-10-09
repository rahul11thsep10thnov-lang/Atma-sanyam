import { describe, it, expect } from "vitest";
import { classifySections, lifecycleLabel } from "./classify";
import { detectStateCode, REGIONS, PRIORITY_REGION_CODES } from "@/lib/sources/regions";
import { ruleExtract } from "./extract/rules";

describe("section classification", () => {
  it("puts one notice in several sections without duplicating it", () => {
    expect(classifySections({ noticeType: "JOB", title: "SSC CGL 2027 Notification and Exam Calendar 2027" })).toEqual(["LATEST_JOBS", "EXAM_CALENDAR"]);
    expect(classifySections({ noticeType: "RESULT", title: "Final Result and Cut-off Marks — Constable 2026" })).toEqual(["RESULTS", "CUT_OFF_MARKS"]);
    expect(classifySections({ noticeType: "MERIT_LIST", title: "Final merit list — Lecturer" })).toEqual(["RESULTS", "MERIT_LISTS"]);
  });

  it("covers the lifecycle and less common sections", () => {
    expect(classifySections({ noticeType: "CORRECTION_WINDOW", title: "Correction window opens for Lecturer 2026" })).toContain("CORRECTION_WINDOWS");
    expect(classifySections({ noticeType: "OTHER", title: "Application status of candidates — Junior Assistant" })).toEqual(["APPLICATION_STATUS"]);
    expect(classifySections({ noticeType: "OTHER", title: "Counselling schedule for B.Ed admission 2026" })).toEqual(["ADMISSIONS", "COUNSELLING"]);
    expect(classifySections({ noticeType: "OTHER", title: "Revised syllabus for Mains" })).toEqual(["SYLLABUS"]);
    expect(classifySections({ noticeType: "INTERVIEW", title: "Interview schedule" })).toEqual(["INTERVIEW_NOTICES"]);
    expect(classifySections({ noticeType: "OTHER", title: "Holiday list" })).toEqual(["OTHER_NOTICES"]);
  });

  it("keeps scholarships and admissions out of Latest Jobs", () => {
    expect(classifySections({ noticeType: "OTHER", title: "Post-matric scholarship applications invited" })).toEqual(["SCHOLARSHIPS"]);
    expect(classifySections({ noticeType: "OTHER", title: "Admission notice — apply online for MA 2026" })).toEqual(["ADMISSIONS"]);
  });

  it("labels lifecycle steps for the timeline", () => {
    expect(lifecycleLabel("DEADLINE_EXTENSION")).toBe("Last date extended");
    expect(lifecycleLabel("APPLICATION_STARTED")).toBe("Application started");
    expect(lifecycleLabel("MERIT_LIST")).toBe("Merit list published");
  });

  it("rule extractor recognises the new lifecycle types without stealing plain job notices", () => {
    expect(ruleExtract({ text: "Online application correction window will be open from 10-11-2026 to 12-11-2026.", title: "Correction window — Lecturer 2026" }).data.notice_type).toBe("CORRECTION_WINDOW");
    expect(ruleExtract({ text: "The online application process has started for Advt 05/2026.", title: "Online application started" }).data.notice_type).toBe("APPLICATION_STARTED");
    expect(ruleExtract({ text: "Applications are invited for the recruitment of 120 Junior Engineers.", title: "Recruitment of Junior Engineer" }).data.notice_type).toBe("JOB");
  });
});

describe("state / UT detection", () => {
  it("covers all 28 states and 8 UTs, with the priority states flagged", () => {
    expect(REGIONS.filter((r) => r.kind === "STATE")).toHaveLength(28);
    expect(REGIONS.filter((r) => r.kind === "UT")).toHaveLength(8);
    expect(PRIORITY_REGION_CODES.sort()).toEqual(["BR", "CT", "HR", "JH", "MP", "PB", "RJ", "UP", "UT"]);
  });

  it("reads commission abbreviations and names", () => {
    expect(detectStateCode({ organization: "UPSSSC", title: "PET 2026" })).toBe("UP");
    expect(detectStateCode({ organization: "Bihar Public Service Commission" })).toBe("BR");
    expect(detectStateCode({ title: "RSSB Patwari Result" })).toBe("RJ");
    expect(detectStateCode({ title: "UKSSSC Forest Guard" })).toBe("UT");
    expect(detectStateCode({ title: "CGPSC State Service Exam" })).toBe("CT");
    expect(detectStateCode({ text: "Haryana Staff Selection Commission, Panchkula" })).toBe("HR");
  });

  it("returns null rather than guessing when nothing or several states match", () => {
    expect(detectStateCode({ title: "SSC CGL 2026" })).toBeNull();
    expect(detectStateCode({ title: "Joint recruitment for Bihar and Jharkhand" })).toBeNull();
    expect(detectStateCode({ title: "Punjab National Bank recruitment" })).toBeNull();
  });
});
