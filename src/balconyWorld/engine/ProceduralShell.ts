import * as THREE from 'three';
import { ShellParams } from '../state/types';
import { materials } from './materials';

// PLACEHOLDER SHELL — a parametric balcony + the room it opens from, built
// from boxes and planes so the camera, lighting, placement zones and
// outside view all work today. A per-environment GLB shell with baked
// lightmaps replaces this through EnvironmentLoader without touching
// anything that consumes the returned group (section J/K).

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

  // floors
  const balconyFloor = plane(W, B, M.floorTile);
  balconyFloor.rotation.x = -Math.PI / 2;
  balconyFloor.position.set(0, 0, -B / 2);
  g.add(balconyFloor);

  const roomFloor = plane(W, R, M.roomFloor);
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.position.set(0, 0, R / 2);
  g.add(roomFloor);

  const threshold = box(W, 0.03, 0.14, M.handrailWood);
  threshold.position.set(0, 0.015, 0);
  g.add(threshold);

  // walls — one continuous plaster surface per side, from railing to back wall
  const sideLen = B + R;
  const sideZ = (R - B) / 2;
  const left = plane(sideLen, H, M.plaster);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, H / 2, sideZ);
  g.add(left);

  const right = plane(sideLen, H, M.plaster);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, H / 2, sideZ);
  g.add(right);

  const back = plane(W, H, M.plasterDark);
  back.rotation.y = Math.PI;
  back.position.set(0, H / 2, R);
  g.add(back);

  const ceiling = plane(W, sideLen, M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, sideZ);
  g.add(ceiling);

  // the opening between room and balcony: a teak lintel and jambs
  const lintel = box(W, 0.34, 0.24, M.teak);
  lintel.position.set(0, H - 0.17, 0);
  g.add(lintel);
  for (const s of [-1, 1]) {
    const jamb = box(0.12, H, 0.24, M.teak);
    jamb.position.set(s * (W / 2 - 0.06), H / 2, 0);
    g.add(jamb);
  }

  // railing at the front edge
  const railZ = -B + 0.04;
  const plinth = box(W, 0.08, 0.1, M.darkMetal);
  plinth.position.set(0, 0.04, railZ);
  g.add(plinth);
  const postCount = Math.floor(W / 0.55) + 1;
  for (let i = 0; i < postCount; i++) {
    const x = -W / 2 + 0.06 + (i * (W - 0.12)) / (postCount - 1);
    const post = box(0.035, 1.02, 0.035, M.darkMetal);
    post.position.set(x, 0.55, railZ);
    g.add(post);
  }
  for (const y of [0.32, 0.58, 0.84]) {
    const cable = box(W, 0.012, 0.012, M.darkMetal);
    cable.position.set(0, y, railZ);
    g.add(cable);
  }
  const handrail = box(W, 0.06, 0.1, M.handrailWood);
  handrail.position.set(0, 1.09, railZ);
  g.add(handrail);

  // the world beyond: ground far below (we're a few floors up) and a city
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -6, -60);
  g.add(ground);

  let seed = 11;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 30; i++) {
    const far = i >= 18;
    const w = 1.4 + rand() * 2.6;
    const h = 5 + rand() * (far ? 26 : 18);
    const x = -24 + (i % 18) * 2.8 + (rand() - 0.5) * 1.6;
    const z = -(far ? 30 + rand() * 18 : 13 + rand() * 12);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), far ? M.cityFar : M.city);
    b.position.set(x, -6 + h / 2, z);
    g.add(b);
  }

  return g;
}
