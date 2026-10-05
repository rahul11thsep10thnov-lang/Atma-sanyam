export interface PropDescriptor {
  key: string;
  name: string;
  keywords: RegExp;
  prompt: string;
  /** Size relative to an adult's height (for placement). */
  relativeHeight: number;
  /** Where it sits: held by a character, on the ground next to them, or a close-up insert. */
  placement: "held" | "ground" | "insert";
  painter: string;
}

export const PROP_LIBRARY: PropDescriptor[] = [
  { key: "luggage", name: "suitcase", keywords: /\b(luggage|suitcase|trolley bag)\b/i, prompt: "brown hard-shell suitcase with handle, isolated", relativeHeight: 0.38, placement: "ground", painter: "suitcase" },
  { key: "bag", name: "cloth bag", keywords: /\b(bag|jhola|backpack)\b/i, prompt: "cloth shoulder bag, isolated", relativeHeight: 0.25, placement: "ground", painter: "duffel" },
  { key: "phone", name: "mobile phone", keywords: /\b(phone|mobile|call|whatsapp|message)\b/i, prompt: "smartphone, screen dark, isolated", relativeHeight: 0.08, placement: "held", painter: "phone" },
  { key: "documents", name: "documents", keywords: /\b(fir|complaint|documents?|papers?|file|chargesheet|letter|notice)\b/i, prompt: "stack of official papers with a file folder, text unreadable, isolated", relativeHeight: 0.12, placement: "insert", painter: "documents" },
  { key: "newspaper", name: "newspaper", keywords: /\b(newspaper|headline)\b/i, prompt: "folded newspaper, text unreadable, isolated", relativeHeight: 0.15, placement: "insert", painter: "documents" },
  { key: "bench", name: "platform bench", keywords: /\b(bench)\b/i, prompt: "metal platform bench, isolated", relativeHeight: 0.45, placement: "ground", painter: "bench" },
  { key: "money", name: "currency envelope", keywords: /\b(rs\.?\s?\d|rupees|lakh|crore|cash|money|dowry)\b/i, prompt: "closed paper envelope, isolated", relativeHeight: 0.08, placement: "insert", painter: "envelope" },
  { key: "scooter", name: "scooter", keywords: /\b(scooter|bike|motorcycle)\b/i, prompt: "parked scooter, isolated", relativeHeight: 0.6, placement: "ground", painter: "scooter" },
];

export function detectProps(text: string, locationDefaults: string[]): string[] {
  const found = PROP_LIBRARY.filter((p) => p.keywords.test(text)).map((p) => p.key);
  return [...new Set([...found, ...locationDefaults.filter((k) => !found.includes(k))])].slice(0, 3);
}

export function getProp(key: string): PropDescriptor | undefined {
  return PROP_LIBRARY.find((p) => p.key === key);
}
