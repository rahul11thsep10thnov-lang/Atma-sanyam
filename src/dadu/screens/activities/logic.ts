// Pure helpers behind the activity components (RN-free, unit tested).
import type { ActivityItem } from '../../core/content';

export interface Pt { x: number; y: number }

/** Sample points along a polyline at roughly `step` spacing. */
export function samplePath(points: Pt[], step = 12): Pt[] {
  if (points.length === 0) return [];
  const out: Pt[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    let d = step - carry;
    while (d <= len) { out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len }); d += step; }
    carry = len - (d - step);
  }
  return out;
}

/** Fraction of template samples that have a drawn point within `tolerance`. */
export function traceCoverage(template: Pt[], drawn: Pt[], tolerance = 18): number {
  if (template.length === 0) return 0;
  if (drawn.length === 0) return 0;
  let hit = 0;
  for (const t of template) if (drawn.some((p) => Math.hypot(p.x - t.x, p.y - t.y) <= tolerance)) hit++;
  return hit / template.length;
}

/** Simple stroke templates (Devanagari/Latin glyphs and digits) in a 200×200 box. */
export const TRACE_TEMPLATES: Record<string, Pt[][]> = {
  ka: [[{ x: 40, y: 40 }, { x: 160, y: 40 }], [{ x: 120, y: 40 }, { x: 120, y: 170 }], [{ x: 120, y: 90 }, { x: 70, y: 70 }, { x: 55, y: 110 }, { x: 90, y: 130 }, { x: 120, y: 110 }]],
  a: [[{ x: 60, y: 170 }, { x: 100, y: 40 }, { x: 140, y: 170 }], [{ x: 78, y: 120 }, { x: 122, y: 120 }]],
  '1': [[{ x: 80, y: 70 }, { x: 110, y: 40 }, { x: 110, y: 170 }]],
  '2': [[{ x: 60, y: 70 }, { x: 100, y: 40 }, { x: 140, y: 70 }, { x: 60, y: 170 }, { x: 150, y: 170 }]],
  '3': [[{ x: 60, y: 50 }, { x: 140, y: 50 }, { x: 95, y: 100 }, { x: 140, y: 140 }, { x: 60, y: 170 }]],
  o: [[{ x: 100, y: 40 }, { x: 150, y: 70 }, { x: 150, y: 140 }, { x: 100, y: 170 }, { x: 50, y: 140 }, { x: 50, y: 70 }, { x: 100, y: 40 }]],
};
export function templateFor(key: string): Pt[][] {
  return TRACE_TEMPLATES[key] ?? TRACE_TEMPLATES.o;
}

/** Items that take part in a sort (have a group) and the distinct zones. */
export function sortZones(items: ActivityItem[]): string[] {
  return [...new Set(items.filter((i) => i.group !== undefined).map((i) => i.group as string))];
}

/** Beat period in ms from the rhythm spec, and the number of taps expected. */
export function rhythmSpec(items: ActivityItem[]): { beatMs: number; taps: number } {
  const beatMs = Number(items.find((i) => i.key === 'beat')?.group ?? 500);
  const taps = items.filter((i) => i.key !== 'beat' && i.order !== undefined).length;
  return { beatMs: beatMs > 0 ? beatMs : 500, taps };
}

/** Fraction of sorted items that sit in the right zone (for the live progress bar). */
export function sortProgress(items: ActivityItem[], placed: Record<string, string>): number {
  const g = items.filter((i) => i.group !== undefined);
  if (g.length === 0) return 0;
  return g.filter((i) => placed[i.key] === i.group).length / g.length;
}

/** Grid for mazes/code: cells with wall flags, start and goal. */
export function gridCells(items: ActivityItem[]): { w: number; h: number; walls: Set<string>; start: Pt; goal: Pt; dir: number } {
  const g = (k: string) => items.find((i) => i.key === k)?.group ?? '';
  const [w, h] = (g('size') || '5,5').split(',').map(Number);
  const [sx, sy, sd] = (g('start') || '0,0,1').split(',').map(Number);
  const [gx, gy] = (g('goal') || `${w - 1},${h - 1}`).split(',').map(Number);
  return { w, h, walls: new Set(items.filter((i) => i.key.startsWith('wall')).map((i) => i.group ?? '')), start: { x: sx, y: sy }, goal: { x: gx, y: gy }, dir: sd || 0 };
}

/** Expand a program with repeat blocks into primitive tokens (mirrors the engine). */
export function expandProgram(program: string[]): string[] {
  const out: string[] = [];
  for (const t of program) {
    const m = /^repeat:(\d+):(\w+)$/.exec(t);
    if (m) for (let i = 0; i < Math.min(20, Number(m[1])); i++) out.push(m[2]); else out.push(t);
  }
  return out;
}

/** Picture choice: how many columns for n items in Little vs Explorer mode. */
export function choiceColumns(n: number, little: boolean): number {
  if (little) return n <= 3 ? 1 : 2;
  return n <= 2 ? 2 : 2;
}
