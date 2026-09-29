import { describe, it, expect } from "vitest";
import { applyTransition, availableTransitions, InvalidTransitionError } from "./workflow";

describe("applyTransition", () => {
  it("moves DRAFT to IN_REVIEW for an AUTHOR submitting for review", () => {
    expect(applyTransition("DRAFT", "SUBMIT_FOR_REVIEW", "AUTHOR")).toBe("IN_REVIEW");
  });

  it("refuses to APPROVE from DRAFT — must go through IN_REVIEW first", () => {
    expect(() => applyTransition("DRAFT", "APPROVE", "REVIEWER")).toThrow(InvalidTransitionError);
  });

  it("refuses an AUTHOR trying to APPROVE, even from a valid source status", () => {
    expect(() => applyTransition("IN_REVIEW", "APPROVE", "AUTHOR")).toThrow(InvalidTransitionError);
  });

  it("lets EDITOR publish straight from DRAFT without a reviewer step", () => {
    expect(applyTransition("DRAFT", "PUBLISH", "EDITOR")).toBe("PUBLISHED");
  });

  it("refuses an AUTHOR publishing directly", () => {
    expect(() => applyTransition("DRAFT", "PUBLISH", "AUTHOR")).toThrow(InvalidTransitionError);
  });

  it("lets SUPER_ADMIN reopen a REJECTED record as DRAFT", () => {
    expect(applyTransition("REJECTED", "REOPEN_AS_DRAFT", "SUPER_ADMIN")).toBe("DRAFT");
  });

  it("refuses archiving something that was never published", () => {
    expect(() => applyTransition("DRAFT", "ARCHIVE", "EDITOR")).toThrow(InvalidTransitionError);
  });
});

describe("availableTransitions", () => {
  it("gives an AUTHOR only SUBMIT_FOR_REVIEW from DRAFT", () => {
    expect(availableTransitions("DRAFT", "AUTHOR")).toEqual(["SUBMIT_FOR_REVIEW"]);
  });

  it("gives a REVIEWER both APPROVE and REJECT from IN_REVIEW, nothing else", () => {
    const transitions = availableTransitions("IN_REVIEW", "REVIEWER");
    expect(transitions.sort()).toEqual(["APPROVE", "REJECT"]);
  });

  it("gives an EDITOR every transition out of DRAFT they're allowed", () => {
    const transitions = availableTransitions("DRAFT", "EDITOR").sort();
    expect(transitions).toEqual(["PUBLISH", "SUBMIT_FOR_REVIEW"]);
  });
});
