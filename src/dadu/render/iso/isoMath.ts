// Isometric (2:1 dimetric) projection used by every world scene. Pure maths,
// unit tested. World tiles are 64 × 32 screen px at zoom 1; `z` is height in
// screen px above the floor. See docs/dadu/HYBRID_CAMERA_ARCHITECTURE.md.
export const TILE_W = 64;
export const TILE_H = 32;

export interface ScreenPoint { sx: number; sy: number }
export interface Tile { x: number; y: number }

/** Centre of a tile's top face (x grows to the south-east, y to the south-west). */
export function tileToScreen(x: number, y: number, z = 0): ScreenPoint {
  return { sx: (x - y) * (TILE_W / 2), sy: (x + y) * (TILE_H / 2) - z };
}

/** Inverse of tileToScreen for z = 0; returns fractional tile coordinates. */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const x = (sy / (TILE_H / 2) + sx / (TILE_W / 2)) / 2;
  const y = (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2;
  return { x, y };
}

export function screenToTileRounded(sx: number, sy: number): Tile {
  const { x, y } = screenToTile(sx, sy);
  return { x: Math.floor(x + 0.5), y: Math.floor(y + 0.5) };
}

/** Painter's order: objects further "south" (larger x + y) draw later; `zBias` breaks ties (floor < rug < furniture < character). */
export function depthKey(x: number, y: number, zBias = 0): number {
  return (x + y) * 10 + zBias;
}

/** Diamond outline of a tile's top face as an SVG points string. */
export function tilePolygon(x: number, y: number, z = 0): string {
  const { sx, sy } = tileToScreen(x, y, z);
  return `${sx},${sy - TILE_H / 2} ${sx + TILE_W / 2},${sy} ${sx},${sy + TILE_H / 2} ${sx - TILE_W / 2},${sy}`;
}

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }

/** Screen-space bounds of a w × d tile floor plus `wallHeight` px of walls above it. */
export function sceneBounds(w: number, d: number, wallHeight = 0): Bounds {
  const corners = [tileToScreen(0, 0), tileToScreen(w - 1, 0), tileToScreen(0, d - 1), tileToScreen(w - 1, d - 1)];
  const minX = Math.min(...corners.map((c) => c.sx)) - TILE_W / 2;
  const maxX = Math.max(...corners.map((c) => c.sx)) + TILE_W / 2;
  const minY = Math.min(...corners.map((c) => c.sy)) - TILE_H / 2 - wallHeight;
  const maxY = Math.max(...corners.map((c) => c.sy)) + TILE_H / 2;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Zoom that fits the bounds inside a viewport with padding, clamped so phones stay readable. */
export function fitZoom(b: Bounds, viewportW: number, viewportH: number, padding = 16, min = 0.45, max = 2): number {
  const z = Math.min((viewportW - padding * 2) / b.width, (viewportH - padding * 2) / b.height);
  return Math.max(min, Math.min(max, z));
}

/** Camera offset (translate) that centres the bounds in the viewport at a zoom. */
export function centreOffset(b: Bounds, viewportW: number, viewportH: number, zoom: number): { tx: number; ty: number } {
  return { tx: viewportW / 2 - ((b.minX + b.maxX) / 2) * zoom, ty: viewportH / 2 - ((b.minY + b.maxY) / 2) * zoom };
}

/** Keeps a pan offset so the scene cannot be dragged fully off screen. */
export function clampOffset(tx: number, ty: number, b: Bounds, viewportW: number, viewportH: number, zoom: number, slack = 0.35): { tx: number; ty: number } {
  const w = b.width * zoom; const h = b.height * zoom;
  const minTx = viewportW - (b.maxX * zoom) - w * slack; const maxTx = -b.minX * zoom + w * slack;
  const minTy = viewportH - (b.maxY * zoom) - h * slack; const maxTy = -b.minY * zoom + h * slack;
  return { tx: Math.max(Math.min(tx, maxTx), Math.min(minTx, maxTx)), ty: Math.max(Math.min(ty, maxTy), Math.min(minTy, maxTy)) };
}

export function inside(w: number, d: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < d;
}

/** Manhattan tile distance; used for "close enough to interact" checks. */
export function tileDistance(a: Tile, b: Tile): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Facing from a movement delta in tile space. */
export function facingFromDelta(dx: number, dy: number): 'ne' | 'nw' | 'se' | 'sw' {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'se' : 'nw';
  return dy >= 0 ? 'sw' : 'ne';
}

/** Straight-line walk path between tiles (x first, then y), avoiding blocked tiles by stepping around when possible. */
export function walkPath(from: Tile, to: Tile, blocked: (t: Tile) => boolean, limit = 64): Tile[] {
  const path: Tile[] = [];
  let cur = { ...from };
  let guard = 0;
  while ((cur.x !== to.x || cur.y !== to.y) && guard++ < limit) {
    const dx = Math.sign(to.x - cur.x); const dy = Math.sign(to.y - cur.y);
    const candidates: Tile[] = [];
    if (dx) candidates.push({ x: cur.x + dx, y: cur.y });
    if (dy) candidates.push({ x: cur.x, y: cur.y + dy });
    if (dx && dy) candidates.push({ x: cur.x + dx, y: cur.y + dy });
    // side-steps around a blocked tile, never back onto the previous tile
    const prev = path[path.length - 1] ?? from;
    for (const side of dx ? [{ x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 }] : [{ x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y }]) {
      if (!(side.x === prev.x && side.y === prev.y)) candidates.push(side);
    }
    const next = candidates.find((c) => !blocked(c));
    if (!next) break;
    cur = next;
    path.push(cur);
  }
  return path;
}
