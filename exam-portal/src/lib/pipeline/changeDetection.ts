export interface TextDiff {
  added: string[];
  removed: string[];
  changed: boolean;
}

const normalizeLine = (l: string) => l.replace(/\s+/g, " ").trim();

/**
 * Line-level set diff between two versions of a document's text. Cheap,
 * dependency-free, and exactly enough to answer "what changed?" for a
 * government notice ("Last date: 10 January" → "Last date: 20 January").
 * Field-level change summaries are derived from this plus re-extraction
 * (pipeline/extract), not from the raw text alone.
 */
export function diffText(oldText: string | null | undefined, newText: string | null | undefined): TextDiff {
  const oldLines = new Set((oldText ?? "").split(/\r?\n|\f/).map(normalizeLine).filter(Boolean));
  const newLines = new Set((newText ?? "").split(/\r?\n|\f/).map(normalizeLine).filter(Boolean));
  const added = [...newLines].filter((l) => !oldLines.has(l));
  const removed = [...oldLines].filter((l) => !newLines.has(l));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

/** Pairs each removed line with the most similar added line, if any, so
 * the UI can show OLD → NEW instead of two unrelated lists. */
export function pairChanges(diff: TextDiff, limit = 20): Array<{ old: string | null; new: string | null }> {
  const used = new Set<number>();
  const pairs: Array<{ old: string | null; new: string | null }> = [];
  for (const removed of diff.removed) {
    let best = -1;
    let bestScore = 0;
    diff.added.forEach((added, i) => {
      if (used.has(i)) return;
      const score = similarity(removed, added);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0 && bestScore >= 0.5) {
      used.add(best);
      pairs.push({ old: removed, new: diff.added[best] });
    } else {
      pairs.push({ old: removed, new: null });
    }
    if (pairs.length >= limit) return pairs;
  }
  diff.added.forEach((added, i) => {
    if (!used.has(i) && pairs.length < limit) pairs.push({ old: null, new: added });
  });
  return pairs;
}

/** Sørensen–Dice similarity over character bigrams (0..1). Also used by
 * the deduplicator for title similarity. */
export function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const t = s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
    const m = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i += 1) {
      const bg = t.slice(i, i + 2);
      if (bg.includes(" ")) continue;
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 && B.size === 0) return a.trim() === b.trim() ? 1 : 0;
  let inter = 0;
  let sizeA = 0;
  let sizeB = 0;
  for (const [k, v] of A) {
    sizeA += v;
    inter += Math.min(v, B.get(k) ?? 0);
  }
  for (const v of B.values()) sizeB += v;
  return sizeA + sizeB === 0 ? 0 : (2 * inter) / (sizeA + sizeB);
}
