import { describe, it, expect } from "vitest";
import { diffText, pairChanges, similarity } from "./changeDetection";

describe("diffText / pairChanges", () => {
  it("pairs a changed deadline as OLD → NEW", () => {
    const before = "UP Police Constable Recruitment 2027\nLast date of application: 10 January 2027\nVacancies: 60244";
    const after = "UP Police Constable Recruitment 2027\nLast date of application: 20 January 2027\nVacancies: 60244";
    const diff = diffText(before, after);
    expect(diff.changed).toBe(true);
    expect(diff.added).toEqual(["Last date of application: 20 January 2027"]);
    expect(diff.removed).toEqual(["Last date of application: 10 January 2027"]);
    expect(pairChanges(diff)).toEqual([
      { old: "Last date of application: 10 January 2027", new: "Last date of application: 20 January 2027" },
    ]);
  });

  it("is whitespace- and page-break-insensitive", () => {
    expect(diffText("a  b\fc", "a b\nc").changed).toBe(false);
  });

  it("reports pure additions and removals", () => {
    const pairs = pairChanges(diffText("x", "x\nCorrigendum: exam postponed"));
    expect(pairs).toEqual([{ old: null, new: "Corrigendum: exam postponed" }]);
  });
});

describe("similarity", () => {
  it("scores near-identical titles high and unrelated ones low", () => {
    expect(similarity("UP Police Constable Recruitment 2027", "UPPRPB Constable Recruitment Notification 2027")).toBeGreaterThan(0.6);
    expect(similarity("SSC CGL 2027", "IBPS Clerk 2027")).toBeLessThan(0.4);
    expect(similarity("same", "same")).toBe(1);
  });
});
