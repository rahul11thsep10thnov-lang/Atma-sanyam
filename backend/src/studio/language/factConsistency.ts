import { LANGUAGE_PROFILES } from "./languageProfiles";
import { LintFlag } from "../types";

const DIGIT_ZEROS = [...new Set(Object.values(LANGUAGE_PROFILES).map((p) => p.nativeDigitZero).filter((z): z is number => !!z))];

/** Converts native Indic digits (०-९, ০-৯, ૦-૯, ੦-੯, ୦-୯, ௦-௯, ౦-౯, ೦-೯, ൦-൯) to 0-9. */
export function normalizeDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero !== undefined ? String(cp - zero) : ch;
  }
  return out;
}

export function extractNumbers(text: string): string[] {
  return [...normalizeDigits(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, "").replace(/\.$/, ""));
}

function multiset(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/**
 * Cross-language fact parity: every number in the master scene should
 * appear in the localised scene and no new numbers should appear. (Names
 * are checked via the glossary; dates/ages/amounts are numbers.)
 */
export function checkNumberParity(masterText: string, localizedText: string, sceneNumber: number): LintFlag[] {
  const flags: LintFlag[] = [];
  const master = multiset(extractNumbers(masterText));
  const local = multiset(extractNumbers(localizedText));
  for (const [n, count] of master) {
    if ((local.get(n) ?? 0) < count) {
      flags.push({ rule: "NUMBER_MISSING_IN_TRANSLATION", severity: "WARNING", sceneNumber, excerpt: n, suggestion: `The master script says ${n}; the translation should keep it (as digits).` });
    }
  }
  for (const [n] of local) {
    if (!master.has(n)) flags.push({ rule: "NUMBER_ADDED_IN_TRANSLATION", severity: "BLOCKING", sceneNumber, excerpt: n, suggestion: "A number appears that is not in the master script." });
  }
  return flags;
}
