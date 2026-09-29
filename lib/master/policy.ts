import type { VerificationFrequency } from "./enums";

/**
 * Verification policy (spec section 52): how often each kind of fact must be
 * re-checked. Time-sensitive facts get short intervals; ancient history gets
 * long ones. Weather is not stored as a fact — it comes from a live API.
 */
const RULES: Array<[RegExp, VerificationFrequency]> = [
  [/^transport\.(schedule|train|bus|flight)/, "WEEKLY"],
  [/^transport\./, "QUARTERLY"],
  [/^(cost|price)\./, "QUARTERLY"],
  [/entry_fee|ticket/, "QUARTERLY"],
  [/opening_hours|timing/, "QUARTERLY"],
  [/^emergency\./, "QUARTERLY"],
  [/^festival\./, "ANNUAL"],
  [/^(unesco|heritage_status)/, "ANNUAL"],
  [/^(history|historical|tradition)/, "DECENNIAL"],
  [/^(geography|coordinates)/, "DECENNIAL"]
];

export function frequencyForFactType(factType: string): VerificationFrequency {
  for (const [re, freq] of RULES) if (re.test(factType)) return freq;
  return "ANNUAL";
}

/** Facts from these confidence levels are safe to state as fact without a caveat. */
export const STATABLE_CONFIDENCE = new Set(["VERIFIED", "PROVISIONALLY_VERIFIED", "MULTIPLE_SOURCES"]);
