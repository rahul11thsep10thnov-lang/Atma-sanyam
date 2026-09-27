import { AgeGroupKey, CharacterAppearance, ExtractedCharacter, ExtractedFact, GenderKey } from "../types";
import { findPersonNames } from "./factExtractor";

interface RoleDefinition {
  role: string;
  pattern: string; // regex source
  gender: GenderKey;
  isOfficial?: boolean;
  ageGroup?: AgeGroupKey;
}

// Longest first so "mother-in-law" wins over "mother".
const ROLES: RoleDefinition[] = [
  { role: "mother-in-law", pattern: "mother-in-law", gender: "FEMALE", ageGroup: "ELDERLY" },
  { role: "father-in-law", pattern: "father-in-law", gender: "MALE", ageGroup: "ELDERLY" },
  { role: "sister-in-law", pattern: "sister-in-law", gender: "FEMALE" },
  { role: "brother-in-law", pattern: "brother-in-law", gender: "MALE" },
  { role: "daughter-in-law", pattern: "daughter-in-law", gender: "FEMALE" },
  { role: "son-in-law", pattern: "son-in-law", gender: "MALE" },
  { role: "grandmother", pattern: "grandmother", gender: "FEMALE", ageGroup: "ELDERLY" },
  { role: "grandfather", pattern: "grandfather", gender: "MALE", ageGroup: "ELDERLY" },
  { role: "husband", pattern: "husband", gender: "MALE" },
  { role: "wife", pattern: "wife", gender: "FEMALE" },
  { role: "mother", pattern: "mother", gender: "FEMALE" },
  { role: "father", pattern: "father", gender: "MALE" },
  { role: "son", pattern: "son", gender: "MALE" },
  { role: "daughter", pattern: "daughter", gender: "FEMALE" },
  { role: "brother", pattern: "(?:elder |younger )?brother", gender: "MALE" },
  { role: "sister", pattern: "(?:elder |younger )?sister", gender: "FEMALE" },
  { role: "uncle", pattern: "uncle", gender: "MALE" },
  { role: "aunt", pattern: "aunt", gender: "FEMALE" },
  { role: "neighbour", pattern: "neighbou?r", gender: "UNKNOWN" },
  { role: "station house officer", pattern: "SHO|station house officer", gender: "UNKNOWN", isOfficial: true },
  { role: "superintendent of police", pattern: "SP|superintendent of police|DSP|ASP", gender: "UNKNOWN", isOfficial: true },
  { role: "police inspector", pattern: "(?:sub-)?inspector", gender: "UNKNOWN", isOfficial: true },
  { role: "police officer", pattern: "police officer|constable|investigating officer", gender: "UNKNOWN", isOfficial: true },
  { role: "judge", pattern: "judge|magistrate", gender: "UNKNOWN", isOfficial: true },
  { role: "lawyer", pattern: "lawyer|advocate|counsel", gender: "UNKNOWN" },
  { role: "doctor", pattern: "doctor", gender: "UNKNOWN" },
  { role: "village head", pattern: "sarpanch|village head|pradhan", gender: "UNKNOWN", isOfficial: true },
];

const MALE_HONORIFICS = /\b(?:Mr|Shri|Sri)\.?\s$/;
const FEMALE_HONORIFICS = /\b(?:Mrs|Ms|Smt|Kumari)\.?\s$/;
const OFFICIAL_HONORIFICS = /\b(?:SHO|SP|DSP|ASP|Inspector|Sub-Inspector|Constable|Justice)\.?\s$/;
const MINOR_TERMS = /\b(minor|child|infant|toddler|boy|girl|schoolgirl|schoolboy|teenager|teen)\b/i;
const SEXUAL_VIOLENCE_TOPIC = "sexual_violence";

const CLOTHING: Record<string, string[]> = {
  "FEMALE:ADULT": ["plain cotton saree in muted teal", "simple salwar kameez in dusty rose", "cotton saree in soft ochre"],
  "FEMALE:ELDERLY": ["white-and-grey cotton saree with a shawl", "faded maroon saree with a woollen shawl"],
  "FEMALE:YOUNG": ["simple kurta with dupatta in pale blue", "plain kurti and trousers in sage green"],
  "MALE:ADULT": ["plain half-sleeve shirt and trousers in grey", "checked shirt and dark trousers", "pale blue shirt and brown trousers"],
  "MALE:ELDERLY": ["white kurta-pyjama with a brown shawl", "cream kurta with a grey waistcoat"],
  "MALE:YOUNG": ["plain t-shirt and jeans in navy", "simple shirt and dark jeans"],
  OFFICIAL: ["khaki police uniform with cap"],
  CHILD: ["plain school-style clothes (face never shown)"],
};
const PALETTES = ["teal and sand", "rose and grey", "ochre and brown", "blue and cream", "olive and beige", "maroon and grey"];

function ageGroupFromAge(age: number): AgeGroupKey {
  if (age < 18) return "CHILD";
  if (age <= 28) return "YOUNG";
  if (age < 60) return "ADULT";
  return "ELDERLY";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildAppearance(gender: GenderKey, ageGroup: AgeGroupKey, isOfficial: boolean, index: number): CharacterAppearance {
  const bucket = isOfficial
    ? "OFFICIAL"
    : ageGroup === "CHILD"
      ? "CHILD"
      : `${gender === "UNKNOWN" ? "MALE" : gender}:${ageGroup === "UNKNOWN" ? "ADULT" : ageGroup}`;
  const options = CLOTHING[bucket] ?? CLOTHING["MALE:ADULT"];
  return {
    clothing: options[index % options.length],
    build: ageGroup === "ELDERLY" ? "slightly stooped, slow movements" : "average build",
    hair: ageGroup === "ELDERLY" ? "grey hair" : gender === "FEMALE" ? "dark hair tied back" : "short dark hair",
    accessories: isOfficial ? "name badge (unreadable)" : "none",
    palette: PALETTES[index % PALETTES.length],
  };
}

function detectRole(text: string, name: string): RoleDefinition | undefined {
  const n = escapeRegex(name);
  for (const r of ROLES) {
    const patterns = [
      new RegExp(`\\b(?:${r.pattern})\\s(?:,\\s)?${n}\\b`, "i"), // "husband Ramesh", "SHO Anil Kumar"
      new RegExp(`\\b${n},?\\s(?:\\(\\d{1,3}\\),?\\s)?(?:\\d{1,3},\\s)?(?:her|his|their|the)\\s(?:${r.pattern})\\b`, "i"), // "Ramesh, her husband"
      new RegExp(`\\b${n}'s\\s(?:${r.pattern})\\b`, "i"),
    ];
    // "Ramesh's wife" describes someone else — only the first two patterns identify the named person.
    if (patterns[0].test(text) || patterns[1].test(text)) return r;
  }
  return undefined;
}

function detectAge(text: string, name: string): number | undefined {
  const n = escapeRegex(name);
  const m =
    text.match(new RegExp(`(\\d{1,3})-year-old\\s(?:[a-z-]+\\s){0,2}${n}`)) ??
    text.match(new RegExp(`${n},?\\s\\((\\d{1,3})\\)`)) ??
    text.match(new RegExp(`${n},\\s(\\d{1,3}),`)) ??
    text.match(new RegExp(`${n},?\\saged\\s(\\d{1,3})`));
  const age = m ? Number(m[1]) : undefined;
  return age && age < 120 ? age : undefined;
}

function detectGenderFromContext(text: string, name: string): GenderKey {
  const n = escapeRegex(name);
  const before = text.match(new RegExp(`([A-Za-z-]+\\.?\\s)${n}`))?.[1];
  if (before && MALE_HONORIFICS.test(before)) return "MALE";
  if (before && FEMALE_HONORIFICS.test(before)) return "FEMALE";
  const after = text.match(new RegExp(`${n}[^.]*?\\.\\s?[^.]*`))?.[0] ?? "";
  const she = /\b(she|her)\b/i.test(after);
  const he = /\b(he|his|him)\b/i.test(after);
  if (she && !he) return "FEMALE";
  if (he && !she) return "MALE";
  return "UNKNOWN";
}

/**
 * Stage: CHARACTER EXTRACTION. Named people plus unnamed family roles
 * ("her mother-in-law") become characters with role, gender, age group and
 * a fixed appearance sheet. Protection rules are applied here, before any
 * script is written:
 *   - minors are never named (displayName becomes "a minor boy/girl");
 *   - in sexual-violence stories the survivor is never named;
 *   - officials are flagged so they get an authoritative voice.
 * A character "speaks" only when the article attributes a direct quote to them.
 */
export function extractCharacters(text: string, facts: ExtractedFact[], sensitiveTopics: string[] = []): ExtractedCharacter[] {
  const characters: ExtractedCharacter[] = [];
  const quotes = facts.filter((f) => f.type === "QUOTE");

  const names = findPersonNames(text).sort((a, b) => text.indexOf(a) - text.indexOf(b));
  for (const name of names) {
    const role = detectRole(text, name);
    const before = text.match(new RegExp(`([A-Za-z-]+\\.?\\s)${escapeRegex(name)}`))?.[1] ?? "";
    const isOfficial = !!role?.isOfficial || OFFICIAL_HONORIFICS.test(before);
    const age = detectAge(text, name);
    const gender = role && role.gender !== "UNKNOWN" ? role.gender : detectGenderFromContext(text, name);
    const ageGroup = age !== undefined ? ageGroupFromAge(age) : role?.ageGroup ?? (isOfficial ? "ADULT" : "UNKNOWN");
    characters.push({
      key: "",
      displayName: name,
      realName: name,
      role: role?.role ?? (isOfficial ? "police officer" : "person named in the report"),
      gender,
      ageGroup,
      isMinor: ageGroup === "CHILD",
      isOfficial,
      isRealPerson: true,
      anonymized: false,
      speaks: quotes.some((q) => q.attributedTo && (q.attributedTo.includes(name) || name.includes(q.attributedTo.replace(/^the\s/i, "")))),
      appearance: buildAppearance(gender, ageGroup, isOfficial, characters.length),
    });
  }

  // Unnamed family roles referred to possessively ("her husband", "the accused's mother").
  for (const r of ROLES) {
    if (characters.some((c) => c.role === r.role)) continue;
    const m = text.match(new RegExp(`\\b(her|his|their|the)\\s(${r.pattern})\\b`, "i"));
    if (!m) continue;
    const ageGroup = r.ageGroup ?? (r.isOfficial ? "ADULT" : "UNKNOWN");
    const speaks = quotes.some((q) => q.attributedTo && new RegExp(`\\b(?:${r.pattern})\\b`, "i").test(q.attributedTo));
    characters.push({
      key: "",
      displayName: `the ${m[2].toLowerCase()}`,
      role: r.role,
      gender: r.gender,
      ageGroup,
      isMinor: false,
      isOfficial: !!r.isOfficial,
      isRealPerson: true,
      anonymized: true,
      speaks,
      appearance: buildAppearance(r.gender, ageGroup, !!r.isOfficial, characters.length),
    });
  }

  // Unnamed minors mentioned explicitly.
  const minorMention = text.match(/\b(\d{1,2})-year-old\s(son|daughter|boy|girl|child)\b/i);
  if (minorMention && Number(minorMention[1]) < 18 && !characters.some((c) => c.isMinor)) {
    const gender: GenderKey = /son|boy/i.test(minorMention[2]) ? "MALE" : /daughter|girl/i.test(minorMention[2]) ? "FEMALE" : "UNKNOWN";
    characters.push({
      key: "",
      displayName: gender === "MALE" ? "a minor boy" : gender === "FEMALE" ? "a minor girl" : "a minor",
      role: minorMention[2].toLowerCase(),
      gender,
      ageGroup: "CHILD",
      isMinor: true,
      isOfficial: false,
      isRealPerson: true,
      anonymized: true,
      speaks: false,
      appearance: buildAppearance(gender, "CHILD", false, characters.length),
    });
  }

  return characters.map((c, i) => protect({ ...c, key: `CHAR_${String(i + 1).padStart(2, "0")}` }, text, sensitiveTopics));
}

/** Applies identity-protection rules. Exported so LLM-extracted characters get the same treatment. */
export function protect(c: ExtractedCharacter, text: string, sensitiveTopics: string[]): ExtractedCharacter {
  const nameContext = c.realName ? text.match(new RegExp(`[^.]*\\b${escapeRegex(c.realName)}\\b[^.]*`))?.[0] ?? "" : "";
  const isMinor = c.isMinor || c.ageGroup === "CHILD" || (!!c.realName && MINOR_TERMS.test(nameContext) && /\bminor\b/i.test(nameContext));
  if (isMinor) {
    return {
      ...c,
      isMinor: true,
      ageGroup: "CHILD",
      displayName: c.gender === "MALE" ? "a minor boy" : c.gender === "FEMALE" ? "a minor girl" : "a minor",
      realName: undefined,
      anonymized: true,
      speaks: false,
    };
  }
  const survivorRole = /\b(victim|survivor|complainant|wife|daughter|daughter-in-law|woman|girl)\b/i.test(c.role) || c.gender === "FEMALE";
  if (sensitiveTopics.includes(SEXUAL_VIOLENCE_TOPIC) && survivorRole && !c.isOfficial) {
    return { ...c, displayName: c.role === "person named in the report" ? "the woman" : `the ${c.role}`, realName: undefined, anonymized: true, speaks: false };
  }
  return c;
}
