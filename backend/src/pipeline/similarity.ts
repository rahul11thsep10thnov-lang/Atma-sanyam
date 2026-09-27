import { createHash } from 'node:crypto';

// Duplicate detection without an embeddings service:
//  1. normalize: case, digits, "%"/"percent"/"प्रतिशत" → one token, filler
//     words ("what is", "find", "kya hai", "ज्ञात कीजिए") dropped;
//  2. exact: identical normalized token set  → fingerprint match;
//  3. near:  token Jaccard + character-trigram Dice, penalised when the
//     numbers differ ("20% of 500" vs "30% of 500" are different questions),
//     boosted when the answer options are also the same.
// Cross-language paraphrases (a Hindi and an English version of one question)
// are not detected; see QUESTION_PIPELINE.md for the embeddings upgrade path.

const STOPWORDS = new Set(
  [
    // English
    'a an the of is are was were be will to in on at for and or by with from as it its this that these those what which who whom whose',
    'how much many find calculate compute determine evaluate value following given then if than out answer question correct option choose select',
    'please does do did can could should would shall may might has have had there their them they he she his her you your we our us i me my',
    // Hinglish
    'kya hai ka ki ke me mein se ko kitna kitni kitne kaun kaunsa kaunsi sa si hoga hogi honge gyat kijiye karein kare kariye batao bataiye nikalo',
    'nikaliye aur ya tha thi the',
    // Hindi
    'क्या है हैं का की के में से को एक और या कितना कितनी कितने कौन सा सी सा होगा होगी होंगे ज्ञात कीजिए करें कीजिये निकालिए बताइए था थी थे',
  ]
    .join(' ')
    .split(/\s+/)
);

const PHRASE_MAP: [RegExp, string][] = [
  [/%/g, ' percent '],
  [/प्रतिशत|pratishat|percentage|per cent/g, ' percent '],
  [/₹|rs\.?(?=\s|\d|$)|rupees?|rupaye|रुपये|रुपए|रु\./g, ' rs '],
  [/×/g, ' times '],
];

function toAsciiDigits(s: string) {
  return s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}

export function tokenize(text: string): string[] {
  let t = toAsciiDigits(text.normalize('NFKC').toLowerCase());
  for (const [re, rep] of PHRASE_MAP) t = t.replace(re, rep);
  t = t.replace(/(\d),(?=\d)/g, '$1'); // 1,000 → 1000
  t = t.replace(/[^\p{L}\p{N}\p{M}.\s]/gu, ' ').replace(/(?<!\d)\.|\.(?!\d)/g, ' ');
  return t
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => (/^[a-z]{4,}s$/.test(w) ? w.slice(0, -1) : w));
}

export function normalizeText(text: string): string {
  return tokenize(text).join(' ');
}

export function numbersIn(normalized: string): string[] {
  return (normalized.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/** Order-insensitive signature of the normalized token set. */
export function fingerprint(normalized: string): string {
  const set = [...new Set(normalized.split(' ').filter(Boolean))].sort().join(' ');
  return createHash('sha256').update(set).digest('hex').slice(0, 24);
}

function trigrams(s: string): Map<string, number> {
  const padded = `  ${s} `;
  const m = new Map<string, number>();
  for (let i = 0; i < padded.length - 2; i++) {
    const g = padded.slice(i, i + 3);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

function dice(a: string, b: string): number {
  if (!a && !b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let overlap = 0;
  let total = 0;
  for (const [g, n] of ta) {
    overlap += Math.min(n, tb.get(g) ?? 0);
    total += n;
  }
  for (const n of tb.values()) total += n;
  return total === 0 ? 0 : (2 * overlap) / total;
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export interface Comparable {
  normalizedText: string;
  /** Normalized option texts (order irrelevant). */
  options?: string[];
}

/** 0–1 likelihood that two questions ask the same thing. */
export function similarity(a: Comparable, b: Comparable): number {
  if (a.normalizedText === b.normalizedText) return 1;
  const ta = a.normalizedText.split(' ').filter(Boolean);
  const tb = b.normalizedText.split(' ').filter(Boolean);
  // Same words in a different order ("500 ka 20%" / "20% of 500").
  if ([...new Set(ta)].sort().join(' ') === [...new Set(tb)].sort().join(' ')) return 1;
  let score = 0.6 * jaccard(ta, tb) + 0.4 * dice(a.normalizedText, b.normalizedText);

  const na = numbersIn(a.normalizedText).join(',');
  const nb = numbersIn(b.normalizedText).join(',');
  if (na !== nb && (na || nb)) score *= 0.6;
  // Same numbers in a similar sentence is a strong paraphrase signal.
  else if (na && na === nb) score = Math.min(1, score + 0.1);

  if (a.options?.length && b.options?.length && score >= 0.6) {
    const ob = new Set(b.options);
    const shared = a.options.filter((o) => ob.has(o)).length;
    if (shared >= 3) score = Math.max(score, 0.9);
  }
  return Math.round(score * 1000) / 1000;
}

export const DUPLICATE_THRESHOLD = 0.82;

export interface DuplicateMatch {
  id: string;
  score: number;
}

export function bestMatch(candidate: Comparable, pool: Iterable<Comparable & { id: string }>): DuplicateMatch | null {
  let best: DuplicateMatch | null = null;
  for (const other of pool) {
    const score = similarity(candidate, other);
    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { id: other.id, score };
  }
  return best;
}
