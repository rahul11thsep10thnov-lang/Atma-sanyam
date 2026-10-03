import { describe, it, expect } from "vitest";
import { parsePostsText, parseFeesText, parseDatesText, totalVacancies, readFees } from "./jobDetails";

describe("job detail text parsers", () => {
  it("parses post | eligibility | vacancies rows and totals them", () => {
    const rows = parsePostsText("Constable (Civil Police) | 12th pass, 18–22 yrs | 52,000\nJail Warder | 12th pass | 8,244\nFireman | 12th pass |");
    expect(rows).toEqual([
      { name: "Constable (Civil Police)", eligibility: "12th pass, 18–22 yrs", vacancies: 52000 },
      { name: "Jail Warder", eligibility: "12th pass", vacancies: 8244 },
      { name: "Fireman", eligibility: "12th pass", vacancies: null },
    ]);
    expect(totalVacancies(rows)).toBe(60244);
    expect(totalVacancies([])).toBeNull();
  });
  it("parses fees with | or : and dates", () => {
    expect(parseFeesText("General / OBC | ₹400\nSC/ST: ₹400\nFemale: Exempted")).toEqual([
      { category: "General / OBC", fee: "₹400" },
      { category: "SC/ST", fee: "₹400" },
      { category: "Female", fee: "Exempted" },
    ]);
    expect(parseDatesText("Apply start | 27 Dec 2026\nLast date | 16 Jan 2027")).toEqual([{ label: "Apply start", date: "27 Dec 2026" }, { label: "Last date", date: "16 Jan 2027" }]);
    expect(readFees({ General: "100", SC: "0" })).toEqual([{ category: "General", fee: "100" }, { category: "SC", fee: "0" }]);
  });
});
