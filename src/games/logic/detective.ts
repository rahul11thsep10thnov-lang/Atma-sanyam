// Detective Mystery rules: a seeded whodunnit. Each suspect has a set of
// traits (hat, pet, colour, place, snack). The culprit is chosen at random
// and clues are generated so that together they point to exactly one
// suspect: each clue eliminates at least one remaining suspect.

export interface Suspect { name: string; emoji: string; traits: Record<string, string> }
export interface Clue { text: string; trait: string; value: string; negative: boolean }
export interface Case { title: string; crime: string; suspects: Suspect[]; clues: Clue[]; culprit: number }

export const TRAITS: Record<string, { label: string; values: string[]; phrase: (v: string) => string; neg: (v: string) => string }> = {
  hat: { label: 'hat', values: ['red hat', 'blue hat', 'no hat', 'green hat', 'yellow hat'], phrase: (v) => `The culprit wore a ${v}.`.replace('a no hat', 'no hat'), neg: (v) => `The culprit did not wear a ${v}.`.replace('a no hat', 'no hat') },
  pet: { label: 'pet', values: ['dog', 'cat', 'parrot', 'rabbit', 'goldfish'], phrase: (v) => `A ${v} was seen with the culprit.`, neg: (v) => `The culprit does not have a ${v}.` },
  place: { label: 'place', values: ['garden', 'kitchen', 'library', 'garage', 'playground'], phrase: (v) => `Muddy footprints lead from the ${v}.`, neg: (v) => `Nobody who was in the ${v} could have done it.` },
  snack: { label: 'snack', values: ['samosa', 'banana', 'laddoo', 'biscuit', 'mango'], phrase: (v) => `Crumbs of ${v} were found at the scene.`, neg: (v) => `The culprit never eats ${v}.` },
  shoes: { label: 'shoes', values: ['sandals', 'boots', 'sneakers', 'slippers', 'barefoot'], phrase: (v) => `The prints were made by ${v}.`, neg: (v) => `The prints were not made by ${v}.` },
};

const NAMES: { name: string; emoji: string }[] = [
  { name: 'Aarav', emoji: '🧑‍🌾' }, { name: 'Diya', emoji: '👩‍🎨' }, { name: 'Kabir', emoji: '🧑‍🍳' }, { name: 'Meera', emoji: '👩‍🔬' }, { name: 'Rohan', emoji: '🧑‍🚀' }, { name: 'Zara', emoji: '👩‍🚒' }, { name: 'Ishaan', emoji: '🧑‍🎤' },
];
const CRIMES = [
  { title: 'The Missing Mango', crime: 'The last mango from the fruit bowl has vanished!' },
  { title: 'The Muddy Carpet', crime: 'Someone walked mud all over the new carpet.' },
  { title: 'The Broken Vase', crime: "Grandma's vase lies in pieces on the floor." },
  { title: 'The Vanished Homework', crime: "Priya's homework has disappeared from the table." },
  { title: 'The Empty Cookie Jar', crime: 'The cookie jar was full this morning. Now it is empty.' },
];

export function makeCase(random: () => number, suspectCount: number): Case {
  const pickN = <T,>(arr: T[], n: number): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
    return a.slice(0, n);
  };
  const traitKeys = Object.keys(TRAITS);
  const people = pickN(NAMES, suspectCount);
  const suspects: Suspect[] = people.map((p) => ({ ...p, traits: {} }));
  // Assign traits so that no two suspects are identical.
  for (const key of traitKeys) {
    const vals = pickN(TRAITS[key]!.values, suspectCount);
    // Share some values between suspects to make clues interesting.
    suspects.forEach((s, i) => { s.traits[key] = random() < 0.35 && i > 0 ? vals[Math.floor(random() * i)]! : vals[i]!; });
  }
  // No two suspects may be identical, or no clue could tell them apart.
  for (let i = 1; i < suspects.length; i++) {
    for (let j = 0; j < i; j++) {
      if (traitKeys.every((k) => suspects[i]!.traits[k] === suspects[j]!.traits[k])) {
        const key = traitKeys[Math.floor(random() * traitKeys.length)]!;
        const used = new Set(suspects.map((s) => s.traits[key]));
        const free = TRAITS[key]!.values.filter((v) => !used.has(v));
        suspects[i]!.traits[key] = free[0] ?? TRAITS[key]!.values.find((v) => v !== suspects[j]!.traits[key])!;
        j = -1; // re-check against everyone
      }
    }
  }
  const culprit = Math.floor(random() * suspectCount);
  // Build clues: keep adding until the culprit is the only consistent suspect.
  let remaining = new Set(suspects.map((_, i) => i));
  const clues: Clue[] = [];
  const keys = pickN(traitKeys, traitKeys.length);
  let guard = 0;
  while (remaining.size > 1 && guard++ < 20) {
    for (const key of keys) {
      if (remaining.size <= 1) break;
      const cv = suspects[culprit]!.traits[key]!;
      const negative = random() < 0.4;
      let clue: Clue | null = null;
      if (negative) {
        // Name a value the culprit does NOT have but some remaining suspect does.
        const others = [...remaining].filter((i) => suspects[i]!.traits[key] !== cv);
        if (!others.length) continue;
        const v = suspects[others[Math.floor(random() * others.length)]!]!.traits[key]!;
        clue = { text: TRAITS[key]!.neg(v), trait: key, value: v, negative: true };
      } else {
        const eliminates = [...remaining].some((i) => suspects[i]!.traits[key] !== cv);
        if (!eliminates) continue;
        clue = { text: TRAITS[key]!.phrase(cv), trait: key, value: cv, negative: false };
      }
      if (clues.some((c) => c.text === clue!.text)) continue;
      clues.push(clue);
      remaining = new Set([...remaining].filter((i) => clueAllows(clue!, suspects[i]!)));
    }
  }
  const crime = CRIMES[Math.floor(random() * CRIMES.length)]!;
  return { ...crime, suspects, clues: pickN(clues, clues.length), culprit };
}

export function clueAllows(clue: Clue, s: Suspect): boolean {
  const v = s.traits[clue.trait];
  return clue.negative ? v !== clue.value : v === clue.value;
}

export function consistentSuspects(c: Case): number[] {
  return c.suspects.map((_, i) => i).filter((i) => c.clues.every((cl) => clueAllows(cl, c.suspects[i]!)));
}
