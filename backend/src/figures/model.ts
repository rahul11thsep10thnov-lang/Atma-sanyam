// A figure is a list of simple elements inside a square box of `size` units
// (y grows downwards, as in SVG). All transforms used by the generators —
// rotations by 90°, mirror images, transposes — are exact on these
// coordinates, so "is option B the mirror image of the figure?" is decided by
// comparing canonical keys, never by looking at pixels.

export type Pt = readonly [number, number];
export type Fill = 'black' | 'none' | 'grey';

export type El =
  | { k: 'line'; a: Pt; b: Pt; dash?: 'dash' | 'dot'; w?: number }
  | { k: 'poly'; pts: Pt[]; closed: boolean; fill: Fill }
  | { k: 'circle'; c: Pt; r: number; fill: Fill; dash?: 'dash' | 'dot' }
  | { k: 'sector'; c: Pt; r: number; from: number; to: number; fill: Fill } // angles in degrees, 0 = up, clockwise
  | { k: 'text'; at: Pt; s: string; size: number; sx?: 1 | -1; sy?: 1 | -1 }
  | { k: 'arrow'; a: Pt; b: Pt; dash?: 'dash' | 'dot' };

export interface Fig {
  size: number;
  els: El[];
}

export type Transform = 'id' | 'rot90' | 'rot180' | 'rot270' | 'flipX' | 'flipY' | 'transpose' | 'antiTranspose';
export const ALL_TRANSFORMS: Transform[] = ['id', 'rot90', 'rot180', 'rot270', 'flipX', 'flipY', 'transpose', 'antiTranspose'];
export const ROTATIONS: Transform[] = ['id', 'rot90', 'rot180', 'rot270'];

/** Point transform about the centre of an N×N box (rot90 = 90° clockwise). */
export function tp(t: Transform, p: Pt, n: number): Pt {
  const [x, y] = p;
  switch (t) {
    case 'id':
      return [x, y];
    case 'rot90':
      return [n - y, x];
    case 'rot180':
      return [n - x, n - y];
    case 'rot270':
      return [y, n - x];
    case 'flipX':
      return [n - x, y];
    case 'flipY':
      return [x, n - y];
    case 'transpose':
      return [y, x];
    case 'antiTranspose':
      return [n - y, n - x];
  }
}

const IS_MIRROR: Record<Transform, boolean> = {
  id: false,
  rot90: false,
  rot180: false,
  rot270: false,
  flipX: true,
  flipY: true,
  transpose: true,
  antiTranspose: true,
};
const ANGLE: Record<Transform, number> = { id: 0, rot90: 90, rot180: 180, rot270: 270, flipX: 0, flipY: 0, transpose: 0, antiTranspose: 0 };

/** How a direction angle (0 = up, clockwise, degrees) maps under a transform. */
function tAngle(t: Transform, deg: number): number {
  const norm = (d: number) => ((d % 360) + 360) % 360;
  switch (t) {
    case 'flipX':
      return norm(-deg);
    case 'flipY':
      return norm(180 - deg);
    case 'transpose':
      return norm(270 - deg); // reflection in y = x (screen coords)
    case 'antiTranspose':
      return norm(90 - deg);
    default:
      return norm(deg + ANGLE[t]);
  }
}

export function transformFig(fig: Fig, t: Transform): Fig {
  const n = fig.size;
  const P = (p: Pt) => tp(t, p, n);
  const els = fig.els.map((e): El => {
    switch (e.k) {
      case 'line':
        return { ...e, a: P(e.a), b: P(e.b) };
      case 'arrow':
        return { ...e, a: P(e.a), b: P(e.b) };
      case 'poly':
        return { ...e, pts: e.pts.map(P) };
      case 'circle':
        return { ...e, c: P(e.c) };
      case 'sector': {
        const a = tAngle(t, e.from);
        const b = tAngle(t, e.to);
        // A mirror reverses the sweep direction.
        return IS_MIRROR[t] ? { ...e, c: P(e.c), from: b, to: a } : { ...e, c: P(e.c), from: a, to: b };
      }
      case 'text': {
        let sx = e.sx ?? 1;
        let sy = e.sy ?? 1;
        if (t === 'flipX') sx = sx === 1 ? -1 : 1;
        else if (t === 'flipY') sy = sy === 1 ? -1 : 1;
        else if (t === 'rot180') {
          sx = sx === 1 ? -1 : 1;
          sy = sy === 1 ? -1 : 1;
        } else if (t !== 'id') throw new Error('Text can only be mirrored or turned upside down');
        return { ...e, at: P(e.at), sx, sy };
      }
    }
  });
  return { size: n, els };
}

/** Swap black and white fills (outlines stay outlines). */
export function invertFill(fig: Fig): Fig {
  const flip = (f: Fill): Fill => (f === 'black' ? 'none' : f === 'none' ? 'black' : f);
  return {
    size: fig.size,
    els: fig.els.map((e) => {
      if (e.k === 'circle') return { ...e, fill: flip(e.fill) };
      if (e.k === 'poly' && e.closed) return { ...e, fill: flip(e.fill) };
      if (e.k === 'sector') return { ...e, fill: flip(e.fill) };
      return e;
    }),
  };
}

export function hasFillable(fig: Fig): boolean {
  return fig.els.some((e) => e.k === 'circle' || (e.k === 'poly' && e.closed) || e.k === 'sector');
}

const r3 = (v: number) => {
  const x = Math.round(v * 1000) / 1000;
  return Object.is(x, -0) ? '0' : String(x);
};
const pk = (p: Pt) => `${r3(p[0])},${r3(p[1])}`;

function polyKey(pts: Pt[], closed: boolean): string {
  const keys = pts.map(pk);
  if (!closed) {
    const f = keys.join(' ');
    const b = [...keys].reverse().join(' ');
    return f < b ? f : b;
  }
  let best: string | null = null;
  for (const seq of [keys, [...keys].reverse()]) {
    for (let i = 0; i < seq.length; i++) {
      const s = [...seq.slice(i), ...seq.slice(0, i)].join(' ');
      if (best === null || s < best) best = s;
    }
  }
  return best!;
}

/** Order-independent description of a figure: equal keys ⇔ identical drawing. */
export function figKey(fig: Fig): string {
  const parts = fig.els.map((e) => {
    switch (e.k) {
      case 'line': {
        const [a, b] = [pk(e.a), pk(e.b)].sort();
        return `L${e.dash ?? ''}${e.w ?? ''}:${a}|${b}`;
      }
      case 'arrow':
        return `A${e.dash ?? ''}:${pk(e.a)}>${pk(e.b)}`;
      case 'poly':
        return `P${e.closed ? 'c' : 'o'}${e.fill}:${polyKey(e.pts, e.closed)}`;
      case 'circle':
        return `C${e.fill}${e.dash ?? ''}:${pk(e.c)}r${r3(e.r)}`;
      case 'sector':
        return `S${e.fill}:${pk(e.c)}r${r3(e.r)}:${r3(e.from)}-${r3(e.to)}`;
      case 'text':
        return `T:${e.s}@${pk(e.at)}s${r3(e.size)}${e.sx ?? 1}${e.sy ?? 1}`;
    }
  });
  return `${fig.size}#${parts.sort().join(';')}`;
}

export function translateEls(els: El[], dx: number, dy: number): El[] {
  const P = (p: Pt): Pt => [p[0] + dx, p[1] + dy];
  return els.map((e): El => {
    switch (e.k) {
      case 'line':
      case 'arrow':
        return { ...e, a: P(e.a), b: P(e.b) };
      case 'poly':
        return { ...e, pts: e.pts.map(P) };
      case 'circle':
      case 'sector':
        return { ...e, c: P(e.c) };
      case 'text':
        return { ...e, at: P(e.at) };
    }
  });
}
