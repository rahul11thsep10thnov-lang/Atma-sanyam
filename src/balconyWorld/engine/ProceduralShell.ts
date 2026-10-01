import * as THREE from 'three';
import { ShellParams } from '../state/types';
import { foliageClump, materials } from './materials';

// PLACEHOLDER SHELL — a parametric terrace + the room it opens from, built
// from boxes and planes so the camera, lighting, placement zones and
// outside view all work today. A per-environment GLB shell with baked
// lightmaps replaces this through EnvironmentLoader without touching
// anything that consumes the returned group (section J/K).
//
// Layout (metres, +Y up, the view is toward -Z):
//   z ∈ [0, roomDepth]        the room the camera stands in
//   z ∈ [-balconyDepth, 0]    the terrace: timber deck, frameless glass
//                             railing at the front, dark flat overhang
//   x = ±width/2              side walls; features (glass doors, living
//                             wall) come from ShellParams.features

function plane(w: number, h: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}

function box(w: number, h: number, d: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildShell(p: ShellParams): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  const { width: W, balconyDepth: B, roomDepth: R, height: H } = p;
  const F = p.features ?? {};

  // ---- floors ------------------------------------------------------------
  const deck = plane(W, B, M.deck);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0, -B / 2);
  deck.name = 'shell-deck';
  g.add(deck);

  const roomFloor = plane(W, R, M.roomFloor);
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.position.set(0, 0, R / 2);
  g.add(roomFloor);

  const threshold = box(W, 0.02, 0.08, M.darkMetal);
  threshold.position.set(0, 0.01, 0);
  g.add(threshold);

  // ---- side walls ----------------------------------------------------------
  const sideLen = B + R;
  const sideZ = (R - B) / 2;
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? -1 : 1;
    const x = sign * (W / 2);
    const facing = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    const hasDoors = F.glassDoors === side;

    // the room part of the wall is always render; the balcony part is
    // render too unless it is the glass-door side
    const wallLen = hasDoors ? R : sideLen;
    const wallZ = hasDoors ? R / 2 : sideZ;
    const wall = plane(wallLen, H, M.wall);
    wall.rotation.y = facing;
    wall.position.set(x, H / 2, wallZ);
    g.add(wall);

    if (hasDoors) {
      // dark interior beyond the glass, with a strip of floor so the
      // reflections read as a room rather than a void
      const backdrop = plane(B, H, M.interiorDark);
      backdrop.rotation.y = facing;
      backdrop.position.set(x + sign * 0.45, H / 2, -B / 2);
      g.add(backdrop);
      const innerFloor = plane(0.45, B, M.roomFloor);
      innerFloor.rotation.x = -Math.PI / 2;
      innerFloor.position.set(x + sign * 0.225, 0.005, -B / 2);
      g.add(innerFloor);

      const panes = 3;
      const paneLen = B / panes;
      for (let i = 0; i <= panes; i++) {
        const mullion = box(0.05, H, 0.05, M.darkMetal);
        mullion.position.set(x, H / 2, -i * paneLen);
        g.add(mullion);
      }
      for (const y of [0.035, H - 0.04]) {
        const track = box(0.07, 0.07, B, M.darkMetal);
        track.position.set(x, y, -B / 2);
        g.add(track);
      }
      for (let i = 0; i < panes; i++) {
        const pane = plane(paneLen - 0.05, H - 0.14, M.glassDoor);
        pane.rotation.y = facing;
        pane.position.set(x, H / 2, -(i + 0.5) * paneLen);
        pane.receiveShadow = false;
        g.add(pane);
      }
    }

    if (F.greenWall === side) {
      // a living-wall panel on the balcony part of this wall
      const panelLen = B - 0.5;
      const panelH = 1.9;
      const panelY = 0.5 + panelH / 2;
      const backing = box(0.08, panelH, panelLen, M.hedge);
      backing.position.set(x - sign * 0.05, panelY, -B / 2);
      g.add(backing);
      let seed = side === 'left' ? 31 : 47;
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      const clump = foliageClump(170, [0.1, panelH - 0.1, panelLen - 0.1], [0.07, 0.12], rand);
      clump.position.set(x - sign * 0.13, 0.55, -B / 2);
      g.add(clump);
    }
  }

  const back = plane(W, H, M.wallDark);
  back.rotation.y = Math.PI;
  back.position.set(0, H / 2, R);
  g.add(back);

  // ---- overhang ------------------------------------------------------------
  const ceiling = plane(W, sideLen, M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, sideZ);
  g.add(ceiling);

  const fascia = box(W, 0.3, 0.18, M.fascia);
  fascia.position.set(0, H - 0.15, -B + 0.09);
  g.add(fascia);
  const beam = box(W, 0.14, 0.14, M.fascia);
  beam.position.set(0, H - 0.07, 0);
  g.add(beam);
  for (const s of [-1, 1]) {
    const column = box(0.09, H, 0.09, M.fascia);
    column.position.set(s * (W / 2 - 0.045), H / 2, -B + 0.045);
    g.add(column);
  }
  const downlights = F.downlights ?? 0;
  for (let i = 0; i < downlights; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 16), M.downlight);
    d.position.set(-W / 2 + ((i + 0.5) * W) / downlights, H - 0.006, -B / 2);
    g.add(d);
  }

  // ---- frameless glass railing --------------------------------------------
  const railZ = -B + 0.06;
  const channel = box(W, 0.07, 0.09, M.darkMetal);
  channel.position.set(0, 0.035, railZ);
  g.add(channel);
  const panels = Math.max(2, Math.round(W / 1.3));
  const panelW = W / panels;
  for (let i = 0; i < panels; i++) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.025, 1.0, 0.012), M.glass);
    pane.position.set(-W / 2 + (i + 0.5) * panelW, 0.57, railZ);
    pane.renderOrder = 2;
    g.add(pane);
  }
  const cap = box(W, 0.035, 0.07, M.darkMetal);
  cap.position.set(0, 1.09, railZ);
  g.add(cap);

  // ---- the world beyond: a high floor over a dusk city ---------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -14, -140);
  g.add(ground);

  let seed = 11;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  // Two bands of towers: a nearer mid-rise band and a far high-rise band
  // that the fog turns into a hazy silhouette against the sunset.
  for (let i = 0; i < 64; i++) {
    const far = i >= 32;
    const w = 3 + rand() * 6;
    const h = far ? 14 + rand() * 34 : 8 + rand() * 20;
    const x = -78 + (i % 32) * 5 + (rand() - 0.5) * 3;
    const z = -(far ? 80 + rand() * 40 : 40 + rand() * 30);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), far ? M.cityFar : M.city);
    b.position.set(x, -14 + h / 2, z);
    g.add(b);
  }

  return g;
}
