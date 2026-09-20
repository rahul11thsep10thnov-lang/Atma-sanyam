const STOPWORDS = new Set([
  "the", "a", "an", "in", "on", "at", "of", "to", "and", "for", "with", "after",
  "over", "police", "said", "family", "dispute", "case", "his", "her", "their",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Jaccard similarity of two texts' significant-word sets, 0..1. */
export function textSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** True if two dates are within `days` of each other (or either is null → unknown, treated as neutral match). */
export function datesWithin(a: Date | null, b: Date | null, days: number): boolean {
  if (!a || !b) return true;
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

export function normalizeForHash(text: string): string {
  return Array.from(tokenize(text)).sort().join("-");
}
