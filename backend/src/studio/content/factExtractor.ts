import { INDIA_STATES } from "../../data/indiaLocations";
import { splitSentences } from "../language/languageProfiles";
import { ExtractedFact } from "../types";

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const WEEKDAYS = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";

const DATE_PATTERNS = [
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s(?:${MONTHS})\\.?(?:,?\\s\\d{4})?\\b`, "g"),
  new RegExp(`\\b(?:${MONTHS})\\.?\\s\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s\\d{4})?\\b`, "g"),
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  new RegExp(`\\b(?:on|last|this|next)\\s(?:${WEEKDAYS})(?:\\s(?:morning|afternoon|evening|night))?\\b`, "gi"),
  /\b(?:in|since)\s(?:19|20)\d{2}\b/g,
];
const TIME_PATTERN = /\b(?:around\s|about\s|at\s)?\d{1,2}(?::\d{2})?\s?(?:a\.?m\.?|p\.?m\.?)(?=\s|[.,;]|$)/gi;
const AGE_PATTERNS = [/\b(\d{1,3})-year-old\b/gi, /\baged\s(\d{1,3})\b/gi, /\b(\d{1,3})\syears?\sold\b/gi, /,\s(\d{1,2}),\s/g];
const MONEY_PATTERN = /(?:(?:Rs\.?|INR|₹)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:lakh|crore|thousand))?|\b\d[\d,]*(?:\.\d+)?\s?(?:lakh|crore)(?:\s?rupees)?)/gi;
const NUMBER_WITH_NOUN = /\b(\d[\d,]*(?:\.\d+)?|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty)\s(acres?|bighas?|children|sons|daughters|brothers|sisters|people|persons|members|days|weeks|months|years|times|policemen|officers|accused|houses|rooms|kilometres|km)\b/gi;

const ORG_SUFFIX = "Police Station|Police|High Court|Supreme Court|District Court|Family Court|Sessions Court|Court|Hospital|Medical College|Thana|Commission|Corporation|Panchayat|Department|Crime Branch|Branch|Municipality|Tehsil|Collectorate|Women's Cell|Mahila Thana";
const ORG_PATTERN = new RegExp(`\\b((?:[A-Z][A-Za-z'.-]+\\s){0,4}(?:${ORG_SUFFIX}))\\b`, "g");
const ACRONYM_ORGS = /\b(CBI|NCW|NHRC|SIT|FIR|AIIMS|CID|NCPCR)\b/g;

const QUOTE_PATTERN = /"([^"]{4,400})"/g;
const ALLEGATION_CUES = /\b(alleged(?:ly)?|accus(?:ed|es|ing)|complaint|FIR|booked|charged with|chargesheet|suspect(?:ed)?)\b/i;
const CLAIM_CUES = /\b(claim(?:ed|s)?|according to (?:the )?(?:family|relatives|neighbours|neighbors|villagers|locals)|family members said|relatives said|neighbours said)\b/i;
const OFFICIAL_CUES = /\b(police|SHO|SP|DSP|ASP|inspector|sub-inspector|officer|superintendent|commissioner|magistrate|court|judge|official|spokesperson|collector)\b[^.]*\b(said|stated|told|confirmed|informed|added|announced|ordered|directed)\b|\b(said|stated|told|confirmed|informed)\b[^.]*\b(police|SHO|SP|inspector|officer|official|spokesperson)\b/i;
const COURT_FINDING_CUES = /\b(convicted|sentenced|found guilty|acquitted|court held|court ruled|court ordered)\b/i;

const NAME_HONORIFICS = "Mr|Mrs|Ms|Smt|Shri|Sri|Dr|Kumari|SHO|SP|DSP|ASP|Inspector|Sub-Inspector|Constable|Advocate|Justice";
const HONORIFIC_NAME = new RegExp(`\\b(?:${NAME_HONORIFICS})\\.?\\s((?:[A-Z][a-z]+)(?:\\s[A-Z][a-z]+){0,2})`, "g");
const CAPITALISED_SEQUENCE = /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,}){0,2})\b/g;

const NON_NAME_WORDS = new Set(
  [
    ...MONTHS.split("|"),
    ...WEEKDAYS.split("|"),
    ...INDIA_STATES.flatMap((s) => [s.name, ...s.districts, ...s.name.split(" "), ...s.districts.flatMap((d) => d.split(/[\s-]/))]),
    "The", "This", "That", "These", "Those", "He", "She", "They", "His", "Her", "Their", "It", "Its", "After", "Before", "When", "While", "Police",
    "Court", "High", "Supreme", "District", "Family", "Hospital", "Station", "According", "However", "Meanwhile", "Also", "But", "And", "Later",
    "Earlier", "Following", "India", "Indian", "Hindu", "Muslim", "Sikh", "Christian", "Section", "Act", "Sources", "Officials", "Commission",
    "Superintendent", "Inspector", "Station", "House", "Officer", "Thana", "Crime", "Branch", "Women", "Cell", "Medical", "College", "Government",
    "Rs", "FIR", "IPC", "BNS", "Both", "Some", "Many", "Several", "Local", "Villagers", "Neighbours", "Relatives", "Around", "About", "Over", "Under",
    "Village", "Town", "City", "Road", "Nagar", "Colony", "Market", "Sessions", "Magistrate", "Judge", "Justice", "Advocate", "Lawyer",
  ].map((w) => w.toLowerCase())
);

function uniqueByValue(facts: ExtractedFact[]): ExtractedFact[] {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = `${f.type}:${(f.normalizedValue ?? f.value).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sentenceFor(sentences: string[], needle: string): string | undefined {
  return sentences.find((s) => s.includes(needle));
}

function findAttribution(sentence: string, quote: string): string | undefined {
  const outside = sentence.replace(`"${quote}"`, " ");
  const match =
    outside.match(/\b(?:said|says|told|added|stated)\s((?:(?:the\s)?[A-Z][\w.-]*|SHO|SP|DSP)(?:\s[A-Z][\w.-]*){0,3})/) ??
    outside.match(/((?:the\s)?(?:[A-Z][\w.-]*\s){0,3}[A-Z][\w.-]*|(?:the\s)?(?:police|officer|SHO|inspector|complainant|mother|father|wife|husband))\s(?:said|says|told|added|stated)\b/i);
  return match?.[1]?.trim();
}

export function normalizeMoney(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^INR\s?|^₹\s?/i, "Rs ").replace(/^Rs\.\s?/i, "Rs ").trim();
}

/** Candidate person names (used by character extraction too). */
export function findPersonNames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(HONORIFIC_NAME)) names.add(m[1]);
  for (const sentence of splitSentences(text)) {
    for (const m of sentence.matchAll(CAPITALISED_SEQUENCE)) {
      const candidate = m[1];
      const words = candidate.split(" ");
      if (words.some((w) => NON_NAME_WORDS.has(w.toLowerCase()))) continue;
      const startsSentence = sentence.startsWith(candidate);
      const hasNameCue =
        new RegExp(`${candidate}(?:,\\s\\d{1,3},|\\s\\(\\d{1,3}\\)|'s\\s|\\s(?:said|told|alleged|claimed|was|is|had|has))`).test(sentence) ||
        new RegExp(`(?:named|identified as|wife|husband|son|daughter|brother|sister|mother|father|-year-old|aged \\d+,?)\\s${candidate}`).test(sentence);
      if (words.length >= 2 || hasNameCue || (!startsSentence && words.length === 1 && hasNameCue)) names.add(candidate);
    }
  }
  // Drop single-word names that are contained in a longer found name.
  const all = [...names];
  return all.filter((n) => !all.some((other) => other !== n && other.split(" ").includes(n) && !n.includes(" ")));
}

/**
 * Stage: FACT EXTRACTION (rule-based). Pulls names, dates, times, ages,
 * money, numbers, organisations, locations, direct quotes (with
 * attribution), official statements, allegations and third-party claims
 * from the cleaned article, each tagged with a verification status:
 *   REPORTED  — stated by the publication (single source, not independently verified)
 *   ALLEGED   — an accusation that has not been proven in court
 *   UNVERIFIED — a claim by an interested party (family, neighbours…)
 *   VERIFIED  — only ever set by an admin after checking
 * The LLM path produces the same shape; both are post-validated.
 */
export function extractFactsRuleBased(text: string, locationFacts: string[] = []): ExtractedFact[] {
  const sentences = splitSentences(text.replace(/\n+/g, " "));
  const facts: ExtractedFact[] = [];

  for (const pattern of DATE_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      facts.push({ type: "DATE", value: m[0].trim(), sourceSentence: sentenceFor(sentences, m[0]), verificationStatus: "REPORTED", isKeyFact: true });
    }
  }
  for (const m of text.matchAll(TIME_PATTERN)) {
    facts.push({ type: "TIME", value: m[0].trim(), sourceSentence: sentenceFor(sentences, m[0]), verificationStatus: "REPORTED", isKeyFact: false });
  }
  for (const pattern of AGE_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const age = Number(m[1]);
      if (age > 0 && age < 120) {
        facts.push({ type: "AGE", value: m[0].replace(/^,\s|,\s$/g, "").trim(), normalizedValue: String(age), sourceSentence: sentenceFor(sentences, m[0].replace(/^,\s|,\s$/g, "")), verificationStatus: "REPORTED", isKeyFact: true });
      }
    }
  }
  for (const m of text.matchAll(MONEY_PATTERN)) {
    facts.push({ type: "MONEY", value: m[0].trim(), normalizedValue: normalizeMoney(m[0]), sourceSentence: sentenceFor(sentences, m[0]), verificationStatus: "REPORTED", isKeyFact: true });
  }
  for (const m of text.matchAll(NUMBER_WITH_NOUN)) {
    facts.push({ type: "NUMBER", value: m[0].trim(), normalizedValue: m[1].toLowerCase(), sourceSentence: sentenceFor(sentences, m[0]), verificationStatus: "REPORTED", isKeyFact: false });
  }
  for (const m of text.matchAll(ORG_PATTERN)) {
    const value = m[1].replace(/^(The|A|An)\s/, "").trim();
    if (value.split(" ").length === 1 && !/^(Police|Court|Hospital)$/.test(value)) continue;
    facts.push({ type: "ORGANIZATION", value, sourceSentence: sentenceFor(sentences, m[1]), verificationStatus: "REPORTED", isKeyFact: false });
  }
  for (const m of text.matchAll(ACRONYM_ORGS)) {
    if (m[1] === "FIR") continue;
    facts.push({ type: "ORGANIZATION", value: m[1], sourceSentence: sentenceFor(sentences, m[1]), verificationStatus: "REPORTED", isKeyFact: false });
  }
  for (const loc of locationFacts) {
    facts.push({ type: "LOCATION", value: loc, verificationStatus: "REPORTED", isKeyFact: true, sourceSentence: sentenceFor(sentences, loc) });
  }
  for (const name of findPersonNames(text)) {
    facts.push({ type: "PERSON_NAME", value: name, sourceSentence: sentenceFor(sentences, name), verificationStatus: "REPORTED", isKeyFact: true });
  }

  const quotedSentences = new Set<string>();
  for (const sentence of sentences) {
    for (const m of sentence.matchAll(QUOTE_PATTERN)) {
      quotedSentences.add(sentence);
      facts.push({
        type: "QUOTE",
        value: m[1].trim(),
        sourceSentence: sentence,
        attributedTo: findAttribution(sentence, m[1]),
        statementType: "DIRECT_QUOTE",
        verificationStatus: "REPORTED",
        isKeyFact: false,
      });
    }
  }

  sentences.forEach((sentence, index) => {
    if (quotedSentences.has(sentence)) return;
    if (COURT_FINDING_CUES.test(sentence)) {
      facts.push({ type: "OFFICIAL_STATEMENT", value: sentence, sourceSentence: sentence, statementType: "REPORTED_STATEMENT", verificationStatus: "REPORTED", isKeyFact: true, timelineOrder: index });
    } else if (ALLEGATION_CUES.test(sentence)) {
      facts.push({ type: "ALLEGATION", value: sentence, sourceSentence: sentence, statementType: "REPORTED_STATEMENT", verificationStatus: "ALLEGED", isKeyFact: true, timelineOrder: index });
    } else if (OFFICIAL_CUES.test(sentence)) {
      facts.push({ type: "OFFICIAL_STATEMENT", value: sentence, sourceSentence: sentence, statementType: "REPORTED_STATEMENT", verificationStatus: "REPORTED", isKeyFact: true, timelineOrder: index });
    } else if (CLAIM_CUES.test(sentence)) {
      facts.push({ type: "CLAIM", value: sentence, sourceSentence: sentence, statementType: "REPORTED_STATEMENT", verificationStatus: "UNVERIFIED", isKeyFact: false, timelineOrder: index });
    } else {
      facts.push({ type: "EVENT", value: sentence, sourceSentence: sentence, statementType: "AI_NARRATION", verificationStatus: "REPORTED", isKeyFact: false, timelineOrder: index });
    }
  });

  return uniqueByValue(facts);
}
