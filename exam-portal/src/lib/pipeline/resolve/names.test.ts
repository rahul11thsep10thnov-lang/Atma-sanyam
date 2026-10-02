import { describe, it, expect } from "vitest";
import { acronymOf, canonicalCase, inferCategories, inferOrganizationType, nameMatchScore, normalizeName, stripYear, yearOf } from "./names";

describe("name helpers", () => {
  it("normalises like the alias backfill", () => {
    expect(normalizeName("S.S.C.")).toBe("ssc");
    expect(normalizeName("Staff Selection Commission")).toBe("staffselectioncommission");
    expect(normalizeName("उत्तर प्रदेश")).toBe("उत्तरप्रदेश");
  });

  it("scores near-identical names high and sibling exams low", () => {
    expect(nameMatchScore("Constable 2027", "Constable Recruitment 2027")).toBeGreaterThanOrEqual(0.85);
    expect(nameMatchScore("Combined Graduate Level Examination", "Combined Graduate Level Examination")).toBe(1);
    expect(nameMatchScore("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD", "Uttar Pradesh Police Recruitment & Promotion Board")).toBeGreaterThanOrEqual(0.92);
    expect(nameMatchScore("SSC CGL", "SSC CHSL")).toBeLessThan(0.85);
    expect(nameMatchScore("Railway Recruitment Board", "Uttar Pradesh Subordinate Services Selection Board")).toBeLessThan(0.85);
  });

  it("derives acronyms, years and year-free titles", () => {
    expect(acronymOf("Uttar Pradesh Police Recruitment and Promotion Board")).toBe("UPPRPB");
    expect(acronymOf("Staff Selection Commission")).toBe("SSC");
    expect(acronymOf("IBPS")).toBeNull();
    expect(yearOf("Combined Graduate Level Examination, 2027")).toBe(2027);
    expect(yearOf("CEN 05/2027")).toBe(2027);
    expect(yearOf(null, "2027-01-16")).toBe(2027);
    expect(yearOf("Constable")).toBeNull();
    expect(stripYear("Combined Graduate Level Examination, 2027")).toBe("Combined Graduate Level Examination");
    expect(stripYear("Recruitment of Constable (Civil Police) - 2027")).toBe("Recruitment of Constable (Civil Police)");
    expect(stripYear("CGL 2026-27")).toBe("CGL");
  });

  it("title-cases shouted names but keeps acronyms", () => {
    expect(canonicalCase("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD")).toBe("Uttar Pradesh Police Recruitment and Promotion Board");
    expect(canonicalCase("Staff Selection Commission")).toBe("Staff Selection Commission");
    expect(canonicalCase("RRB CHANDIGARH")).toBe("RRB Chandigarh");
    expect(canonicalCase("UP POLICE RECRUITMENT AND PROMOTION BOARD")).toBe("UP Police Recruitment and Promotion Board");
  });

  it("infers organization type and categories from keywords", () => {
    expect(inferOrganizationType("Union Public Service Commission")).toBe("CENTRAL");
    expect(inferOrganizationType("Uttar Pradesh Police Recruitment and Promotion Board")).toBe("STATE");
    expect(inferOrganizationType("Allahabad High Court")).toBe("COURT");
    expect(inferOrganizationType("Indian Army")).toBe("DEFENCE");
    expect(inferOrganizationType("Delhi University")).toBe("UNIVERSITY");
    expect(inferOrganizationType("NTPC Limited")).toBe("PSU");
    expect(inferCategories(["Uttar Pradesh Police Recruitment and Promotion Board", "Constable (Civil Police) 2027"]).map((c) => c.slug)).toEqual(["police"]);
    expect(inferCategories(["Staff Selection Commission", "Combined Graduate Level Examination"]).map((c) => c.slug)[0]).toBe("ssc");
    expect(inferCategories(["Union Public Service Commission", "Civil Services Examination"]).map((c) => c.slug)).toEqual(["upsc"]);
    expect(inferCategories(["Bihar Public Service Commission"]).map((c) => c.slug)).toEqual(["state-psc"]);
    expect(inferCategories(["Holiday list"])).toEqual([]);
  });
});
