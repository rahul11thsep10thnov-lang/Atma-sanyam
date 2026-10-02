// Jigsaw geometry: real interlocking piece outlines (tab or blank on every
// inner edge), generated deterministically per artwork.

type Pt = [number, number];
type Seg = [Pt, Pt, Pt, Pt]; // cubic: start, c1, c2, end

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One edge from a to b with a tab bulging toward `normal * sign`. */
function edge(a: Pt, b: Pt, sign: number, jitter: number): Seg[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * sign;
  const ny = ux * sign;
  const P = (t: number, h: number): Pt => [a[0] + dx * t + nx * h * len, a[1] + dy * t + ny * h * len];
  if (sign === 0) return [[a, P(1 / 3, 0), P(2 / 3, 0), b]];
  const j = jitter;
  return [
    [a, P(0.18, 0), P(0.3, 0), P(0.37 + j, 0)],
    [P(0.37 + j, 0), P(0.42 + j, 0), P(0.43 + j, 0.06), P(0.4 + j, 0.11)],
    [P(0.4 + j, 0.11), P(0.33 + j, 0.27), P(0.67 + j, 0.27), P(0.6 + j, 0.11)],
    [P(0.6 + j, 0.11), P(0.57 + j, 0.06), P(0.58 + j, 0), P(0.63 + j, 0)],
    [P(0.63 + j, 0), P(0.75, 0), P(0.85, 0), b],
  ];
}

function reverse(segs: Seg[]): Seg[] {
  return segs.slice().reverse().map(([p0, c1, c2, p1]) => [p1, c2, c1, p0] as Seg);
}

export interface Piece {
  index: number;
  row: number;
  col: number;
  path: string;
  /** Cell centre, for animations. */
  cx: number;
  cy: number;
  border: boolean;
}

export function buildJigsaw(id: string, rows: number, cols: number, width: number, height: number): { pieces: Piece[]; order: number[] } {
  const r = rng(hash(id));
  const cw = width / cols;
  const ch = height / rows;
  const pt = (row: number, col: number): Pt => [col * cw, row * ch];
  // horizontal edges h[row][col] at the top of `row`; vertical v[row][col] at the left of `col`
  const h: Seg[][][] = [];
  for (let row = 0; row <= rows; row++) {
    h.push([]);
    for (let col = 0; col < cols; col++) {
      const inner = row > 0 && row < rows;
      h[row].push(edge(pt(row, col), pt(row, col + 1), inner ? (r() > 0.5 ? 1 : -1) : 0, (r() - 0.5) * 0.06));
    }
  }
  const v: Seg[][][] = [];
  for (let row = 0; row < rows; row++) {
    v.push([]);
    for (let col = 0; col <= cols; col++) {
      const inner = col > 0 && col < cols;
      v[row].push(edge(pt(row, col), pt(row + 1, col), inner ? (r() > 0.5 ? 1 : -1) : 0, (r() - 0.5) * 0.06));
    }
  }
  const fmt = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const pieces: Piece[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const segs = [...h[row][col], ...v[row][col + 1], ...reverse(h[row + 1][col]), ...reverse(v[row][col])];
      let d = `M${fmt(segs[0][0])}`;
      for (const [, c1, c2, p1] of segs) d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p1)}`;
      d += 'Z';
      pieces.push({
        index: row * cols + col,
        row,
        col,
        path: d,
        cx: (col + 0.5) * cw,
        cy: (row + 0.5) * ch,
        border: row === 0 || col === 0 || row === rows - 1 || col === cols - 1,
      });
    }
  }
  // the way people assemble: the border first, then inward in loose patches
  const border = pieces.filter((p) => p.border).map((p) => p.index);
  const inner = pieces.filter((p) => !p.border).map((p) => p.index);
  for (let i = inner.length - 1; i > 0; i--) {
    const k = Math.floor(r() * (i + 1));
    [inner[i], inner[k]] = [inner[k], inner[i]];
  }
  const cx = cols / 2;
  const cy = rows / 2;
  inner.sort((a, b) => {
    const pa = pieces[a];
    const pb = pieces[b];
    const da = Math.hypot(pa.col - cx, pa.row - cy) + r() * 3;
    const db = Math.hypot(pb.col - cx, pb.row - cy) + r() * 3;
    return db - da;
  });
  return { pieces, order: [...border, ...inner] };
}
