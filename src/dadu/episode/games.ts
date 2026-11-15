// The Play list: every activity inside the lessons is also a stand-alone game. One representative game per kind
// of activity is offered (the first lesson, for the child's age band, that contains it).
import type { ActivityKind, ActivitySpec, Level, Lesson } from '../core/content';
import type { AgeBand } from '../core/ageBands';
import { catalog } from '../content';

export interface Game { id: string; lessonId: string; kind: ActivityKind; spec: ActivitySpec; host: string; title: { en: string; hi: string } }

export const GAME_NAMES: Record<ActivityKind, { en: string; hi: string; emoji: string }> = {
  'tap-target': { en: 'Find it', hi: 'ढूँढो', emoji: '👆' }, choose: { en: 'Choose', hi: 'चुनो', emoji: '✅' }, sort: { en: 'Sort', hi: 'छाँटो', emoji: '🧺' }, sequence: { en: 'Put in order', hi: 'क्रम लगाओ', emoji: '🔢' },
  memory: { en: 'Memory', hi: 'याद करो', emoji: '🧠' }, trace: { en: 'Trace', hi: 'लिखो', emoji: '✏️' }, count: { en: 'Count', hi: 'गिनो', emoji: '🔟' }, water: { en: 'Water the plants', hi: 'पानी दो', emoji: '💧' },
  feed: { en: 'Feed', hi: 'खिलाओ', emoji: '🥕' }, groom: { en: 'Groom', hi: 'सँवारो', emoji: '🪮' }, plant: { en: 'Plant a seed', hi: 'बीज बोओ', emoji: '🌱' }, harvest: { en: 'Harvest', hi: 'फसल काटो', emoji: '🍅' },
  cook: { en: 'Cook', hi: 'पकाओ', emoji: '🍲' }, clean: { en: 'Clean up', hi: 'सफाई', emoji: '🧹' }, 'mix-colours': { en: 'Mix colours', hi: 'रंग मिलाओ', emoji: '🎨' }, 'play-notes': { en: 'Play music', hi: 'संगीत बजाओ', emoji: '🎵' },
  rhythm: { en: 'Rhythm', hi: 'ताल', emoji: '🥁' }, draw: { en: 'Draw', hi: 'चित्र बनाओ', emoji: '🖍️' }, pattern: { en: 'Patterns', hi: 'पैटर्न', emoji: '🔷' }, 'code-blocks': { en: 'Code blocks', hi: 'कोड ब्लॉक', emoji: '🧩' },
  circuit: { en: 'Light the bulb', hi: 'बल्ब जलाओ', emoji: '💡' }, maze: { en: 'Maze', hi: 'भूलभुलैया', emoji: '🌀' }, balance: { en: 'Balance', hi: 'संतुलन', emoji: '⚖️' },
};

export function activityOf(lesson: Lesson, level: Level): ActivitySpec | null {
  const step = lesson.steps[level].find((s) => s.type === 'activity');
  return step && step.type === 'activity' ? step.activity : null;
}

export function gamesFor(band: AgeBand, level: Level): Game[] {
  const seen = new Set<ActivityKind>();
  const out: Game[] = [];
  for (const l of catalog.lessonsForBand(band)) {
    const spec = activityOf(l, level);
    if (!spec || seen.has(spec.kind)) continue;
    seen.add(spec.kind);
    out.push({ id: l.meta.id, lessonId: l.meta.id, kind: spec.kind, spec, host: l.host, title: GAME_NAMES[spec.kind] });
  }
  return out;
}
