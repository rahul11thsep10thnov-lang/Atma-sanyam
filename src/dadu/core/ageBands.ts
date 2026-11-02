// Age bands, interface modes, difficulty and the adaptation engine. Pure module.
// Age is never used alone to judge ability: the effective level combines the
// band, the parent's difficulty setting and demonstrated mastery.

export type AgeBand = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
export type InterfaceMode = 'lap' | 'little' | 'explorer';
export type Difficulty = 'gentle' | 'steady' | 'stretch';

export const AGE_BANDS: { key: AgeBand; from: number; to: number; mode: InterfaceMode; label: { en: string; hi: string } }[] = [
  { key: 'A0', from: 0, to: 2, mode: 'lap', label: { en: '0–2 years', hi: '0–2 वर्ष' } },
  { key: 'A1', from: 2, to: 4, mode: 'little', label: { en: '2–4 years', hi: '2–4 वर्ष' } },
  { key: 'A2', from: 4, to: 6, mode: 'little', label: { en: '4–6 years', hi: '4–6 वर्ष' } },
  { key: 'A3', from: 6, to: 8, mode: 'explorer', label: { en: '6–8 years', hi: '6–8 वर्ष' } },
  { key: 'A4', from: 8, to: 10, mode: 'explorer', label: { en: '8–10 years', hi: '8–10 वर्ष' } },
  { key: 'A5', from: 10, to: 12, mode: 'explorer', label: { en: '10–12 years', hi: '10–12 वर्ष' } },
];

const ORDER: AgeBand[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

export function bandForAge(years: number): AgeBand {
  const y = Math.max(0, Math.min(12, years));
  for (const b of AGE_BANDS) if (y < b.to) return b.key;
  return 'A5';
}

export function modeForBand(band: AgeBand): InterfaceMode {
  return AGE_BANDS.find((b) => b.key === band)?.mode ?? 'explorer';
}

/** Content is authored at two levels; the band picks which one is shown. */
export function contentLevel(band: AgeBand): 'little' | 'explorer' {
  return modeForBand(band) === 'explorer' ? 'explorer' : 'little';
}

export interface AdaptationInput {
  band: AgeBand;
  difficulty: Difficulty;
  /** Mastery 0..1 for the concept being taught (undefined when never seen). */
  mastery?: number;
  /** Recent accuracy 0..1 over the last attempts in this subject. */
  recentAccuracy?: number;
}

export interface AdaptationResult {
  /** The band whose content is served, clamped to one step either side of the real band. */
  effectiveBand: AgeBand;
  /** Number of activities in a lesson. */
  activities: number;
  /** Choices shown in a question. */
  choices: 2 | 3 | 4;
  /** Maximum lesson length in minutes. */
  minutes: number;
  /** True when Dadaji offers the simpler explanation first. */
  simplerFirst: boolean;
  /** True when the advanced explanation is unlocked. */
  advancedAvailable: boolean;
}

export function adapt(input: AdaptationInput): AdaptationResult {
  const i = ORDER.indexOf(input.band);
  let shift = 0;
  if (input.difficulty === 'gentle') shift -= 1;
  if (input.difficulty === 'stretch') shift += 1;
  if (input.mastery !== undefined) {
    if (input.mastery >= 0.85 && (input.recentAccuracy ?? 1) >= 0.8) shift += 1;
    if (input.mastery < 0.35 || (input.recentAccuracy ?? 1) < 0.4) shift -= 1;
  }
  shift = Math.max(-1, Math.min(1, shift));
  const effectiveBand = ORDER[Math.max(0, Math.min(ORDER.length - 1, i + shift))];
  const e = ORDER.indexOf(effectiveBand);
  return {
    effectiveBand,
    activities: e <= 1 ? 1 : e <= 3 ? 2 : 3,
    choices: e <= 1 ? 2 : e === 2 ? 3 : 4,
    minutes: [3, 5, 8, 12, 15, 20][e],
    simplerFirst: shift < 0,
    advancedAvailable: e >= 3,
  };
}
