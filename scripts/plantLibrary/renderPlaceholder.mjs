// PLACEHOLDER renderer for the FOCUS Plant Library.
//
// Draws one plant per file on the exact FOCUS template — same camera,
// same soil horizon at 80% height, same root cutaway below it, same
// upper-left sunbeam, same pool of light at the base, same dark green-teal
// balcony atmosphere — so the app, the catalog and the environment engine can
// be built and tested against 100 files with the final geometry before the
// photorealistic renders exist. These are flat-shaded procedural
// illustrations, deliberately NOT the final art: `generatePlantLibrary.mjs`
// overwrites each file with a real generated image under the same name.
//
// Every silhouette is driven by the manifest (growthForm, rootType, colours),
// so a rose reads as a shrub with red blooms, a palm as a palm, a bonsai as a
// bonsai and the roots differ per species — the brief's "same studio,
// different plant" rule, at placeholder fidelity.
import pureimage from 'pureimage';

// --- colour helpers --------------------------------------------------------

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function lighten(hex, t) {
  return rgbToHex(mix(hexToRgb(hex), [255, 248, 225], t));
}

export function darken(hex, t) {
  return rgbToHex(mix(hexToRgb(hex), [12, 22, 18], t));
}

// --- deterministic randomness ---------------------------------------------

export function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// --- path helpers (pureimage has no ellipse) -------------------------------

const K = 0.5522847498;

function ellipsePath(ctx, cx, cy, rx, ry, rot = 0) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const p = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  ctx.beginPath();
  ctx.moveTo(...p(rx, 0));
  ctx.bezierCurveTo(...p(rx, ry * K), ...p(rx * K, ry), ...p(0, ry));
  ctx.bezierCurveTo(...p(-rx * K, ry), ...p(-rx, ry * K), ...p(-rx, 0));
  ctx.bezierCurveTo(...p(-rx, -ry * K), ...p(-rx * K, -ry), ...p(0, -ry));
  ctx.bezierCurveTo(...p(rx * K, -ry), ...p(rx, -ry * K), ...p(rx, 0));
  ctx.closePath();
}

function fillEllipse(ctx, cx, cy, rx, ry, rot, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ellipsePath(ctx, cx, cy, rx, ry, rot);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A pointed leaf: two mirrored quadratic curves tip-to-base, optionally bent. */
function leafPath(ctx, x0, y0, x1, y1, width) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx + nx, my + ny, x1, y1);
  ctx.quadraticCurveTo(mx - nx, my - ny, x0, y0);
  ctx.closePath();
}

function fillLeaf(ctx, x0, y0, x1, y1, width, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  leafPath(ctx, x0, y0, x1, y1, width);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Shaded leaf: body, a sun-side highlight toward the upper left, a midrib. */
function shadedLeaf(ctx, x0, y0, x1, y1, width, color) {
  fillLeaf(ctx, x0, y0, x1, y1, width, color);
  const hx0 = x0 + (x1 - x0) * 0.15 - width * 0.18;
  const hy0 = y0 + (y1 - y0) * 0.15 - width * 0.22;
  const hx1 = x0 + (x1 - x0) * 0.85 - width * 0.18;
  const hy1 = y0 + (y1 - y0) * 0.85 - width * 0.22;
  fillLeaf(ctx, hx0, hy0, hx1, hy1, width * 0.45, lighten(color, 0.35), 0.5);
  strokeLine(ctx, x0, y0, x1, y1, Math.max(0.6, width * 0.06), darken(color, 0.35), 0.5);
}

function shadedBlob(ctx, cx, cy, rx, ry, rot, color) {
  fillEllipse(ctx, cx, cy, rx, ry, rot, color);
  fillEllipse(ctx, cx - rx * 0.22, cy - ry * 0.28, rx * 0.55, ry * 0.5, rot, lighten(color, 0.35), 0.45);
}

function strokeLine(ctx, x0, y0, x1, y1, width, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** pureimage silently drops quadratic curves from stroke(); flatten into a
 * constant-width filled strip instead. */
function strokeCurve(ctx, x0, y0, cx, cy, x1, y1, width, color, alpha = 1) {
  taper(ctx, x0, y0, cx, cy, x1, y1, width, width, color, alpha, 14);
}

/** Tapered stem/trunk/root drawn as a filled quad strip along a quadratic curve. */
function taper(ctx, x0, y0, cx, cy, x1, y1, w0, w1, color, alpha = 1, segments = 12) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    pts.push([x - (dy / len) * w, y + (dx / len) * w, x + (dy / len) * w, y - (dx / len) * w]);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][2], pts[i][3]);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function flower(ctx, cx, cy, r, color, rng, petals = 5) {
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + rng() * 0.2;
    fillEllipse(ctx, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, r * 0.32, a, color);
  }
  fillEllipse(ctx, cx - r * 0.1, cy - r * 0.1, r * 0.35, r * 0.35, 0, lighten(color, 0.45), 0.8);
  fillEllipse(ctx, cx, cy, r * 0.16, r * 0.16, 0, '#f3d27a');
}

// --- scene: background, beam, pool, soil ---------------------------------

const BG_TOP = hexToRgb('#1f3d37');
const BG_MID = hexToRgb('#16302b');
const BG_BOT = hexToRgb('#0f2320');
const SUN = hexToRgb('#ffe9b8');
const SOIL_TOP = hexToRgb('#5a3f2a');
const SOIL_BOT = hexToRgb('#2b1d13');

export function soilLine(size) {
  return Math.round(size * 0.8);
}

/**
 * Lighting model shared by the background and the soil: a hazy beam from
 * the upper left toward the plant base, a soft elliptical pool at the soil
 * line, a natural falloff into the corners. Returns 0..~1.4 light factor.
 */
function lightAt(x, y, W, H, soilY) {
  // beam: a widening band from (0.32W, -0.1H) down to (0.5W, soilY)
  const bx0 = 0.3 * W;
  const by0 = -0.15 * H;
  const bx1 = 0.5 * W;
  const by1 = soilY;
  const t = Math.max(0, Math.min(1.1, ((x - bx0) * (bx1 - bx0) + (y - by0) * (by1 - by0)) / ((bx1 - bx0) ** 2 + (by1 - by0) ** 2)));
  const px = bx0 + (bx1 - bx0) * t;
  const py = by0 + (by1 - by0) * t;
  const d = Math.hypot(x - px, y - py);
  const halfWidth = 0.09 * W + 0.3 * W * t;
  const beam = Math.exp(-(d * d) / (halfWidth * halfWidth)) * (0.55 + 0.45 * t);
  // pool at the base
  const ex = (x - 0.5 * W) / (0.4 * W);
  const ey = (y - soilY) / (0.075 * H);
  const pool = Math.exp(-(ex * ex + ey * ey));
  // vignette
  const vx = (x - 0.5 * W) / (0.5 * W);
  const vy = (y - 0.5 * H) / (0.5 * H);
  const vig = 1 - 0.42 * Math.min(1, vx * vx + vy * vy);
  return (0.6 + 0.5 * beam + 0.75 * pool) * vig;
}

function paintScene(img, W, H, soilY, rng) {
  for (let y = 0; y < H; y++) {
    const ty = y / H;
    const base = ty < 0.55 ? mix(BG_TOP, BG_MID, ty / 0.55) : mix(BG_MID, BG_BOT, (ty - 0.55) / 0.45);
    for (let x = 0; x < W; x++) {
      const L = lightAt(x, y, W, H, soilY);
      let c;
      if (y < soilY) {
        // soft horizontal haze bands so the balcony reads as a space, not a flat gradient
        const band = 1 + 0.03 * Math.sin(y * 0.021 + x * 0.004) + 0.02 * Math.sin(x * 0.013);
        c = mix(base, SUN, Math.max(0, Math.min(1, (L - 0.6) * 0.55)));
        c = [c[0] * band * L * 0.95, c[1] * band * L * 0.95, c[2] * band * L * 0.9];
      } else {
        const depth = (y - soilY) / (H - soilY);
        const grain = Math.round((hash2(x >> 1, y >> 1) - 0.5) * 3) / 3;
        const crumb = Math.round((hash2(x >> 2, y >> 2) - 0.5) * 3) / 3;
        let s = mix(SOIL_TOP, SOIL_BOT, Math.pow(depth, 0.8));
        const sunlit = Math.max(0, 1 - depth * 3.2) * (L - 0.6);
        s = mix(s, SUN, Math.max(0, sunlit * 0.42));
        const g = 1 + grain * 0.14 + crumb * 0.1;
        c = [s[0] * g * (0.75 + 0.3 * L), s[1] * g * (0.75 + 0.3 * L), s[2] * g * (0.75 + 0.3 * L)];
        if (y - soilY < 3) c = mix(c, SUN, 0.25 * L); // lit crust at the cut line
      }
      img.setPixelRGBA_i(x, y, clamp255(c[0]), clamp255(c[1]), clamp255(c[2]), 255);
    }
  }
  // a few dust motes inside the beam
  const ctx = img.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const t = rng();
    const x = 0.3 * W + 0.2 * W * t + (rng() - 0.5) * (0.12 * W + 0.4 * W * t);
    const y = -0.1 * H + (soilY + 0.1 * H) * t;
    if (y < 0 || y > soilY - 4) continue;
    fillEllipse(ctx, x, y, 1.1 + rng() * 1.4, 1.1 + rng() * 1.4, 0, '#fff3cf', 0.25 + rng() * 0.3);
  }
  // occasional small organic particles in the soil
  for (let i = 0; i < 60; i++) {
    const x = rng() * W;
    const y = soilY + 4 + rng() * (H - soilY - 6);
    fillEllipse(ctx, x, y, 1 + rng() * 2.2, 0.8 + rng() * 1.4, rng() * 3, rng() < 0.5 ? '#6d5236' : '#1d130c', 0.5);
  }
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// --- roots ----------------------------------------------------------------

const ROOT_COLOR = '#9c7a54';

function rootSegment(ctx, x0, y0, x1, y1, w, soilY, H) {
  // fade into the soil with depth
  const depth = ((y0 + y1) / 2 - soilY) / (H - soilY);
  const alpha = Math.max(0.12, 0.85 - depth * 0.9);
  taper(ctx, x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1, w, Math.max(0.5, w * 0.72), ROOT_COLOR, alpha, 3);
}

function growRoot(ctx, rng, x, y, angle, len, w, soilY, H, bottom, branchiness, depthLeft) {
  if (depthLeft <= 0 || len < 2 || w < 0.4) return;
  const nx = x + Math.cos(angle) * len;
  const ny = Math.min(bottom, y + Math.sin(angle) * len);
  rootSegment(ctx, x, y, nx, ny, w, soilY, H);
  if (ny >= bottom - 1) return;
  // continue, wandering slightly
  const next = angle + (rng() - 0.5) * 0.7;
  growRoot(ctx, rng, nx, ny, next, len * 0.86, w * 0.8, soilY, H, bottom, branchiness, depthLeft - 1);
  if (rng() < branchiness) {
    const side = rng() < 0.5 ? -1 : 1;
    growRoot(ctx, rng, nx, ny, angle + side * (0.5 + rng() * 0.7), len * 0.7, w * 0.6, soilY, H, bottom, branchiness * 0.9, depthLeft - 1);
  }
}

function drawRoots(ctx, rng, type, cx, soilY, W, H) {
  const band = H - soilY;
  const bottom = soilY + band * 0.96;
  const crown = soilY + 1;
  const down = Math.PI / 2;
  const fan = (count, spread, len, w, branchiness, depth, maxDepthFrac = 0.96) => {
    const b = soilY + band * maxDepthFrac;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const a = down + t * spread + (rng() - 0.5) * 0.25;
      growRoot(ctx, rng, cx + t * W * 0.06, crown, a, len, w, soilY, H, b, branchiness, depth);
    }
  };
  switch (type) {
    case 'taproot':
      taper(ctx, cx, crown, cx + W * 0.01, soilY + band * 0.5, cx + (rng() - 0.5) * W * 0.03, bottom, W * 0.03, W * 0.004, ROOT_COLOR, 0.7);
      fan(5, 2.4, band * 0.22, W * 0.006, 0.4, 5, 0.7);
      break;
    case 'woody':
      fan(5, 2.5, band * 0.32, W * 0.02, 0.55, 5);
      fan(9, 2.2, band * 0.16, W * 0.004, 0.5, 4);
      break;
    case 'fine-branching':
      fan(7, 2.3, band * 0.26, W * 0.007, 0.9, 6);
      break;
    case 'adventitious':
      fan(6, 2.0, band * 0.24, W * 0.006, 0.6, 5);
      for (let i = 0; i < 5; i++) {
        const x = cx + (rng() - 0.5) * W * 0.3;
        growRoot(ctx, rng, x, crown, down + (rng() - 0.5) * 1.2, band * 0.16, W * 0.004, soilY, H, bottom, 0.4, 4);
      }
      break;
    case 'rhizome': {
      for (const side of [-1, 1]) {
        const len = W * (0.14 + rng() * 0.08);
        taper(ctx, cx, soilY + band * 0.12, cx + side * len * 0.5, soilY + band * 0.1, cx + side * len, soilY + band * 0.15, W * 0.028, W * 0.018, '#b08a5c', 0.8);
        for (let i = 1; i <= 4; i++) {
          growRoot(ctx, rng, cx + side * len * (i / 4), soilY + band * 0.16, down + (rng() - 0.5) * 0.8, band * 0.2, W * 0.005, soilY, H, bottom, 0.5, 4);
        }
      }
      fan(5, 1.6, band * 0.25, W * 0.006, 0.5, 5);
      break;
    }
    case 'shallow':
      fan(11, 3.0, band * 0.12, W * 0.005, 0.5, 5, 0.5);
      break;
    case 'compact':
      fan(13, 2.6, band * 0.1, W * 0.006, 0.9, 5, 0.55);
      fan(7, 1.8, band * 0.08, W * 0.004, 0.9, 4, 0.5);
      break;
    case 'tuberous':
      for (let i = 0; i < 4; i++) {
        const x = cx + (i - 1.5) * W * 0.07 + (rng() - 0.5) * W * 0.03;
        const y = soilY + band * (0.3 + rng() * 0.25);
        strokeLine(ctx, cx, crown, x, y - band * 0.08, W * 0.005, ROOT_COLOR, 0.7);
        fillEllipse(ctx, x, y, W * 0.028, band * 0.12, (rng() - 0.5) * 0.6, '#b5905f', 0.85);
        fillEllipse(ctx, x - W * 0.008, y - band * 0.03, W * 0.012, band * 0.05, 0, '#d1ad78', 0.5);
        growRoot(ctx, rng, x, y + band * 0.1, down + (rng() - 0.5) * 0.8, band * 0.12, W * 0.003, soilY, H, bottom, 0.4, 3);
      }
      fan(6, 2.2, band * 0.2, W * 0.004, 0.5, 4);
      break;
    case 'fleshy':
      fan(6, 2.2, band * 0.28, W * 0.018, 0.3, 4);
      break;
    case 'bulb':
      fillEllipse(ctx, cx, soilY + band * 0.17, W * 0.05, band * 0.17, 0, '#c9a773', 0.9);
      fillEllipse(ctx, cx - W * 0.015, soilY + band * 0.12, W * 0.02, band * 0.08, 0, '#e3c995', 0.5);
      for (let i = 0; i < 9; i++) {
        const t = i / 8 - 0.5;
        growRoot(ctx, rng, cx + t * W * 0.07, soilY + band * 0.33, down + t * 1.6, band * 0.16, W * 0.004, soilY, H, bottom, 0.3, 4);
      }
      break;
    case 'fibrous':
    default:
      fan(14, 2.8, band * 0.2, W * 0.004, 0.7, 6);
      break;
  }
}

// --- plants -----------------------------------------------------------------

/**
 * Each form draws into a box: centre x `cx`, base at `baseY` (the soil
 * line), at most `h` tall and `w` wide. Colours and randomness come from the
 * manifest row, so the same species always renders the same way.
 */
const FORMS = {
  shrub(ctx, rng, p, b) {
    const stems = 5;
    for (let i = 0; i < stems; i++) {
      const t = i / (stems - 1) - 0.5;
      const topX = b.cx + t * b.w * 0.75;
      const topY = b.baseY - b.h * (0.6 + rng() * 0.35);
      taper(ctx, b.cx + t * b.w * 0.1, b.baseY, b.cx + t * b.w * 0.5, b.baseY - b.h * 0.4, topX, topY, b.w * 0.022, b.w * 0.008, '#4d3a26');
      for (let k = 1; k <= 6; k++) {
        const s = k / 6;
        const x = b.cx + t * b.w * 0.1 + (topX - b.cx - t * b.w * 0.1) * s;
        const y = b.baseY + (topY - b.baseY) * s;
        const side = k % 2 ? -1 : 1;
        shadedLeaf(ctx, x, y, x + side * b.w * 0.11, y - b.h * 0.05 + rng() * 6, b.w * 0.035, p.leafColor);
      }
      if (p.accentColor) flower(ctx, topX, topY, b.w * (0.055 + rng() * 0.02), p.accentColor, rng, 6);
    }
  },
  bushy(ctx, rng, p, b) {
    const rx = b.w * 0.42;
    const ry = b.h * 0.42;
    const cy = b.baseY - ry * 0.95;
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      const x = b.cx + Math.cos(a) * rx * r;
      const y = cy + Math.sin(a) * ry * r;
      if (y > b.baseY - 2) continue;
      const ang = Math.atan2(y - cy, x - b.cx);
      const shade = darken(p.leafColor, 0.35 * (1 - r) * (y > cy ? 1 : 0.3));
      shadedLeaf(ctx, x, y, x + Math.cos(ang) * b.w * 0.09, y + Math.sin(ang) * b.h * 0.07, b.w * 0.028, r > 0.5 ? p.leafColor : shade);
    }
    if (p.accentColor) {
      for (let i = 0; i < 9; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 0.85;
        flower(ctx, b.cx + Math.cos(a) * rx * r, cy - ry * 0.15 + Math.sin(a) * ry * r * 0.8, b.w * (0.035 + rng() * 0.02), p.accentColor, rng, 6);
      }
    }
  },
  vine(ctx, rng, p, b) {
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const reach = b.w * (0.3 + rng() * 0.2) * side;
      const peak = b.h * (0.55 + rng() * 0.4);
      const cxp = b.cx + reach * 0.25;
      const cyp = b.baseY - peak * 1.35;
      const endX = b.cx + reach;
      const endY = b.baseY - b.h * 0.08 - rng() * b.h * 0.2;
      strokeCurve(ctx, b.cx, b.baseY, cxp, cyp, endX, endY, b.w * 0.009, '#5a7a3e');
      for (let k = 1; k <= 7; k++) {
        const t = k / 7;
        const x = (1 - t) * (1 - t) * b.cx + 2 * (1 - t) * t * cxp + t * t * endX;
        const y = (1 - t) * (1 - t) * b.baseY + 2 * (1 - t) * t * cyp + t * t * endY;
        const dir = k % 2 ? -1 : 1;
        const lx = x + dir * b.w * 0.09;
        const ly = y + b.h * 0.07;
        shadedLeaf(ctx, x, y, lx, ly, b.w * 0.045, p.leafColor);
        fillEllipse(ctx, x + dir * b.w * 0.04, y + b.h * 0.025, b.w * 0.03, b.w * 0.022, 0.4 * dir, p.leafColor);
        if (p.accentColor && rng() < 0.45) flower(ctx, x + dir * b.w * 0.05, y - b.h * 0.02, b.w * 0.03, p.accentColor, rng, 5);
      }
    }
  },
  trailing(ctx, rng, p, b) {
    const tuft = b.w * 0.2;
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + (i / 11) * Math.PI;
      shadedLeaf(ctx, b.cx, b.baseY, b.cx + Math.cos(a) * tuft, b.baseY + Math.sin(a) * tuft * 1.1, b.w * 0.03, p.leafColor);
    }
    for (let i = 0; i < 11; i++) {
      const side = i % 2 ? 1 : -1;
      const len = b.w * (0.22 + rng() * 0.3);
      const rise = b.h * (0.3 + rng() * 0.5);
      const endX = b.cx + side * len;
      const steps = 14;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const x = b.cx + side * len * t;
        const y = b.baseY - rise * Math.sin(t * Math.PI) * (1 - t * 0.35) - 1;
        if (k > 1) strokeLine(ctx, b.cx + side * len * ((k - 1) / steps), b.baseY - rise * Math.sin(((k - 1) / steps) * Math.PI) * (1 - ((k - 1) / steps) * 0.35) - 1, x, y, 1.2, '#6a8a5a');
        shadedBlob(ctx, x, y, b.w * 0.022, b.w * 0.02, 0, p.leafColor);
      }
      if (p.accentColor && rng() < 0.4) fillEllipse(ctx, endX, b.baseY - 2, b.w * 0.012, b.w * 0.012, 0, p.accentColor);
    }
  },
  rosette(ctx, rng, p, b) {
    const layers = 3;
    for (let l = layers - 1; l >= 0; l--) {
      const count = 7 + l * 3;
      const len = b.h * (0.3 + l * 0.22);
      for (let i = 0; i < count; i++) {
        const a = -Math.PI + (i / (count - 1)) * Math.PI + (rng() - 0.5) * 0.1;
        const spread = Math.cos(a) * b.w * 0.45 * (0.5 + l * 0.25);
        const up = Math.abs(Math.sin(a)) * len + len * 0.25;
        const color = l === layers - 1 ? darken(p.leafColor, 0.25) : l === 0 ? lighten(p.leafColor, 0.12) : p.leafColor;
        shadedLeaf(ctx, b.cx, b.baseY, b.cx + spread, b.baseY - up, b.w * (0.05 - l * 0.008), color);
      }
    }
    if (p.accentColor) {
      for (let i = 0; i < 3; i++) {
        const x = b.cx + (i - 1) * b.w * 0.2;
        const topY = b.baseY - b.h * (0.8 + rng() * 0.15);
        strokeCurve(ctx, b.cx, b.baseY - b.h * 0.1, x, b.baseY - b.h * 0.5, x, topY, b.w * 0.008, '#4f7a3c');
        flower(ctx, x, topY, b.w * 0.06, p.accentColor, rng, 8);
      }
    }
  },
  blades(ctx, rng, p, b) {
    const count = 9;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1) - 0.5;
      const x1 = b.cx + t * b.w * 0.7;
      const y1 = b.baseY - b.h * (0.55 + (1 - Math.abs(t) * 1.4) * 0.4 + rng() * 0.05);
      const color = i % 2 ? p.leafColor : darken(p.leafColor, 0.18);
      shadedLeaf(ctx, b.cx + t * b.w * 0.12, b.baseY, x1, y1, b.w * 0.042, color);
      // banding typical of snake plant / strap leaves
      for (let k = 1; k < 6; k++) {
        const s = k / 6;
        strokeLine(ctx, b.cx + t * b.w * 0.12 + (x1 - b.cx - t * b.w * 0.12) * s - 4, b.baseY + (y1 - b.baseY) * s, b.cx + t * b.w * 0.12 + (x1 - b.cx - t * b.w * 0.12) * s + 4, b.baseY + (y1 - b.baseY) * s, 1, lighten(color, 0.25), 0.35);
      }
    }
    if (p.accentColor) {
      const topY = b.baseY - b.h * 0.98;
      strokeLine(ctx, b.cx, b.baseY, b.cx, topY + b.h * 0.1, b.w * 0.012, '#5c8a44');
      for (let i = 0; i < 4; i++) flower(ctx, b.cx + (i % 2 ? 1 : -1) * b.w * 0.05, topY + i * b.h * 0.045, b.w * 0.045, p.accentColor, rng, 6);
    }
  },
  grass(ctx, rng, p, b) {
    for (let i = 0; i < 46; i++) {
      const t = rng() - 0.5;
      const side = t < 0 ? -1 : 1;
      const len = b.h * (0.45 + rng() * 0.5);
      const bend = b.w * (0.15 + Math.abs(t) * 0.7) * side;
      const color = rng() < 0.5 ? p.leafColor : lighten(p.leafColor, 0.18);
      strokeCurve(ctx, b.cx + t * b.w * 0.14, b.baseY, b.cx + t * b.w * 0.14 + bend * 0.25, b.baseY - len * 1.05, b.cx + bend, b.baseY - len * 0.45, b.w * 0.012, color);
    }
    fillEllipse(ctx, b.cx, b.baseY - 3, b.w * 0.09, b.h * 0.03, 0, lighten(p.leafColor, 0.3), 0.8);
  },
  broadleaf(ctx, rng, p, b) {
    const leaves = 6;
    for (let i = 0; i < leaves; i++) {
      const t = i / (leaves - 1) - 0.5;
      const tipX = b.cx + t * b.w * 0.85;
      const tipY = b.baseY - b.h * (0.55 + (1 - Math.abs(t) * 1.3) * 0.4);
      strokeCurve(ctx, b.cx, b.baseY, b.cx + t * b.w * 0.2, b.baseY - b.h * 0.35, tipX, tipY, b.w * 0.014, '#4a6e3a');
      const rot = Math.atan2(tipY - (b.baseY - b.h * 0.3), tipX - b.cx);
      shadedBlob(ctx, tipX, tipY, b.w * 0.16, b.w * 0.1, rot, i % 2 ? p.leafColor : darken(p.leafColor, 0.15));
      strokeLine(ctx, tipX - Math.cos(rot) * b.w * 0.14, tipY - Math.sin(rot) * b.w * 0.14, tipX + Math.cos(rot) * b.w * 0.14, tipY + Math.sin(rot) * b.w * 0.14, 1.2, lighten(p.leafColor, 0.4), 0.6);
      if (p.name.startsWith('Monstera')) {
        for (let k = 0; k < 4; k++) fillEllipse(ctx, tipX + Math.cos(rot) * b.w * (k - 1.5) * 0.06, tipY + Math.sin(rot) * b.w * (k - 1.5) * 0.06 + (k % 2 ? 1 : -1) * b.w * 0.045, b.w * 0.02, b.w * 0.012, rot, '#16302b', 0.9);
      }
    }
    if (p.accentColor) flower(ctx, b.cx + b.w * 0.05, b.baseY - b.h * 0.9, b.w * 0.07, p.accentColor, rng, 5);
  },
  palm(ctx, rng, p, b) {
    const trunkTop = b.baseY - b.h * 0.45;
    taper(ctx, b.cx, b.baseY, b.cx + b.w * 0.02, b.baseY - b.h * 0.25, b.cx, trunkTop, b.w * 0.05, b.w * 0.03, '#8a6a46');
    for (let k = 0; k < 7; k++) strokeLine(ctx, b.cx - b.w * 0.024, trunkTop + k * b.h * 0.06, b.cx + b.w * 0.022, trunkTop + k * b.h * 0.06 + 2, 1.2, '#5c4530', 0.6);
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI * 0.95 + (i / (fronds - 1)) * Math.PI * 0.9;
      const len = b.h * 0.5;
      const endX = b.cx + Math.cos(a) * b.w * 0.5;
      const endY = trunkTop + Math.sin(a) * len * 0.55 + len * 0.1;
      const cxp = b.cx + Math.cos(a) * b.w * 0.25;
      const cyp = trunkTop - len * 0.5 + Math.sin(a) * len * 0.3;
      const color = i % 2 ? p.leafColor : darken(p.leafColor, 0.2);
      strokeCurve(ctx, b.cx, trunkTop, cxp, cyp, endX, endY, b.w * 0.008, darken(color, 0.3));
      for (let k = 1; k <= 11; k++) {
        const t = k / 12;
        const x = (1 - t) * (1 - t) * b.cx + 2 * (1 - t) * t * cxp + t * t * endX;
        const y = (1 - t) * (1 - t) * trunkTop + 2 * (1 - t) * t * cyp + t * t * endY;
        const dx = 2 * (1 - t) * (cxp - b.cx) + 2 * t * (endX - cxp);
        const dy = 2 * (1 - t) * (cyp - trunkTop) + 2 * t * (endY - cyp);
        const n = Math.hypot(dx, dy) || 1;
        const pin = b.w * 0.07 * (1 - t * 0.5);
        fillLeaf(ctx, x, y, x - (dy / n) * pin + (dx / n) * pin * 0.4, y + (dx / n) * pin + (dy / n) * pin * 0.4, b.w * 0.012, color);
        fillLeaf(ctx, x, y, x + (dy / n) * pin + (dx / n) * pin * 0.4, y - (dx / n) * pin + (dy / n) * pin * 0.4, b.w * 0.012, lighten(color, 0.12));
      }
    }
  },
  tree(ctx, rng, p, b) {
    const trunkTop = b.baseY - b.h * 0.5;
    taper(ctx, b.cx, b.baseY, b.cx + b.w * 0.015, b.baseY - b.h * 0.3, b.cx, trunkTop, b.w * 0.06, b.w * 0.03, '#6b4e34');
    taper(ctx, b.cx - b.w * 0.02, b.baseY, b.cx - b.w * 0.04, b.baseY - b.h * 0.12, b.cx - b.w * 0.035, trunkTop + b.h * 0.1, b.w * 0.02, b.w * 0.012, '#7a5a3c', 0.6);
    for (const [dx, dy] of [[-0.28, 0.1], [0.3, 0.08], [-0.1, -0.1], [0.12, -0.14]]) {
      taper(ctx, b.cx, trunkTop, b.cx + dx * b.w * 0.5, trunkTop - b.h * 0.15, b.cx + dx * b.w, trunkTop - b.h * 0.25 + dy * b.h, b.w * 0.024, b.w * 0.008, '#6b4e34');
    }
    const canopyY = trunkTop - b.h * 0.2;
    const blobs = [[0, -0.1, 0.3], [-0.3, 0.02, 0.24], [0.3, 0.0, 0.25], [-0.15, -0.25, 0.22], [0.17, -0.27, 0.22], [0, 0.12, 0.26]];
    for (const [bx, by, r] of blobs) {
      shadedBlob(ctx, b.cx + bx * b.w, canopyY + by * b.h, r * b.w * 0.5, r * b.h * 0.42, 0, by < -0.2 ? lighten(p.leafColor, 0.1) : by > 0.1 ? darken(p.leafColor, 0.2) : p.leafColor);
    }
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      const x = b.cx + Math.cos(a) * b.w * 0.42 * r;
      const y = canopyY + Math.sin(a) * b.h * 0.26 * r;
      shadedLeaf(ctx, x, y, x + (rng() - 0.5) * b.w * 0.08, y + rng() * b.h * 0.05, b.w * 0.016, rng() < 0.5 ? p.leafColor : lighten(p.leafColor, 0.15));
    }
    if (p.accentColor) {
      for (let i = 0; i < 7; i++) {
        const a = rng() * Math.PI * 2;
        const r = 0.4 + Math.sqrt(rng()) * 0.5;
        shadedBlob(ctx, b.cx + Math.cos(a) * b.w * 0.4 * r, canopyY + Math.sin(a) * b.h * 0.24 * r, b.w * 0.022, b.w * 0.022, 0, p.accentColor);
      }
    }
  },
  bonsai(ctx, rng, p, b) {
    const h = b.h * 0.8;
    const base = b.baseY;
    // flared, tapered, curving trunk
    taper(ctx, b.cx, base, b.cx - b.w * 0.12, base - h * 0.3, b.cx + b.w * 0.06, base - h * 0.55, b.w * 0.11, b.w * 0.035, '#5a3f2b');
    taper(ctx, b.cx - b.w * 0.05, base, b.cx - b.w * 0.14, base - h * 0.02, b.cx - b.w * 0.2, base, b.w * 0.04, b.w * 0.01, '#5a3f2b'); // surface root
    taper(ctx, b.cx + b.w * 0.05, base, b.cx + b.w * 0.14, base - h * 0.02, b.cx + b.w * 0.22, base, b.w * 0.04, b.w * 0.01, '#5a3f2b');
    const pads = [
      [b.cx - b.w * 0.02, base - h * 0.38, -0.32, 0.26, 0.09],
      [b.cx + b.w * 0.03, base - h * 0.5, 0.34, 0.25, 0.09],
      [b.cx + b.w * 0.06, base - h * 0.55, 0.0, 0.3, 0.1],
    ];
    for (const [sx, sy, dx, rx, ry] of pads) {
      const px = sx + dx * b.w;
      const py = sy - h * 0.14;
      taper(ctx, sx, sy, sx + dx * b.w * 0.5, sy - h * 0.06, px, py, b.w * 0.028, b.w * 0.008, '#5a3f2b');
      shadedBlob(ctx, px, py, rx * b.w, ry * b.h, 0, p.leafColor);
      fillEllipse(ctx, px, py + ry * b.h * 0.55, rx * b.w * 0.9, ry * b.h * 0.45, 0, darken(p.leafColor, 0.3), 0.8);
      for (let i = 0; i < 26; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng());
        const x = px + Math.cos(a) * rx * b.w * r;
        const y = py + Math.sin(a) * ry * b.h * r;
        shadedLeaf(ctx, x, y, x + (rng() - 0.5) * b.w * 0.04, y + rng() * b.h * 0.02, b.w * 0.009, rng() < 0.5 ? p.leafColor : lighten(p.leafColor, 0.18));
        if (p.accentColor && rng() < 0.25) fillEllipse(ctx, x, y, b.w * 0.01, b.w * 0.01, 0, p.accentColor);
      }
    }
  },
  fern(ctx, rng, p, b) {
    const fronds = 11;
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI + (i / (fronds - 1)) * Math.PI;
      const len = b.h * (0.5 + Math.abs(Math.sin(a)) * 0.45);
      const endX = b.cx + Math.cos(a) * b.w * 0.5;
      const endY = b.baseY - Math.abs(Math.sin(a)) * len * 0.8 + b.h * 0.02;
      const cxp = b.cx + Math.cos(a) * b.w * 0.18;
      const cyp = b.baseY - len * 0.95;
      const color = i % 2 ? p.leafColor : lighten(p.leafColor, 0.12);
      strokeCurve(ctx, b.cx, b.baseY, cxp, cyp, endX, endY, b.w * 0.006, darken(color, 0.35));
      const wide = p.name.includes('Nest');
      for (let k = 1; k <= 13; k++) {
        const t = k / 14;
        const x = (1 - t) * (1 - t) * b.cx + 2 * (1 - t) * t * cxp + t * t * endX;
        const y = (1 - t) * (1 - t) * b.baseY + 2 * (1 - t) * t * cyp + t * t * endY;
        const dx = 2 * (1 - t) * (cxp - b.cx) + 2 * t * (endX - cxp);
        const dy = 2 * (1 - t) * (cyp - b.baseY) + 2 * t * (endY - cyp);
        const n = Math.hypot(dx, dy) || 1;
        const pin = (wide ? b.w * 0.05 : b.w * 0.045) * Math.sin(t * Math.PI) + b.w * 0.01;
        fillLeaf(ctx, x, y, x - (dy / n) * pin, y + (dx / n) * pin, wide ? b.w * 0.03 : b.w * 0.01, color);
        fillLeaf(ctx, x, y, x + (dy / n) * pin, y - (dx / n) * pin, wide ? b.w * 0.03 : b.w * 0.01, lighten(color, 0.1));
      }
    }
  },
  cactusPad(ctx, rng, p, b) {
    const pads = [
      [b.cx, b.baseY - b.h * 0.2, 0.17, 0.22, 0],
      [b.cx - b.w * 0.17, b.baseY - b.h * 0.5, 0.14, 0.18, -0.5],
      [b.cx + b.w * 0.16, b.baseY - b.h * 0.52, 0.14, 0.18, 0.45],
      [b.cx - b.w * 0.05, b.baseY - b.h * 0.78, 0.12, 0.15, -0.15],
    ];
    for (const [x, y, rx, ry, rot] of pads) {
      shadedBlob(ctx, x, y, rx * b.w, ry * b.h, rot, p.leafColor);
      for (let i = 0; i < 14; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 0.85;
        const sx = x + Math.cos(a) * rx * b.w * r;
        const sy = y + Math.sin(a) * ry * b.h * r;
        fillEllipse(ctx, sx, sy, 1.6, 1.6, 0, '#e8dcb8', 0.9);
        strokeLine(ctx, sx - 3, sy - 3, sx + 3, sy + 3, 0.8, '#f4ecd0', 0.7);
      }
    }
    if (p.accentColor) flower(ctx, b.cx - b.w * 0.05, b.baseY - b.h * 0.95, b.w * 0.055, p.accentColor, rng, 8);
  },
  cactusSegment(ctx, rng, p, b) {
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const a = -Math.PI / 2 + side * (0.2 + (i / 8) * 1.2);
      let x = b.cx;
      let y = b.baseY;
      for (let k = 0; k < 6; k++) {
        const len = b.h * 0.12;
        const ang = a + (k - 2) * 0.14 * side;
        const nx = x + Math.cos(ang) * len;
        const ny = y + Math.sin(ang) * len;
        shadedBlob(ctx, (x + nx) / 2, (y + ny) / 2, len * 0.55, b.w * 0.03, ang, k % 2 ? p.leafColor : darken(p.leafColor, 0.12));
        x = nx;
        y = ny;
      }
      if (p.accentColor) flower(ctx, x, y, b.w * 0.035, p.accentColor, rng, 6);
    }
  },
  caudex(ctx, rng, p, b) {
    // swollen base
    ctx.fillStyle = '#9a8468';
    ctx.beginPath();
    ctx.moveTo(b.cx - b.w * 0.22, b.baseY);
    ctx.bezierCurveTo(b.cx - b.w * 0.26, b.baseY - b.h * 0.25, b.cx - b.w * 0.1, b.baseY - b.h * 0.35, b.cx - b.w * 0.05, b.baseY - b.h * 0.45);
    ctx.lineTo(b.cx + b.w * 0.05, b.baseY - b.h * 0.45);
    ctx.bezierCurveTo(b.cx + b.w * 0.1, b.baseY - b.h * 0.35, b.cx + b.w * 0.26, b.baseY - b.h * 0.25, b.cx + b.w * 0.22, b.baseY);
    ctx.closePath();
    ctx.fill();
    fillEllipse(ctx, b.cx - b.w * 0.08, b.baseY - b.h * 0.22, b.w * 0.06, b.h * 0.12, 0, '#c6b092', 0.5);
    for (const dx of [-0.3, 0, 0.3]) {
      const tx = b.cx + dx * b.w;
      const ty = b.baseY - b.h * (0.85 + Math.abs(dx) * 0.1);
      taper(ctx, b.cx + dx * b.w * 0.15, b.baseY - b.h * 0.45, b.cx + dx * b.w * 0.6, b.baseY - b.h * 0.62, tx, ty, b.w * 0.035, b.w * 0.014, '#8a7458');
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 5 - 0.5) * 2.4;
        shadedLeaf(ctx, tx, ty, tx + Math.cos(a) * b.w * 0.1, ty + Math.sin(a) * b.h * 0.08, b.w * 0.028, p.leafColor);
      }
      if (p.accentColor) flower(ctx, tx, ty - b.h * 0.03, b.w * 0.05, p.accentColor, rng, 5);
    }
  },
  feather(ctx, rng, p, b) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6 - 0.5;
      const endX = b.cx + t * b.w * 0.95;
      const endY = b.baseY - b.h * (0.5 + (1 - Math.abs(t) * 1.3) * 0.45);
      const cxp = b.cx + t * b.w * 0.2;
      const cyp = b.baseY - b.h * 0.6;
      strokeCurve(ctx, b.cx, b.baseY, cxp, cyp, endX, endY, b.w * 0.012, darken(p.leafColor, 0.2));
      for (let k = 2; k <= 9; k++) {
        const s = k / 10;
        const x = (1 - s) * (1 - s) * b.cx + 2 * (1 - s) * s * cxp + s * s * endX;
        const y = (1 - s) * (1 - s) * b.baseY + 2 * (1 - s) * s * cyp + s * s * endY;
        const dx = 2 * (1 - s) * (cxp - b.cx) + 2 * s * (endX - cxp);
        const dy = 2 * (1 - s) * (cyp - b.baseY) + 2 * s * (endY - cyp);
        const n = Math.hypot(dx, dy) || 1;
        const L = b.w * 0.06;
        shadedLeaf(ctx, x, y, x - (dy / n) * L + (dx / n) * L * 0.5, y + (dx / n) * L + (dy / n) * L * 0.5, b.w * 0.02, p.leafColor);
        shadedLeaf(ctx, x, y, x + (dy / n) * L + (dx / n) * L * 0.5, y - (dx / n) * L + (dy / n) * L * 0.5, b.w * 0.02, lighten(p.leafColor, 0.1));
      }
    }
  },
  cane(ctx, rng, p, b) {
    const canes = 3;
    for (let i = 0; i < canes; i++) {
      const t = i / (canes - 1) - 0.5;
      const x = b.cx + t * b.w * 0.3;
      const topY = b.baseY - b.h * (0.55 + Math.abs(t) * -0.2 + rng() * 0.25);
      taper(ctx, x, b.baseY, x + t * b.w * 0.05, (b.baseY + topY) / 2, x + t * b.w * 0.08, topY, b.w * 0.03, b.w * 0.022, p.name.includes('Lucky') ? '#7fae57' : '#8a6a46');
      for (let k = 1; k < 6; k++) strokeLine(ctx, x - b.w * 0.015 + t * b.w * 0.05 * (k / 6), b.baseY + (topY - b.baseY) * (k / 6), x + b.w * 0.015 + t * b.w * 0.05 * (k / 6), b.baseY + (topY - b.baseY) * (k / 6), 1.4, '#3f2f20', 0.5);
      const tipX = x + t * b.w * 0.08;
      for (let k = 0; k < 12; k++) {
        const a = -Math.PI * 0.95 + (k / 11) * Math.PI * 0.9;
        const len = b.h * 0.3;
        shadedLeaf(ctx, tipX, topY, tipX + Math.cos(a) * b.w * 0.26, topY + Math.sin(a) * len * 0.5 + len * 0.1, b.w * 0.022, k % 2 ? p.leafColor : (p.accentColor && !p.name.includes('Lucky') ? mixHex(p.leafColor, p.accentColor, 0.35) : darken(p.leafColor, 0.15)));
      }
    }
  },
  conifer(ctx, rng, p, b) {
    taper(ctx, b.cx, b.baseY, b.cx, b.baseY - b.h * 0.5, b.cx, b.baseY - b.h * 0.98, b.w * 0.04, b.w * 0.008, '#6b4e34');
    const tiers = 7;
    for (let i = 0; i < tiers; i++) {
      const y = b.baseY - b.h * (0.12 + (i / (tiers - 1)) * 0.78);
      const span = b.w * 0.5 * (1 - i / tiers) + b.w * 0.05;
      for (const side of [-1, 1]) {
        const endX = b.cx + side * span;
        const endY = y - b.h * 0.03 + (i / tiers) * b.h * 0.02;
        strokeCurve(ctx, b.cx, y, b.cx + side * span * 0.5, y + b.h * 0.025, endX, endY, b.w * 0.008, '#5a4330');
        for (let k = 1; k <= 8; k++) {
          const t = k / 9;
          const x = b.cx + side * span * t;
          const yy = y + b.h * 0.012 * Math.sin(t * Math.PI) - (endY - y) * -t;
          const n = b.w * 0.04 * (1 - t * 0.4);
          fillLeaf(ctx, x, yy, x + side * n * 0.5, yy - n, b.w * 0.012, i % 2 ? p.leafColor : lighten(p.leafColor, 0.12));
          fillLeaf(ctx, x, yy, x + side * n * 0.5, yy + n, b.w * 0.012, darken(p.leafColor, 0.15));
        }
      }
    }
  },
};

function mixHex(a, b, t) {
  return rgbToHex(mix(hexToRgb(a), hexToRgb(b), t));
}

export const GROWTH_FORMS = Object.keys(FORMS);

/** Render one plant to a pureimage bitmap. `size` is the square edge in px. */
export function renderPlant(plant, size = 512) {
  const W = size;
  const H = size;
  const soilY = soilLine(size);
  const rng = seeded(plant.id * 7919 + 17);
  const img = pureimage.make(W, H);
  paintScene(img, W, H, soilY, rng);
  const ctx = img.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  drawRoots(ctx, rng, plant.rootType, W / 2, soilY, W, H);

  // soft contact shadow on the soil surface, offset away from the sun
  fillEllipse(ctx, W * 0.53, soilY + 2, W * 0.16, 3, 0, '#1a120b', 0.28);

  const box = { cx: W / 2, baseY: soilY - 1, w: W * 0.66, h: H * 0.66 };
  const draw = FORMS[plant.growthForm] ?? FORMS.bushy;
  draw(ctx, rng, plant, box);

  return img;
}

export async function writePng(img, outPath) {
  const fs = await import('node:fs');
  const stream = fs.createWriteStream(outPath);
  await pureimage.encodePNGToStream(img, stream);
}
