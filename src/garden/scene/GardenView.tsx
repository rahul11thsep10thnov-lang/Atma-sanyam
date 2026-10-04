// The garden in real time: a three.js scene on expo-gl. The lawn is a
// 70 m square with the mansion along its north side, hedges and trees
// around it; every plant and object is a photographed sprite that stands
// where it was put and turns to face the camera. One finger moves about,
// two fingers turn and tilt, pinch zooms; in edit mode a finger drags an
// object like a cursor, onto the dustbin or a planter stand.
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { LightState } from '../../spaces/packTypes';
import { ArtworkRecord } from '../../collection/model';
import { loadModuleTexture, loadTile, loadUriTexture, radialTexture } from '../../gl/textures';
import { ThreeHandle, useThree } from '../../gl/useThree';
import { GardenItem, GardenState, FOCUS_TREE_POS, LAWN_HALF, STAND_ITEM, spriteFor } from '../model';
import { SPRITES, SPRITE_IMAGES, TEXTURES } from '../sprites.generated';
import { Sprite } from '../types';

export type GardenMode = 'live' | 'edit' | 'session';

export interface GardenViewProps {
  state: GardenState;
  light: LightState;
  mode: GardenMode;
  /** Live growth during a session. */
  focusMinutes?: number;
  focusHealth?: number;
  rackCount?: number;
  artworkById: (id: string) => ArtworkRecord | null;
  selectedUid?: string | null;
  onSelect?: (uid: string | null) => void;
  onMove?: (uid: string, x: number, z: number) => void;
  onDropOnBin?: (uid: string) => void;
  onDropOnStand?: (uid: string, standUid: string) => void;
  onDragging?: (uid: string | null, overBin: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

// ---- light states ---------------------------------------------------------------------
interface Look {
  skyTop: number;
  skyBottom: number;
  fog: number;
  fogDensity: number;
  tint: number;
  ground: number;
  sun: number;
  sunIntensity: number;
  sunDir: [number, number, number];
  hemi: [number, number];
  hemiIntensity: number;
  night: boolean;
  rain: boolean;
  exposure: number;
}

const LOOKS: Record<LightState, Look> = {
  morning: { skyTop: 0x6fa3d8, skyBottom: 0xf4e3c2, fog: 0xe8e2d0, fogDensity: 0.004, tint: 0xffffff, ground: 0xffffff, sun: 0xfff0d6, sunIntensity: 2.2, sunDir: [-0.5, 0.6, 0.55], hemi: [0xcfe3ff, 0x5a6b3a], hemiIntensity: 0.9, night: false, rain: false, exposure: 1.0 },
  afternoon: { skyTop: 0x5a9de0, skyBottom: 0xeaf1f8, fog: 0xe6ecf2, fogDensity: 0.0035, tint: 0xffffff, ground: 0xffffff, sun: 0xffffff, sunIntensity: 2.6, sunDir: [0.1, 0.95, 0.3], hemi: [0xdfefff, 0x5c6f3c], hemiIntensity: 1.0, night: false, rain: false, exposure: 1.05 },
  sunset: { skyTop: 0x5a5f9e, skyBottom: 0xf7b680, fog: 0xe9c6a4, fogDensity: 0.005, tint: 0xffd9b8, ground: 0xffd2a8, sun: 0xffa060, sunIntensity: 1.6, sunDir: [0.85, 0.18, 0.4], hemi: [0xc9a6d8, 0x5a4a30], hemiIntensity: 0.7, night: false, rain: false, exposure: 0.95 },
  evening: { skyTop: 0x1d2446, skyBottom: 0x8a6a7e, fog: 0x4a3f55, fogDensity: 0.006, tint: 0xa89fc8, ground: 0x8a84a0, sun: 0xffb080, sunIntensity: 0.7, sunDir: [0.85, 0.12, 0.4], hemi: [0x5e5f8e, 0x3a3a30], hemiIntensity: 0.8, night: true, rain: false, exposure: 0.9 },
  night: { skyTop: 0x060a1c, skyBottom: 0x222a52, fog: 0x151a30, fogDensity: 0.007, tint: 0x7a88c0, ground: 0x5a6590, sun: 0xaab6ff, sunIntensity: 0.7, sunDir: [-0.3, 0.8, 0.5], hemi: [0x3e4a88, 0x1e2424], hemiIntensity: 0.8, night: true, rain: false, exposure: 0.9 },
  rain: { skyTop: 0x5b6670, skyBottom: 0xb9bfc4, fog: 0xaeb4b8, fogDensity: 0.009, tint: 0xc9cfd4, ground: 0xb8c0c0, sun: 0xdfe6ea, sunIntensity: 0.9, sunDir: [0.2, 0.9, 0.3], hemi: [0xaab2b8, 0x3f4a34], hemiIntensity: 0.8, night: false, rain: true, exposure: 0.9 },
};

// ---- camera -----------------------------------------------------------------------------
interface Orbit {
  tx: number;
  tz: number;
  dist: number;
  yaw: number;
  pitch: number;
}
const MIN_DIST = 3;
const MAX_DIST = 70;
const MIN_PITCH = (8 * Math.PI) / 180;
const MAX_PITCH = (78 * Math.PI) / 180;

function applyOrbit(cam: THREE.PerspectiveCamera, o: Orbit) {
  const cp = Math.cos(o.pitch);
  cam.position.set(o.tx + Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist + 0.2, o.tz + Math.cos(o.yaw) * cp * o.dist);
  cam.lookAt(o.tx, 0.8, o.tz);
}

// ---- sprites ------------------------------------------------------------------------------
interface Node {
  key: string;
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  art?: THREE.Mesh;
  artKey?: string;
  glow?: THREE.Mesh;
  sway?: { amp: number; speed: number; phase: number };
  baseScale: number;
}

const geomCache = new Map<string, THREE.PlaneGeometry>();
function geometryFor(key: string, s: Sprite): THREE.PlaneGeometry {
  const hit = geomCache.get(key);
  if (hit) return hit;
  const g = new THREE.PlaneGeometry(s.widthM, s.heightM);
  // the pivot (ground contact) at the origin
  g.translate(-(s.pivot[0] - 0.5) * s.widthM, -(0.5 - s.pivot[1]) * s.heightM, 0);
  geomCache.set(key, g);
  return g;
}

export function GardenView({ state, light, mode, focusMinutes, focusHealth, rackCount = 0, artworkById, selectedUid, onSelect, onMove, onDropOnBin, onDropOnStand, onDragging, style }: GardenViewProps) {
  const orbit = useRef<Orbit>({ tx: 0, tz: 2, dist: 20, yaw: 0, pitch: (30 * Math.PI) / 180 });
  const target = useRef<Orbit>({ ...orbit.current });
  const live = useRef({ state, light, mode, focusMinutes, focusHealth, rackCount, selectedUid, artworkById });
  live.current = { state, light, mode, focusMinutes, focusHealth, rackCount, selectedUid, artworkById };
  const nodes = useRef(new Map<string, Node>());
  const sceneRef = useRef<{ h: ThreeHandle; items: THREE.Group; lights: { sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; amb: THREE.AmbientLight }; sky: THREE.Mesh; ground: THREE.Mesh; rain: THREE.Points; tintable: THREE.MeshBasicMaterial[]; glows: THREE.Mesh[]; shadowTex: THREE.Texture; glowTex: THREE.Texture } | null>(null);
  const size = useRef({ w: 1, h: 1 });
  const drag = useRef<{ uid: string; overBin: boolean; overStand: string | null } | null>(null);
  const lastPan = useRef({ x: 0, y: 0, pointers: 1 });
  const pressed = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastScale = useRef(1);
  const dirty = useRef(true);
  const applied = useRef<LightState | null>(null);

  // ---- build the static scene ----
  const create = useCallback((h: ThreeHandle) => {
    const { scene, camera } = h;
    camera.fov = 52;
    camera.near = 0.2;
    camera.far = 900;
    camera.updateProjectionMatrix();

    const skyGeo = new THREE.SphereGeometry(420, 24, 12);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(0x6fa3d8) }, bottom: { value: new THREE.Color(0xf4e3c2) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = clamp(vP.y / 220.0, 0.0, 1.0); t = pow(t, 0.6); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    scene.fog = new THREE.FogExp2(0xe8e2d0, 0.004);

    const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a6b3a, 0.9);
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.2);
    sun.position.set(-50, 60, 55);
    const amb = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(hemi, sun, amb);

    // the lawn, and the land beyond it
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5f8a3a });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(LAWN_HALF * 2 + 6, LAWN_HALF * 2 + 6), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: 0x4f6d33 }));
    beyond.rotation.x = -Math.PI / 2;
    beyond.position.y = -0.08;
    scene.add(beyond);
    if (TEXTURES.grass && SPRITE_IMAGES[TEXTURES.grass.file]) {
      loadTile(SPRITE_IMAGES[TEXTURES.grass.file], (LAWN_HALF * 2 + 6) / TEXTURES.grass.metres).then((t) => {
        groundMat.map = t;
        groundMat.color.set(0xffffff);
        groundMat.needsUpdate = true;
        const t2 = t.clone();
        t2.repeat.set(1200 / TEXTURES.grass!.metres, 1200 / TEXTURES.grass!.metres);
        t2.needsUpdate = true;
        (beyond.material as THREE.MeshLambertMaterial).map = t2;
        (beyond.material as THREE.MeshLambertMaterial).color.set(0xc8d0c0);
        (beyond.material as THREE.MeshLambertMaterial).needsUpdate = true;
      });
    }
    // a sandstone terrace in front of the mansion
    const terraceMat = new THREE.MeshLambertMaterial({ color: 0xb9a584 });
    const terrace = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), terraceMat);
    terrace.rotation.x = -Math.PI / 2;
    terrace.position.set(0, 0.02, -LAWN_HALF + 4.5);
    scene.add(terrace);
    if (TEXTURES.paving && SPRITE_IMAGES[TEXTURES.paving.file]) {
      loadTile(SPRITE_IMAGES[TEXTURES.paving.file], 40 / TEXTURES.paving.metres).then((t) => {
        const t2 = t.clone();
        t2.repeat.set(40 / TEXTURES.paving!.metres, 9 / TEXTURES.paving!.metres);
        t2.needsUpdate = true;
        terraceMat.map = t2;
        terraceMat.color.set(0xffffff);
        terraceMat.needsUpdate = true;
      });
    }

    const tintable: THREE.MeshBasicMaterial[] = [];
    const shadowTex = radialTexture(64, 0.1, 1.8);
    const glowTex = radialTexture(64, 0.0, 2.6);
    const scenery = new THREE.Group();
    scene.add(scenery);

    const billboard = (s: Sprite, x: number, z: number, scale = 1, key = s.file) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, depthWrite: true, side: THREE.DoubleSide, color: 0xffffff });
      tintable.push(mat);
      const mesh = new THREE.Mesh(geometryFor(key, s), mat);
      mesh.position.set(x, 0, z);
      mesh.scale.setScalar(scale);
      mesh.userData.billboard = true;
      scenery.add(mesh);
      const id = SPRITE_IMAGES[s.file];
      if (id !== undefined) loadModuleTexture(id).then((t) => { mat.map = t; mat.needsUpdate = true; });
      return mesh;
    };

    // the mansion along the north edge, hedges around, trees beyond
    if (TEXTURES.mansion) {
      const m = billboard(TEXTURES.mansion, 0, -LAWN_HALF - 3);
      m.userData.billboard = false; // the house faces the lawn
    }
    const hedge = TEXTURES.hedge_run;
    const tall = TEXTURES.hedge_tall_run ?? TEXTURES.hedge_run;
    if (hedge) {
      const n = Math.ceil((LAWN_HALF * 2) / hedge.widthM);
      for (let i = 0; i < n; i++) {
        const p = -LAWN_HALF + (i + 0.5) * hedge.widthM;
        const e = billboard(hedge, LAWN_HALF + 1, p);
        e.rotation.y = -Math.PI / 2;
        e.userData.billboard = false;
        const w = billboard(hedge, -LAWN_HALF - 1, p);
        w.rotation.y = Math.PI / 2;
        w.userData.billboard = false;
        const s = billboard(hedge, p, LAWN_HALF + 1);
        s.rotation.y = Math.PI;
        s.userData.billboard = false;
        if (tall && Math.abs(p) > 17) {
          const nn = billboard(tall, p, -LAWN_HALF - 1);
          nn.userData.billboard = false;
        }
      }
    }
    const sc = SPRITES.scenery;
    const treeKeys = Object.keys(sc).filter((k) => !k.startsWith('hedge') && k !== 'boulders');
    if (treeKeys.length) {
      const ring = 42;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.15;
        const r = ring + (i % 4) * 5;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (z < -LAWN_HALF - 2 && Math.abs(x) < 24) continue; // behind the house
        const k = treeKeys[(i * 7) % treeKeys.length];
        billboard(sc[k], x, z, 0.85 + ((i * 13) % 5) * 0.08, `${k}`);
      }
      // a few mature trees inside the far corners
      const corners: [number, number][] = [[-26, -24], [26, -22], [-27, 20], [28, 24], [-30, 0], [30, -2]];
      corners.forEach(([x, z], i) => billboard(sc[treeKeys[(i * 3) % treeKeys.length]], x, z, 0.9));
    }
    if (sc.boulders) {
      billboard(sc.boulders, -9, -20);
      billboard(sc.boulders, 18, -14, 0.8);
    }

    // the focus tree
    const items = new THREE.Group();
    scene.add(items);

    // rain
    const rainCount = 900;
    const rp = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rp[i * 3] = (Math.random() - 0.5) * 60;
      rp[i * 3 + 1] = Math.random() * 25;
      rp[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xdfe8f0, size: 0.09, transparent: true, opacity: 0.55, sizeAttenuation: true }));
    rain.visible = false;
    scene.add(rain);

    sceneRef.current = { h, items, lights: { sun, hemi, amb }, sky, ground, rain, tintable, glows: [], shadowTex, glowTex };
    applyOrbit(camera, orbit.current);
    dirty.current = true;
    applied.current = null;

    const update = (hh: ThreeHandle, dt: number) => {
      const s = sceneRef.current;
      if (!s) return;
      const L = live.current;
      // camera easing
      const o = orbit.current;
      const tg = target.current;
      if (L.mode === 'session') {
        tg.yaw += dt * 0.025;
      }
      const k = Math.min(1, dt * 7);
      o.tx += (tg.tx - o.tx) * k;
      o.tz += (tg.tz - o.tz) * k;
      o.dist += (tg.dist - o.dist) * k;
      o.yaw += (tg.yaw - o.yaw) * k;
      o.pitch += (tg.pitch - o.pitch) * k;
      applyOrbit(hh.camera, o);
      // light state
      if (applied.current !== L.light) {
        applied.current = L.light;
        const look = LOOKS[L.light];
        (s.sky.material as THREE.ShaderMaterial).uniforms.top.value.set(look.skyTop);
        (s.sky.material as THREE.ShaderMaterial).uniforms.bottom.value.set(look.skyBottom);
        (hh.scene.fog as THREE.FogExp2).color.set(look.fog);
        (hh.scene.fog as THREE.FogExp2).density = look.fogDensity;
        s.lights.sun.color.set(look.sun);
        s.lights.sun.intensity = look.sunIntensity;
        s.lights.sun.position.set(look.sunDir[0] * 80, look.sunDir[1] * 80, look.sunDir[2] * 80);
        s.lights.hemi.color.set(look.hemi[0]);
        s.lights.hemi.groundColor.set(look.hemi[1]);
        s.lights.hemi.intensity = look.hemiIntensity;
        hh.renderer.toneMappingExposure = look.exposure;
        for (const m of s.tintable) m.color.set(look.tint);
        s.rain.visible = look.rain;
        dirty.current = true;
      }
      if (dirty.current) {
        dirty.current = false;
        sync();
      }
      // billboards face the camera (about the vertical axis only)
      const yaw = o.yaw;
      hh.scene.traverse((obj) => {
        if (obj.userData.billboard) obj.rotation.y = yaw;
      });
      // sway and glow
      const t = hh.time;
      for (const n of nodes.current.values()) {
        if (n.sway) n.mesh.scale.x = n.baseScale * (1 + Math.sin(t * n.sway.speed * 2 + n.sway.phase) * n.sway.amp * 0.012);
        if (n.glow) n.glow.scale.setScalar(2.4 + Math.sin(t * 3 + (n.sway?.phase ?? 0)) * 0.08);
      }
      if (s.rain.visible) {
        const pos = s.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= dt * 16;
          if (arr[i + 1] < 0) arr[i + 1] = 25;
        }
        s.rain.position.set(o.tx, 0, o.tz);
        pos.needsUpdate = true;
      }
    };

    const dispose = () => {
      for (const n of nodes.current.values()) {
        (n.mesh.material as THREE.Material).dispose();
      }
      nodes.current.clear();
      sceneRef.current = null;
    };
    return { update, dispose };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- reconcile items with the scene ----
  const sync = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const L = live.current;
    const look = LOOKS[L.light];
    const wanted = new Map<string, { item: GardenItem; sprite: Sprite; key: string; y: number }>();
    const list: GardenItem[] = [...L.state.items];
    // the focus tree stands at its fixed place
    const ft = SPRITES.focusTree;
    if (ft) {
      const minutes = Math.max(L.state.focus.minutes, L.focusMinutes ?? 0);
      const health = L.focusHealth ?? L.state.focus.health;
      let idx = 0;
      ft.stages.forEach((st, i) => {
        if (minutes >= st.minutes) idx = i;
      });
      const st = ft.stages[idx];
      const sp = (health < 0.6 ? st.wilted : st.healthy) ?? st.healthy;
      if (sp) wanted.set('__focus', { item: { uid: '__focus', itemId: '__focus', x: FOCUS_TREE_POS[0], z: FOCUS_TREE_POS[1], placedAt: 0 }, sprite: sp, key: sp.file, y: 0 });
    }
    for (const it of list) {
      const sp = spriteFor(it, { night: look.night, rackCount: L.rackCount });
      if (!sp) continue;
      const y = it.standUid ? 0.08 + (it.level ?? 0) * 0.42 : 0;
      wanted.set(it.uid, { item: it, sprite: sp, key: sp.file, y });
    }
    // remove
    for (const [uid, n] of nodes.current) {
      if (!wanted.has(uid)) {
        s.items.remove(n.mesh, n.shadow);
        if (n.glow) s.items.remove(n.glow);
        (n.mesh.material as THREE.Material).dispose();
        nodes.current.delete(uid);
      }
    }
    // add / update
    for (const [uid, w] of wanted) {
      let n = nodes.current.get(uid);
      if (n && n.key !== w.key) {
        s.items.remove(n.mesh, n.shadow);
        if (n.glow) s.items.remove(n.glow);
        nodes.current.delete(uid);
        n = undefined;
      }
      if (!n) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, depthWrite: true, side: THREE.DoubleSide, color: look.tint, opacity: 0 });
        const mesh = new THREE.Mesh(geometryFor(w.key, w.sprite), mat);
        mesh.userData.billboard = true;
        mesh.userData.uid = uid;
        const shadowMat = new THREE.MeshBasicMaterial({ map: s.shadowTex, transparent: true, opacity: 0.35, depthWrite: false, color: 0x000000 });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.01;
        shadow.renderOrder = -1;
        const sw = Math.max(0.5, w.sprite.boxM[0] * 1.3);
        const sd = Math.max(0.4, w.sprite.boxM[1] * 1.1);
        shadow.scale.set(sw, sd, 1);
        s.items.add(mesh, shadow);
        n = { key: w.key, mesh, shadow, baseScale: 1 };
        const def = SPRITES.items[w.item.itemId];
        if (w.sprite.sway) n.sway = { amp: w.sprite.sway.amp, speed: w.sprite.sway.speed, phase: Math.random() * 6.28 };
        if (def?.lit && look.night) {
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: s.glowTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xffc070, blending: THREE.AdditiveBlending }));
          glow.userData.billboard = true;
          glow.renderOrder = 2;
          s.items.add(glow);
          n.glow = glow;
        }
        nodes.current.set(uid, n);
        const id = SPRITE_IMAGES[w.sprite.file];
        if (id !== undefined) {
          loadModuleTexture(id).then((t) => {
            mat.map = t;
            mat.opacity = 1;
            mat.needsUpdate = true;
          });
        }
      }
      n.mesh.position.set(w.item.x, w.y, w.item.z);
      n.shadow.position.set(w.item.x, 0.01 + w.y, w.item.z);
      n.shadow.visible = !w.item.standUid;
      if (n.glow) n.glow.position.set(w.item.x, w.y + w.sprite.heightM * 0.55, w.item.z);
      const sel = L.selectedUid === uid && L.mode === 'edit';
      (n.mesh.material as THREE.MeshBasicMaterial).color.set(sel ? 0xffe9c8 : look.tint);
      // the easel's picture
      const def = SPRITES.items[w.item.itemId];
      if (def?.art && w.sprite.artQuad) {
        const art = w.item.artId ? L.artworkById(w.item.artId) : null;
        const artKey = art ? `${art.id}` : '';
        if (n.art && n.artKey !== artKey) {
          n.mesh.remove(n.art);
          n.art = undefined;
        }
        if (art && !n.art) {
          const q = w.sprite.artQuad;
          const xs = q.map((p) => p[0]);
          const ys = q.map((p) => p[1]);
          const x0 = Math.min(...xs);
          const x1 = Math.max(...xs);
          const y0 = Math.min(...ys);
          const y1 = Math.max(...ys);
          const aw = (x1 - x0) * w.sprite.widthM;
          const ah = (y1 - y0) * w.sprite.heightM;
          const cx = ((x0 + x1) / 2 - w.sprite.pivot[0]) * w.sprite.widthM;
          const cy = (w.sprite.pivot[1] - (y0 + y1) / 2) * w.sprite.heightM;
          const am = new THREE.MeshBasicMaterial({ color: look.tint, transparent: true, opacity: 0 });
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(aw, ah), am);
          plane.position.set(cx, cy, 0.02);
          plane.renderOrder = 1;
          n.mesh.add(plane);
          n.art = plane;
          n.artKey = artKey;
          const src = art.source;
          const p = src.kind === 'builtin' ? loadModuleTexture(src.moduleId) : loadUriTexture(src.uri);
          p.then((t) => {
            am.map = t;
            am.opacity = 1;
            am.needsUpdate = true;
          }).catch(() => undefined);
        }
      }
    }
  }, []);

  useEffect(() => {
    dirty.current = true;
  }, [state, light, focusMinutes, focusHealth, rackCount, selectedUid, mode]);

  const { onContextCreate } = useThree({ create, maxPixelRatio: 2 });

  // ---- picking ----
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const ndc = (x: number, y: number) => new THREE.Vector2((x / size.current.w) * 2 - 1, -(y / size.current.h) * 2 + 1);
  const groundAt = (x: number, y: number): [number, number] | null => {
    const s = sceneRef.current;
    if (!s) return null;
    ray.setFromCamera(ndc(x, y), s.h.camera);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(groundPlane, p)) return null;
    return [p.x, p.z];
  };
  const pick = (x: number, y: number): string | null => {
    const s = sceneRef.current;
    if (!s) return null;
    ray.setFromCamera(ndc(x, y), s.h.camera);
    const meshes = [...nodes.current.entries()].filter(([uid]) => uid !== '__focus').map(([, n]) => n.mesh);
    const hits = ray.intersectObjects(meshes, false);
    for (const h of hits) {
      const uid = h.object.userData.uid as string | undefined;
      if (uid) return uid;
    }
    return null;
  };
  const nearItem = (itemId: string, x: number, z: number, radius: number, exceptUid: string): string | null => {
    const it = live.current.state.items.find((i) => i.itemId === itemId && i.uid !== exceptUid && Math.hypot(i.x - x, i.z - z) < radius);
    return it?.uid ?? null;
  };

  // ---- gestures ----
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .minDistance(1)
        .onBegin((e) => {
          lastPan.current = { x: 0, y: 0, pointers: e.numberOfPointers };
          pressed.current = { x: e.x, y: e.y, moved: false };
          if (live.current.mode === 'edit' && e.numberOfPointers === 1) {
            const uid = pick(e.x, e.y);
            if (uid && uid !== '__focus') {
              const it = live.current.state.items.find((i) => i.uid === uid);
              if (it && !SPRITES.items[it.itemId]?.fixed) {
                drag.current = { uid, overBin: false, overStand: null };
                onSelect?.(uid);
                onDragging?.(uid, false);
              }
            }
          }
        })
        .onUpdate((e) => {
          const o = target.current;
          // per-event deltas; a change in finger count restarts them so the
          // view does not jump when the second finger lands or lifts
          const lp = lastPan.current;
          const changeX = lp.pointers === e.numberOfPointers ? e.translationX - lp.x : 0;
          const changeY = lp.pointers === e.numberOfPointers ? e.translationY - lp.y : 0;
          lastPan.current = { x: e.translationX, y: e.translationY, pointers: e.numberOfPointers };
          if (pressed.current && Math.hypot(e.translationX, e.translationY) > 10) pressed.current.moved = true;
          if (drag.current && e.numberOfPointers === 1) {
            const g = groundAt(e.x, e.y);
            if (!g) return;
            const n = nodes.current.get(drag.current.uid);
            const it = live.current.state.items.find((i) => i.uid === drag.current!.uid);
            if (n) n.mesh.position.set(g[0], 0, g[1]);
            if (n) n.shadow.position.set(g[0], 0.01, g[1]);
            const bin = nearItem('dustbin', g[0], g[1], 1.4, drag.current.uid);
            const stand = it && (SPRITES.items[it.itemId]?.growable || SPRITES.items[it.itemId]?.category === 'PLANTS') ? nearItem(STAND_ITEM, g[0], g[1], 1.2, drag.current.uid) : null;
            const overBin = !!bin && !!it && it.itemId !== 'dead_sapling' && it.itemId !== 'broken_frame';
            if (overBin !== drag.current.overBin) onDragging?.(drag.current.uid, overBin);
            drag.current.overBin = overBin;
            drag.current.overStand = stand;
            return;
          }
          if (e.numberOfPointers >= 2) {
            // two fingers: turn and tilt, like a map
            const dx = changeX;
            const dy = changeY;
            o.yaw -= dx * 0.006;
            o.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, o.pitch + dy * 0.005));
            return;
          }
          // one finger: slide the view over the lawn
          const k = (o.dist / size.current.h) * 1.6;
          const dx = changeX * k;
          const dy = changeY * k;
          const sy = Math.sin(o.yaw);
          const cy = Math.cos(o.yaw);
          o.tx -= dx * cy - dy * sy;
          o.tz -= -dx * sy - dy * cy;
          o.tx = Math.max(-LAWN_HALF, Math.min(LAWN_HALF, o.tx));
          o.tz = Math.max(-LAWN_HALF, Math.min(LAWN_HALF, o.tz));
        })
        .onEnd((e) => {
          const d = drag.current;
          drag.current = null;
          const pr = pressed.current;
          pressed.current = null;
          if (pr && !pr.moved && e.numberOfPointers <= 1) {
            // a press that never moved is a tap
            if (d) {
              onDragging?.(null, false);
              dirty.current = true;
            } else {
              const uid = pick(pr.x, pr.y);
              onSelect?.(uid && uid !== '__focus' ? uid : null);
            }
            return;
          }
          if (!d) return;
          onDragging?.(null, false);
          const g = groundAt(e.x, e.y);
          if (!g) return;
          if (d.overBin) {
            onDropOnBin?.(d.uid);
            return;
          }
          if (d.overStand) {
            onDropOnStand?.(d.uid, d.overStand);
            return;
          }
          onMove?.(d.uid, g[0], g[1]);
        })
        .onFinalize((e, success) => {
          const pr = pressed.current;
          pressed.current = null;
          if (drag.current) {
            drag.current = null;
            onDragging?.(null, false);
            dirty.current = true;
          }
          if (!success && pr && !pr.moved && e.numberOfPointers <= 1) {
            const uid = pick(pr.x, pr.y);
            onSelect?.(uid && uid !== '__focus' ? uid : null);
          }
        })
        .runOnJS(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMove, onDropOnBin, onDropOnStand, onSelect, onDragging],
  );
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          lastScale.current = 1;
        })
        .onUpdate((e) => {
          const o = target.current;
          const scale = e.scale / (lastScale.current || 1);
          lastScale.current = e.scale;
          o.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, o.dist / (scale || 1)));
        })
        .runOnJS(true),
    [],
  );
  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const zoomBy = useCallback((f: number) => {
    const o = target.current;
    o.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, o.dist * f));
  }, []);
  const recentre = useCallback(() => {
    target.current = { tx: 0, tz: 4, dist: 26, yaw: 0, pitch: (30 * Math.PI) / 180 };
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.fill, style]} onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }} collapsable={false}>
        <GLView style={styles.fill} onContextCreate={onContextCreate} />
        {mode !== 'session' && <GardenControls zoomBy={zoomBy} recentre={recentre} />}
      </View>
    </GestureDetector>
  );
}

/** Zoom buttons: pinch is the main way, these are the clear alternative. */
function GardenControls({ zoomBy, recentre }: { zoomBy: (f: number) => void; recentre: () => void }) {
  return (
    <View style={styles.zoom} pointerEvents="box-none">
      <ZoomButton label="+" onPress={() => zoomBy(0.72)} />
      <ZoomButton label="−" onPress={() => zoomBy(1.38)} />
      <ZoomButton label="◎" onPress={recentre} />
    </View>
  );
}

import { Pressable, Text } from 'react-native';
function ZoomButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label === '+' ? 'Zoom in' : label === '−' ? 'Zoom out' : 'Recentre'} style={styles.zoomBtn}>
      <Text style={styles.zoomText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  zoom: { position: 'absolute', right: 12, top: '42%', gap: 8 },
  zoomBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(28,20,14,0.44)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,248,238,0.16)', alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: '#FFFFFF', fontSize: 20, lineHeight: 24 },
});
