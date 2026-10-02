import { describe, it, expect } from "vitest";
import { subscriptionMatches, type MatchableNotice, type MatchableSubscription } from "./subscriptions";

const notice: MatchableNotice = {
  noticeType: "ADMIT_CARD",
  priority: "HIGH",
  title: "Admit Card — Constable (Civil Police) 2027",
  summary: "Download from 10-02-2027",
  recruitmentId: "rec1",
  organizationId: "org1",
  organizationName: "UP Police Recruitment and Promotion Board",
  organizationStateId: "st-up",
  categoryIds: ["cat-police"],
};
const base: MatchableSubscription = { recruitmentId: null, organizationId: null, categoryId: null, stateId: null, keyword: null, noticeTypes: [], minPriority: "LOW" };

describe("subscriptionMatches", () => {
  it("matches 'everything' subscriptions and each scope", () => {
    expect(subscriptionMatches(base, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, recruitmentId: "rec1" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, recruitmentId: "rec2" }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, organizationId: "org1" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, organizationId: "org9" }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, categoryId: "cat-police" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, categoryId: "cat-ssc" }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, stateId: "st-up" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, stateId: "st-mp" }, notice)).toBe(false);
  });
  it("applies notice types, priority floor and keyword together", () => {
    expect(subscriptionMatches({ ...base, noticeTypes: ["JOB", "ADMIT_CARD"] }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, noticeTypes: ["RESULT"] }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, minPriority: "HIGH" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, minPriority: "URGENT" }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, keyword: "constable" }, notice)).toBe(true);
    expect(subscriptionMatches({ ...base, keyword: "up police" }, notice)).toBe(true); // organization name counts
    expect(subscriptionMatches({ ...base, keyword: "railway" }, notice)).toBe(false);
    expect(subscriptionMatches({ ...base, organizationId: "org1", noticeTypes: ["ADMIT_CARD"], minPriority: "HIGH", keyword: "civil" }, notice)).toBe(true);
  });
});
