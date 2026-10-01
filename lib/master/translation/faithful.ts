/**
 * Faithfulness check for translated text. It does not judge fluency — it makes sure a translation
 * cannot change a fact: every number (prices, times, years, distances) in the English source must
 * appear unchanged in the translation, the {name} placeholder must survive, and a tradition's
 * framing cannot be dropped silently (a translation may not be empty or identical-by-accident).
 */

const NATIVE_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9"
};

export const toAsciiDigits = (s: string) => s.replace(/[०-९௦-௯]/g, (c) => NATIVE_DIGITS[c] ?? c);

const numbersIn = (s: string) => (toAsciiDigits(s).replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).sort();

export interface FaithfulResult {
  ok: boolean;
  problems: string[];
}

export function checkFaithful(source: string, translation: string): FaithfulResult {
  const problems: string[] = [];
  if (!translation.trim()) return { ok: false, problems: ["empty translation"] };

  const want = numbersIn(source);
  const have = numbersIn(translation);
  const remaining = [...have];
  for (const n of want) {
    const i = remaining.indexOf(n);
    if (i === -1) problems.push(`number ${n} is missing or changed`);
    else remaining.splice(i, 1);
  }
  for (const n of remaining) problems.push(`number ${n} was added`);

  const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  if (count(source, /\{name\}/g) !== count(translation, /\{name\}/g)) problems.push("{name} placeholder count differs");
  if (count(source, /₹/g) !== count(translation, /₹/g)) problems.push("₹ signs differ");
  return { ok: problems.length === 0, problems };
}
