// Renders figures as small, self-contained SVG. Output contains only shapes
// and Latin digits/letters (no scripts, no external references), so it can be
// shown with <img src="data:image/svg+xml,…"> and embedded in PDFs.
import type { El, Fig, Fill, Pt } from './model.js';

const INK = '#111';
const GREY = '#9a9a9a';
const STROKE = 2.2;

const n1 = (v: number) => {
  const x = Math.round(v * 10) / 10;
  return Object.is(x, -0) ? '0' : String(x);
};

function fillOf(f: Fill) {
  return f === 'black' ? INK : f === 'grey' ? GREY : 'none';
}
function dashOf(d?: 'dash' | 'dot') {
  return d === 'dash' ? ' stroke-dasharray="6 4"' : d === 'dot' ? ' stroke-dasharray="1.5 4" stroke-linecap="round"' : '';
}

/** Elements → SVG markup, `s` px per unit, offset (ox, oy) in px. */
export function renderEls(els: El[], s: number, ox = 0, oy = 0): string {
  const X = (p: Pt) => n1(ox + p[0] * s);
  const Y = (p: Pt) => n1(oy + p[1] * s);
  const out: string[] = [];
  for (const e of els) {
    switch (e.k) {
      case 'line':
        out.push(
          `<line x1="${X(e.a)}" y1="${Y(e.a)}" x2="${X(e.b)}" y2="${Y(e.b)}" stroke="${INK}" stroke-width="${n1(e.w ?? STROKE)}"${dashOf(e.dash)}/>`
        );
        break;
      case 'arrow': {
        const ax = ox + e.a[0] * s,
          ay = oy + e.a[1] * s,
          bx = ox + e.b[0] * s,
          by = oy + e.b[1] * s;
        const ang = Math.atan2(by - ay, bx - ax);
        const h = Math.max(7, s * 0.6);
        const l = [bx - h * Math.cos(ang - 0.45), by - h * Math.sin(ang - 0.45)];
        const r = [bx - h * Math.cos(ang + 0.45), by - h * Math.sin(ang + 0.45)];
        out.push(
          `<line x1="${n1(ax)}" y1="${n1(ay)}" x2="${n1(bx)}" y2="${n1(by)}" stroke="${INK}" stroke-width="${STROKE}"${dashOf(e.dash)}/>`,
          `<polygon points="${n1(bx)},${n1(by)} ${n1(l[0]!)},${n1(l[1]!)} ${n1(r[0]!)},${n1(r[1]!)}" fill="${INK}"/>`
        );
        break;
      }
      case 'poly': {
        const pts = e.pts.map((p) => `${X(p)},${Y(p)}`).join(' ');
        out.push(
          e.closed
            ? `<polygon points="${pts}" fill="${fillOf(e.fill)}" stroke="${INK}" stroke-width="${STROKE}" stroke-linejoin="round"/>`
            : `<polyline points="${pts}" fill="none" stroke="${INK}" stroke-width="${STROKE}" stroke-linejoin="round" stroke-linecap="round"/>`
        );
        break;
      }
      case 'circle':
        out.push(
          `<circle cx="${X(e.c)}" cy="${Y(e.c)}" r="${n1(e.r * s)}" fill="${fillOf(e.fill)}" stroke="${INK}" stroke-width="${STROKE}"${dashOf(e.dash)}/>`
        );
        break;
      case 'sector': {
        const cx = ox + e.c[0] * s,
          cy = oy + e.c[1] * s,
          r = e.r * s;
        const pt = (deg: number) => {
          const a = (deg * Math.PI) / 180;
          return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
        };
        const sweep = (((e.to - e.from) % 360) + 360) % 360;
        const [x1, y1] = pt(e.from);
        const [x2, y2] = pt(e.to);
        out.push(
          `<path d="M${n1(cx)} ${n1(cy)}L${n1(x1)} ${n1(y1)}A${n1(r)} ${n1(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${n1(x2)} ${n1(y2)}Z" fill="${fillOf(
            e.fill
          )}" stroke="${INK}" stroke-width="${STROKE}" stroke-linejoin="round"/>`
        );
        break;
      }
      case 'text': {
        const sx = e.sx ?? 1;
        const sy = e.sy ?? 1;
        const scale = sx === 1 && sy === 1 ? '' : ` scale(${sx} ${sy})`;
        out.push(
          `<text transform="translate(${X(e.at)} ${Y(e.at)})${scale}" font-family="Arial, Helvetica, sans-serif" font-size="${n1(
            e.size * s
          )}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${INK}">${escapeText(e.s)}</text>`
        );
        break;
      }
    }
  }
  return out.join('');
}

function escapeText(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(w: number, h: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n1(w)} ${n1(h)}" width="${n1(w)}" height="${n1(h)}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
}

const BOX = 120;

/** One figure in a framed square box (option figures). */
export function boxSvg(fig: Fig, opts: { px?: number; frame?: boolean } = {}): string {
  const px = opts.px ?? BOX;
  const s = px / fig.size;
  const frame = opts.frame === false ? '' : `<rect x="1" y="1" width="${px - 2}" height="${px - 2}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  return wrap(px, px, frame + renderEls(fig.els, s));
}

export type StripItem = { fig: Fig; label?: string } | { question: true; label?: string } | { sep: string };

/** Problem strip: framed boxes side by side, "?" box, separators like ":" and "::", optional labels below. */
export function stripSvg(items: StripItem[], opts: { px?: number } = {}): string {
  const px = opts.px ?? BOX;
  const sepW = 34;
  const hasLabels = items.some((i) => 'label' in i && i.label);
  const h = px + (hasLabels ? 24 : 0);
  let x = 0;
  const parts: string[] = [];
  for (const item of items) {
    if ('sep' in item) {
      parts.push(
        `<text x="${n1(x + sepW / 2)}" y="${n1(px / 2)}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${INK}">${escapeText(
          item.sep
        )}</text>`
      );
      x += sepW;
      continue;
    }
    parts.push(`<rect x="${n1(x + 1)}" y="1" width="${px - 2}" height="${px - 2}" fill="none" stroke="${INK}" stroke-width="1.6"/>`);
    if ('fig' in item) parts.push(renderEls(item.fig.els, px / item.fig.size, x, 0));
    else
      parts.push(
        `<text x="${n1(x + px / 2)}" y="${n1(px / 2)}" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${INK}">?</text>`
      );
    if (item.label)
      parts.push(
        `<text x="${n1(x + px / 2)}" y="${n1(px + 14)}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${INK}">${escapeText(
          item.label
        )}</text>`
      );
    x += px;
  }
  return wrap(x, h, parts.join(''));
}

/** A figure without a frame, `px` wide (counting figures, Venn diagrams). */
export function plainSvg(fig: Fig, px: number): string {
  return wrap(px, px, renderEls(fig.els, px / fig.size));
}

/** Raw canvas for custom layouts (mirror line next to the figure, etc.). */
export function canvasSvg(w: number, h: number, body: string): string {
  return wrap(w, h, body);
}

export const SVG_STYLE = { INK, STROKE, BOX };
