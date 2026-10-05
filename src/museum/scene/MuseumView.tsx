// The museum in real time: a three.js ring gallery on expo-gl. The viewer
// stands inside a ring; the artworks hang on its curved outer wall. Only
// the current section and its two neighbours are built, the neighbours
// darker and curving away like the far marks of a watch dial. Swiping
// left or right travels to the next section with an eased camera move;
// one finger looks around, two fingers walk, a pinch zooms. In edit mode
// a finger carries an object along the wall or across the floor, and
// every drop snaps to a legal place: never inside a wall, never floating,
// never outside the section.
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { ArtworkRecord } from '../../collection/model';
import { loadModuleTexture, loadTile, loadUriTexture, radialTexture } from '../../gl/textures';
import { ThreeHandle, useThree } from '../../gl/useThree';
import { spriteFor as paradiseSprite } from '../../paradise/model';
import { PARADISE_IMAGES } from '../../paradise/sprites.generated';
import { MUSEUM_TEXTURES } from '../textures';
import { EYE_HEIGHT, FLOOR_DEPTH, MuseumObject, MuseumState, MuseumTheme, RING_RADIUS, SECTION_ARC, WALL_HEIGHT, WALL_LENGTH, WALL_RADIUS, artworkSize, snapToFloor, snapToWall } from '../model';
import { MUSEUM_STORE_BY_ID, MuseumItem, isLightItem, museumWidthOf } from '../store';

export type MuseumMode = 'view' | 'edit';

export interface MuseumViewProps {
  state: MuseumState;
  section: number;
  mode: MuseumMode;
  artworkById: (id: string) => ArtworkRecord | null;
  selectedId?: string | null;
  onSelect?: (objectId: string | null) => void;
  onMove?: (objectId: string, u: number, h: number) => void;
  onSwipeSection?: (dir: 1 | -1) => void;
  onDragging?: (objectId: string | null) => void;
  style?: StyleProp<ViewStyle>;
}

// ---- themes -------------------------------------------------------------------------------
interface Palette {
  wall: number;
  floor: number;
  ceiling: number;
  column: number;
  trim: number;
  ambient: number;
  ambientIntensity: number;
  hemi: [number, number];
  fog: number;
}
const PALETTES: Record<MuseumTheme, Palette> = {
  modern: { wall: 0xf1ede6, floor: 0xd9d4cc, ceiling: 0x4a443e, column: 0xe6e1d8, trim: 0x6a625a, ambient: 0xfff4e6, ambientIntensity: 0.22, hemi: [0xfff0dc, 0x6b655d], fog: 0x1b1816 },
  heritage: { wall: 0xdcc6a2, floor: 0xcdbb9a, ceiling: 0x5a4632, column: 0xcfb588, trim: 0x7a5636, ambient: 0xffe4bf, ambientIntensity: 0.26, hemi: [0xffe6c4, 0x6b5a40], fog: 0x1e1610 },
};

// ---- geometry helpers ---------------------------------------------------------------------
/** Angle of a section's left edge; sections run anticlockwise seen from above. */
const sectionStart = (sectionId: number) => (sectionId - 1) * SECTION_ARC;
const angleOf = (sectionId: number, u: number) => sectionStart(sectionId) + u * SECTION_ARC;
const polar = (r: number, a: number) => new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);

interface Node {
  group: THREE.Group;
  object: MuseumObject;
  sectionId: number;
  mats: THREE.Material[];
  textured: THREE.MeshLambertMaterial[];
  light?: THREE.Light;
  pool?: THREE.Mesh;
  born: number;
  billboard?: THREE.Mesh;
}

function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

export function MuseumView({ state, section, mode, artworkById, selectedId, onSelect, onMove, onSwipeSection, onDragging, style }: MuseumViewProps) {
  const live = useRef({ state, section, mode, artworkById, selectedId });
  live.current = { state, section, mode, artworkById, selectedId };
  // camera: angle around the ring (section travel), look offsets, walk offsets, zoom
  const cam = useRef({ theta: angleOf(section, 0.5), yaw: 0, pitch: 0, along: 0, radial: 0, fov: 62 });
  const target = useRef({ ...cam.current });
  const sceneRef = useRef<{ h: ThreeHandle; root: THREE.Group; sections: Map<number, { group: THREE.Group; mats: THREE.MeshLambertMaterial[] }>; nodes: Map<string, Node>; amb: THREE.AmbientLight; hemi: THREE.HemisphereLight; poolTex: THREE.Texture; marble: THREE.Texture | null; theme: MuseumTheme | null } | null>(null);
  const size = useRef({ w: 1, h: 1 });
  const drag = useRef<{ id: string; surface: MuseumObject['surfaceId'] } | null>(null);
  const pressed = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastPan = useRef({ x: 0, y: 0, pointers: 1 });
  const lastScale = useRef(1);
  const dirty = useRef(true);
  const builtKey = useRef('');

  // ---- scene --------------------------------------------------------------------------
  const create = useCallback((h: ThreeHandle) => {
    const { scene, camera } = h;
    camera.fov = cam.current.fov;
    camera.near = 0.1;
    camera.far = 120;
    camera.updateProjectionMatrix();
    size.current = { w: h.width, h: h.height };
    scene.background = new THREE.Color(0x15110f);
    scene.fog = new THREE.Fog(0x15110f, 22, 52);
    const amb = new THREE.AmbientLight(0xfff4e6, 0.22);
    const hemi = new THREE.HemisphereLight(0xfff0dc, 0x6b655d, 0.35);
    scene.add(amb, hemi);
    const root = new THREE.Group();
    scene.add(root);
    sceneRef.current = { h, root, sections: new Map(), nodes: new Map(), amb, hemi, poolTex: radialTexture(96, 0.0, 2.2), marble: null, theme: null };
    {
      loadTile(MUSEUM_TEXTURES.marble.image, 1).then((t) => {
        const s = sceneRef.current;
        if (!s) return;
        s.marble = t;
        builtKey.current = '';
        dirty.current = true;
      });
    }
    builtKey.current = '';
    dirty.current = true;

    const update = (hh: ThreeHandle, dt: number) => {
      const s = sceneRef.current;
      if (!s) return;
      const L = live.current;
      // travel to the current section, eased
      target.current.theta = angleOf(L.section, 0.5);
      const c = cam.current;
      const tg = target.current;
      const dbg = (globalThis as { __museumCam?: Partial<typeof tg> }).__museumCam;
      if (dbg) Object.assign(tg, dbg);
      const k = Math.min(1, dt * 5);
      c.theta += (tg.theta - c.theta) * k;
      c.yaw += (tg.yaw - c.yaw) * k;
      c.pitch += (tg.pitch - c.pitch) * k;
      c.along += (tg.along - c.along) * k;
      c.radial += (tg.radial - c.radial) * k;
      c.fov += (tg.fov - c.fov) * Math.min(1, dt * 8);
      // the viewer stands inside the ring, a little in front of the balustrade
      const standR = RING_RADIUS + 0.9 + c.radial;
      const a = c.theta + c.along / standR;
      const pos = polar(standR, a);
      pos.y = EYE_HEIGHT;
      hh.camera.position.copy(pos);
      // look outward at the wall, turned by yaw and tilted by pitch
      const look = polar(1, a + c.yaw);
      hh.camera.lookAt(pos.x + look.x, EYE_HEIGHT + Math.tan(c.pitch), pos.z + look.z);
      if (Math.abs(hh.camera.fov - c.fov) > 0.05) {
        hh.camera.fov = c.fov;
        hh.camera.updateProjectionMatrix();
      }
      // rebuild when the state, the section or the theme changed
      const key = `${L.state.version}|${L.section}|${L.state.theme}|${L.mode}|${L.selectedId ?? ''}|${s.marble ? 'm' : ''}`;
      if (key !== builtKey.current || dirty.current) {
        builtKey.current = key;
        dirty.current = false;
        sync();
      }
      // small life: born-in scale, flicker, billboards face the camera
      const t = hh.time;
      for (const n of s.nodes.values()) {
        const age = (Date.now() - n.born) / 1000;
        if (age < 0.9) {
          const e = 1 - Math.pow(1 - age / 0.9, 3);
          n.group.scale.setScalar(Math.max(0.01, e) * n.object.scale);
        }
        if (n.light && n.object.itemId === 'diya_row') n.light.intensity = (n.object.intensity ?? 1) * (0.7 + Math.sin(t * 9 + n.born % 7) * 0.12);
        if (n.billboard) {
          const p = new THREE.Vector3();
          n.billboard.getWorldPosition(p);
          const cp = hh.camera.position;
          const ang = Math.atan2(cp.x - p.x, cp.z - p.z);
          n.billboard.rotation.y = ang - n.group.rotation.y;
        }
      }
    };

    // ---- rebuild the three visible sections and their objects ----
    const sync = () => {
      const s = sceneRef.current;
      if (!s) return;
      const L = live.current;
      const pal = PALETTES[L.state.theme];
      if (s.theme !== L.state.theme) {
        s.theme = L.state.theme;
        s.amb.color.set(pal.ambient);
        s.amb.intensity = pal.ambientIntensity;
        s.hemi.color.set(pal.hemi[0]);
        s.hemi.groundColor.set(pal.hemi[1]);
        (s.h.scene.fog as THREE.Fog).color.set(pal.fog);
        (s.h.scene.background as THREE.Color).set(pal.fog);
        for (const sec of s.sections.values()) {
          s.root.remove(sec.group);
          disposeGroup(sec.group);
        }
        s.sections.clear();
      }
      const wanted = [L.section - 1, L.section, L.section + 1].filter((n) => n >= 1 && n <= L.state.sections);
      // sections
      for (const [id, sec] of [...s.sections.entries()]) {
        if (!wanted.includes(id)) {
          s.root.remove(sec.group);
          disposeGroup(sec.group);
          s.sections.delete(id);
        }
      }
      for (const id of wanted) {
        if (!s.sections.has(id)) s.sections.set(id, buildSection(id, pal, s.marble, s.h.width / s.h.height));
        const sec = s.sections.get(id)!;
        if (!sec.group.parent) s.root.add(sec.group);
        // the neighbours darker
        const dim = id === L.section ? 1 : 0.42;
        for (const m of sec.mats) m.color.setScalar(dim).multiply(new THREE.Color(m.userData.base as number));
      }
      // objects
      const want = new Map<string, MuseumObject>();
      for (const o of L.state.objects) if (o.displayStatus === 'displayed' && wanted.includes(o.sectionId)) want.set(o.objectId, o);
      for (const [id, n] of [...s.nodes.entries()]) {
        const o = want.get(id);
        if (!o || o.sectionId !== n.sectionId || JSON.stringify(o) !== JSON.stringify(n.object)) {
          s.root.remove(n.group);
          disposeGroup(n.group);
          s.nodes.delete(id);
        }
      }
      for (const o of want.values()) {
        if (s.nodes.has(o.objectId)) continue;
        const n = buildObject(o, L.artworkById, s.poolTex, pal);
        if (!n) continue;
        const recent = Date.now() - o.placedAt < 4000;
        n.born = recent ? Date.now() : 0;
        s.nodes.set(o.objectId, n);
        s.root.add(n.group);
      }
      // selection ring, neighbours dim, lit artworks brighter
      const lights = [...s.nodes.values()].filter((n) => n.light && (n.object.on ?? true));
      for (const n of s.nodes.values()) {
        const dim = n.sectionId === L.section ? 1 : 0.45;
        const sel = L.mode === 'edit' && L.selectedId === n.object.objectId;
        for (const m of n.textured) {
          let lit = 0;
          if (n.object.itemId === 'artwork' && n.object.surfaceId === 'MUSEUM_WALL') {
            for (const l of lights) {
              if (l.sectionId !== n.sectionId) continue;
              const it = MUSEUM_STORE_BY_ID[l.object.itemId];
              if (it?.render === 'spot') lit += Math.max(0, 1 - Math.abs(l.object.u - n.object.u) * WALL_LENGTH / 1.3) * (l.object.intensity ?? 1) * (Number(it.params?.intensity) || 1);
              else if (it?.render === 'wash') lit += 0.5 * (l.object.intensity ?? 1);
              else if (it?.render === 'skylight' || it?.render === 'chandelier' || it?.render === 'pendant') lit += 0.25 * (l.object.intensity ?? 1);
            }
          }
          // the picture itself glows a little so it reads in the dark, more under a light
          const e = Math.min(1.2, lit);
          if (m.emissiveMap) {
            m.emissive.set(0xffffff);
            m.emissiveIntensity = dim * (0.3 + 0.55 * Math.min(1, e));
          } else {
            m.emissive.set(sel ? 0x6a4a1e : 0x000000);
            m.emissiveIntensity = sel ? 0.6 : 0;
          }
          m.color.setScalar(dim * (0.55 + 0.45 * Math.min(1, e)));
          if (sel) m.color.multiplyScalar(1.15);
          m.needsUpdate = true;
        }
      }
    };

    return {
      update,
      dispose: () => {
        const s = sceneRef.current;
        if (!s) return;
        for (const n of s.nodes.values()) disposeGroup(n.group);
        for (const sec of s.sections.values()) disposeGroup(sec.group);
        sceneRef.current = null;
      },
    };
  }, []);

  const { onContextCreate } = useThree({ create, maxPixelRatio: 2 });

  // ---- picking and projection ----
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = (x: number, y: number) => new THREE.Vector2((x / size.current.w) * 2 - 1, -(y / size.current.h) * 2 + 1);
  const pick = (x: number, y: number): string | null => {
    const s = sceneRef.current;
    if (!s) return null;
    ray.setFromCamera(ndc(x, y), s.h.camera);
    const meshes: THREE.Object3D[] = [];
    for (const n of s.nodes.values()) if (n.sectionId === live.current.section) n.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o); });
    const hits = ray.intersectObjects(meshes, false);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.objectId) o = o.parent;
      if (o?.userData.objectId) return o.userData.objectId as string;
    }
    return null;
  };
  /** Where a screen point lands on the wall cylinder (u along the section, h height). */
  const wallAt = (x: number, y: number): { u: number; h: number } | null => {
    const s = sceneRef.current;
    if (!s) return null;
    ray.setFromCamera(ndc(x, y), s.h.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    const a = d.x * d.x + d.z * d.z;
    const b = 2 * (o.x * d.x + o.z * d.z);
    const c = o.x * o.x + o.z * o.z - WALL_RADIUS * WALL_RADIUS;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a === 0) return null;
    const t = (-b + Math.sqrt(disc)) / (2 * a);
    if (t < 0) return null;
    const p = o.clone().addScaledVector(d, t);
    let ang = Math.atan2(p.z, p.x);
    const start = sectionStart(live.current.section);
    while (ang < start - Math.PI) ang += Math.PI * 2;
    while (ang > start + Math.PI) ang -= Math.PI * 2;
    return { u: (ang - start) / SECTION_ARC, h: p.y };
  };
  const floorAt = (x: number, y: number): { u: number; h: number } | null => {
    const s = sceneRef.current;
    if (!s) return null;
    ray.setFromCamera(ndc(x, y), s.h.camera);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return null;
    let ang = Math.atan2(p.z, p.x);
    const start = sectionStart(live.current.section);
    while (ang < start - Math.PI) ang += Math.PI * 2;
    while (ang > start + Math.PI) ang -= Math.PI * 2;
    const r = Math.hypot(p.x, p.z);
    return { u: (ang - start) / SECTION_ARC, h: WALL_RADIUS - r };
  };
  const snapped = (o: MuseumObject, want: { u: number; h: number }): { u: number; h: number } | null => {
    const L = live.current;
    const widthOf = (x: MuseumObject) => museumWidthOf(x, L.artworkById);
    if (o.surfaceId === 'MUSEUM_WALL') {
      const a = o.artId ? L.artworkById(o.artId) : null;
      const it = MUSEUM_STORE_BY_ID[o.itemId];
      const w = widthOf(o);
      const hgt = a ? artworkSize(a.tier, a.aspect, o.scale).fh : (it?.size[2] ?? 0.5) * o.scale;
      return snapToWall(L.state, L.section, want.u, want.h, w, hgt, widthOf, o.objectId);
    }
    const it = MUSEUM_STORE_BY_ID[o.itemId];
    return snapToFloor(want.u, want.h, Math.max(it?.size[0] ?? 0.5, it?.size[1] ?? 0.5) * o.scale);
  };
  const previewMove = (o: MuseumObject, p: { u: number; h: number }) => {
    const s = sceneRef.current;
    const n = s?.nodes.get(o.objectId);
    if (!s || !n) return;
    const ang = angleOf(o.sectionId, p.u);
    if (o.surfaceId === 'MUSEUM_WALL') {
      const pos = polar(WALL_RADIUS - 0.03, ang);
      n.group.position.set(pos.x, p.h, pos.z);
    } else {
      const pos = polar(WALL_RADIUS - p.h, ang);
      n.group.position.set(pos.x, 0, pos.z);
    }
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
            const id = pick(e.x, e.y);
            const o = id ? live.current.state.objects.find((x) => x.objectId === id) : null;
            if (o && (o.surfaceId === 'MUSEUM_WALL' || o.surfaceId === 'MUSEUM_FLOOR')) {
              drag.current = { id: o.objectId, surface: o.surfaceId };
              onSelect?.(o.objectId);
              onDragging?.(o.objectId);
            }
          }
        })
        .onUpdate((e) => {
          const lp = lastPan.current;
          const dx = lp.pointers === e.numberOfPointers ? e.translationX - lp.x : 0;
          const dy = lp.pointers === e.numberOfPointers ? e.translationY - lp.y : 0;
          lastPan.current = { x: e.translationX, y: e.translationY, pointers: e.numberOfPointers };
          if (pressed.current && Math.hypot(e.translationX, e.translationY) > 10) pressed.current.moved = true;
          const tg = target.current;
          if (drag.current && e.numberOfPointers === 1) {
            const o = live.current.state.objects.find((x) => x.objectId === drag.current!.id);
            if (!o) return;
            const want = o.surfaceId === 'MUSEUM_WALL' ? wallAt(e.x, e.y) : floorAt(e.x, e.y);
            if (!want) return;
            const p = snapped(o, want);
            if (p) previewMove(o, p);
            return;
          }
          if (e.numberOfPointers >= 2) {
            // two fingers: walk along the section and toward or away from the wall
            tg.along = Math.max(-WALL_LENGTH * 0.42, Math.min(WALL_LENGTH * 0.42, tg.along - dx * 0.012));
            tg.radial = Math.max(-0.8, Math.min(FLOOR_DEPTH - 2.2, tg.radial - dy * 0.012));
            return;
          }
          // one finger: look around
          tg.yaw = Math.max(-1.1, Math.min(1.1, tg.yaw + dx * 0.0035));
          tg.pitch = Math.max(-0.55, Math.min(0.75, tg.pitch + dy * 0.0028));
        })
        .onEnd((e) => {
          const d = drag.current;
          drag.current = null;
          const pr = pressed.current;
          pressed.current = null;
          if (d && pr && !pr.moved) {
            // pressed on an object and let go: a selection, not a move
            onDragging?.(null);
            dirty.current = true;
            return;
          }
          if (d) {
            onDragging?.(null);
            const o = live.current.state.objects.find((x) => x.objectId === d.id);
            if (!o) return;
            const want = o.surfaceId === 'MUSEUM_WALL' ? wallAt(e.x, e.y) : floorAt(e.x, e.y);
            const p = want ? snapped(o, want) : null;
            if (p) onMove?.(o.objectId, p.u, p.h);
            else dirty.current = true;
            return;
          }
          // a press that never moved is a tap
          if (pr && !pr.moved && e.numberOfPointers <= 1) {
            onSelect?.(pick(pr.x, pr.y));
            return;
          }
          // a quick horizontal swipe walks to the next section
          if (e.numberOfPointers <= 1 && Math.abs(e.velocityX) > 650 && Math.abs(e.translationX) > 70 && Math.abs(e.translationY) < Math.abs(e.translationX) * 0.6) {
            onSwipeSection?.(e.velocityX < 0 ? 1 : -1);
            target.current.yaw = 0;
            target.current.along = 0;
          }
        })
        .onFinalize((e, success) => {
          const pr = pressed.current;
          pressed.current = null;
          if (drag.current) {
            drag.current = null;
            onDragging?.(null);
            dirty.current = true;
          }
          // the recognizer never activated: a plain tap
          if (!success && pr && !pr.moved && e.numberOfPointers <= 1) onSelect?.(pick(pr.x, pr.y));
        })
        .runOnJS(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMove, onSelect, onSwipeSection, onDragging],
  );
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          lastScale.current = 1;
        })
        .onUpdate((e) => {
          const f = e.scale / (lastScale.current || 1);
          lastScale.current = e.scale;
          target.current.fov = Math.max(28, Math.min(80, target.current.fov / (f || 1)));
        })
        .runOnJS(true),
    [],
  );
  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  useEffect(() => {
    dirty.current = true;
  }, [state, section, mode, selectedId]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.root, style]} onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      </View>
    </GestureDetector>
  );
}

// ---- builders ----------------------------------------------------------------------------

function lambert(color: number, extra: Partial<THREE.MeshLambertMaterialParameters> = {}): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color, ...extra });
  m.userData.base = color;
  return m;
}

/** A section: curved wall, floor band, ceiling, balustrade and pilasters. */
function buildSection(id: number, pal: Palette, marble: THREE.Texture | null, _aspect: number): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
  const g = new THREE.Group();
  const mats: THREE.MeshLambertMaterial[] = [];
  const start = sectionStart(id);
  const wallMat = lambert(pal.wall, { side: THREE.BackSide });
  mats.push(wallMat);
  // CylinderGeometry's theta maps to our polar angle as a = π/2 − θ; RingGeometry laid flat as a = −θ
  const cylStart = Math.PI / 2 - start - SECTION_ARC;
  const ringStart = -start - SECTION_ARC;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 24, 1, true, cylStart, SECTION_ARC), wallMat);
  wall.position.y = WALL_HEIGHT / 2;
  g.add(wall);
  // a dado and a cornice line
  const trimMat = lambert(pal.trim);
  mats.push(trimMat);
  for (const [y, hgt] of [[0.08, 0.16], [WALL_HEIGHT - 0.3, 0.3]] as [number, number][]) {
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(WALL_RADIUS - 0.02, WALL_RADIUS - 0.02, hgt, 24, 1, true, cylStart, SECTION_ARC), trimMat);
    trim.position.y = y + hgt / 2;
    (trim.material as THREE.MeshLambertMaterial).side = THREE.BackSide;
    g.add(trim);
  }
  // floor band and ceiling
  const floorMat = lambert(pal.floor);
  if (marble) {
    const t = marble.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 2);
    t.needsUpdate = true;
    floorMat.map = t;
    floorMat.color.set(0xffffff);
    floorMat.userData.base = 0xffffff;
  }
  mats.push(floorMat);
  const floor = new THREE.Mesh(new THREE.RingGeometry(RING_RADIUS - 2.5, WALL_RADIUS, 24, 1, ringStart, SECTION_ARC), floorMat);
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const ceilMat = lambert(pal.ceiling, { side: THREE.DoubleSide });
  mats.push(ceilMat);
  const ceil = new THREE.Mesh(new THREE.RingGeometry(RING_RADIUS - 2.5, WALL_RADIUS, 24, 1, ringStart, SECTION_ARC), ceilMat);
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = WALL_HEIGHT;
  g.add(ceil);
  // the inner balustrade: a low wall and a column at each section edge
  const colMat = lambert(pal.column);
  mats.push(colMat);
  const bal = new THREE.Mesh(new THREE.CylinderGeometry(RING_RADIUS, RING_RADIUS, 1.0, 24, 1, true, cylStart, SECTION_ARC), colMat);
  (bal.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
  bal.position.y = 0.5;
  g.add(bal);
  for (const a of [start, start + SECTION_ARC]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, WALL_HEIGHT, 14), colMat);
    const p = polar(RING_RADIUS, a);
    col.position.set(p.x, WALL_HEIGHT / 2, p.z);
    g.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), colMat);
    cap.position.set(p.x, WALL_HEIGHT - 0.09, p.z);
    g.add(cap);
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_HEIGHT, 0.25), colMat);
    const q = polar(WALL_RADIUS - 0.12, a);
    pil.position.set(q.x, WALL_HEIGHT / 2, q.z);
    pil.lookAt(0, WALL_HEIGHT / 2, 0);
    g.add(pil);
  }
  // an arched beam between the columns, over the floor
  const beam = new THREE.Mesh(new THREE.TorusGeometry((RING_RADIUS + WALL_RADIUS) / 2, 0.12, 8, 24, SECTION_ARC), trimMat);
  beam.rotation.set(Math.PI / 2, 0, start);
  beam.position.y = WALL_HEIGHT - 0.5;
  g.add(beam);
  return { group: g, mats };
}

/** An object: its group, placed and oriented; materials that take light. */
function buildObject(o: MuseumObject, artworkById: (id: string) => ArtworkRecord | null, poolTex: THREE.Texture, pal: Palette): Node | null {
  const g = new THREE.Group();
  g.userData.objectId = o.objectId;
  const node: Node = { group: g, object: o, sectionId: o.sectionId, mats: [], textured: [], born: 0 };
  const ang = angleOf(o.sectionId, o.u);
  const onWall = o.surfaceId === 'MUSEUM_WALL';
  if (onWall) {
    const p = polar(WALL_RADIUS - 0.03, ang);
    g.position.set(p.x, o.h, p.z);
    g.lookAt(0, o.h, 0);
  } else {
    const p = polar(WALL_RADIUS - o.h, ang);
    g.position.set(p.x, 0, p.z);
    g.lookAt(0, 0, 0);
    g.rotateY((o.rotation * Math.PI) / 180);
  }
  g.scale.setScalar(o.scale);

  if (o.itemId === 'artwork') {
    const a = o.artId ? artworkById(o.artId) : null;
    if (!a) return null;
    const sz = artworkSize(a.tier, a.aspect);
    const frame = MUSEUM_STORE_BY_ID[a.frameId === 'teak' ? 'frame_teak' : a.frameId] ?? MUSEUM_STORE_BY_ID.frame_teak;
    const fc = new THREE.Color(String(frame.params?.color ?? '#5a3b22'));
    const fw = Number(frame.params?.width ?? 1) * Math.min(sz.w, sz.h) * 0.07;
    const depth = frame.params?.float ? 0.09 : 0.05;
    const frameMat = lambert(fc.getHex());
    if (frame.params?.metal) frameMat.emissive.set(fc).multiplyScalar(0.18);
    node.mats.push(frameMat);
    const outerW = sz.w + fw * 2;
    const outerH = sz.h + fw * 2;
    const bars: [number, number, number, number][] = [
      [0, outerH / 2 - fw / 2, outerW, fw],
      [0, -outerH / 2 + fw / 2, outerW, fw],
      [-outerW / 2 + fw / 2, 0, fw, outerH],
      [outerW / 2 - fw / 2, 0, fw, outerH],
    ];
    for (const [x, y, w, h] of bars) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), frameMat);
      bar.position.set(x, y, depth / 2);
      g.add(bar);
    }
    if (frame.params?.carved || frame.params?.inlay) {
      const inner = new THREE.Mesh(new THREE.BoxGeometry(sz.w + fw * 0.6, sz.h + fw * 0.6, depth * 0.6), lambert(frame.params?.inlay ? 0xd4af37 : fc.clone().multiplyScalar(0.7).getHex()));
      inner.position.z = depth * 0.55;
      g.add(inner);
    }
    const picMat = new THREE.MeshLambertMaterial({ color: 0x8a8378 });
    picMat.userData.base = 0xffffff;
    node.textured.push(picMat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(sz.w, sz.h), picMat);
    pic.position.z = depth * 0.8 + 0.002;
    g.add(pic);
    const load = a.source.kind === 'builtin' ? loadModuleTexture(a.source.moduleId) : loadUriTexture(a.source.uri);
    load
      .then((t) => {
        picMat.map = t;
        picMat.emissiveMap = t;
        picMat.emissive.set(0xffffff);
        picMat.emissiveIntensity = 0.3;
        picMat.color.setScalar(1);
        picMat.needsUpdate = true;
      })
      .catch(() => undefined);
    // a little shadow under the frame on the wall
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(outerW * 1.08, outerH * 1.1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    sh.position.set(0.02, -0.03, 0.001);
    g.add(sh);
    return node;
  }

  const it = MUSEUM_STORE_BY_ID[o.itemId];
  if (!it) return null;
  const color = new THREE.Color(String(it.params?.color ?? '#cccccc')).getHex();
  const [w, d, hgt] = it.size;
  const add = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
  const M = (c = color, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) => { const m = lambert(c, extra); node.mats.push(m); return m; };
  const on = o.on ?? true;
  const intensity = (o.intensity ?? 1) * (Number(it.params?.intensity) || 1);
  const lightColor = new THREE.Color(String(it.params?.color ?? '#ffe0b3'));
  const pool = (radius: number, y: number, flat: boolean) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: poolTex, color: lightColor, transparent: true, opacity: on ? 0.42 * intensity : 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    if (flat) m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    node.pool = m;
    g.add(m);
    return m;
  };

  switch (it.render) {
    case 'spot': {
      // on the ceiling track above the wall point; aims down the wall
      g.position.y = WALL_HEIGHT - 0.25;
      const twin = !!it.params?.twin;
      for (const dx of twin ? [-0.35, 0.35] : [0]) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.22, 10), M(it.params?.gold ? 0xb08a2e : 0x2a2a2a))).position.set(dx, -0.12, 0.25);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.08), M(0x2a2a2a))).position.set(0, 0, 0.2);
      }
      const spot = new THREE.SpotLight(lightColor, on ? 9 * intensity : 0, 7, 0.55, 0.6, 1.2);
      spot.position.set(0, -0.1, 0.6);
      spot.target.position.set(0, -(WALL_HEIGHT - EYE_HEIGHT - 0.25), 0);
      g.add(spot, spot.target);
      node.light = spot;
      const p = pool(twin ? 1.9 : 1.4, -(WALL_HEIGHT - 0.25 - EYE_HEIGHT), false);
      p.position.z = 0.01;
      p.scale.y = 1.7;
      break;
    }
    case 'wash': {
      g.position.y = WALL_HEIGHT - 0.35;
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.2), M(0x2a2a2a))).position.z = 0.1;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_HEIGHT - 1.2), new THREE.MeshBasicMaterial({ map: poolTex, color: lightColor, transparent: true, opacity: on ? 0.35 * intensity : 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      strip.position.set(0, -(WALL_HEIGHT - 1.2) / 2 + 0.1, 0.01);
      strip.scale.x = 1.6;
      node.pool = strip;
      g.add(strip);
      const pl = new THREE.PointLight(lightColor, on ? 6 * intensity : 0, 9, 1.4);
      pl.position.set(0, -0.3, 0.9);
      g.add(pl);
      node.light = pl;
      break;
    }
    case 'uplight': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), M(0x3a3a3a))).position.y = 0.03;
      const pl = new THREE.PointLight(lightColor, on ? 5 * intensity : 0, 6, 1.5);
      pl.position.set(0, 0.3, 0);
      g.add(pl);
      node.light = pl;
      pool(0.9, 0.02, true);
      break;
    }
    case 'floorlamp': {
      const deepam = !!it.params?.deepam;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.18, hgt, 12), M(deepam ? 0xb08a2e : 0x8a6b3a))).position.y = hgt / 2;
      if (deepam) for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.03, 0.18 - i * 0.03, 0.04, 12), M(0xd4af37))).position.y = 0.4 + i * 0.32;
      else add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.32, 14, 1, true), M(0xf3e6cc, { side: THREE.DoubleSide }))).position.y = hgt - 0.16;
      const pl = new THREE.PointLight(lightColor, on ? 4 * intensity : 0, 6, 1.6);
      pl.position.y = hgt - 0.1;
      g.add(pl);
      node.light = pl;
      pool(1.3, 0.02, true);
      break;
    }
    case 'pendant':
    case 'chandelier': {
      const y = WALL_HEIGHT - hgt - 0.3;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, WALL_HEIGHT - y - hgt, 6), M(0x2a2a2a))).position.y = WALL_HEIGHT - (WALL_HEIGHT - y - hgt) / 2;
      if (it.render === 'pendant') add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, hgt, 18, 1, true), M(0xf3e6cc, { side: THREE.DoubleSide }))).position.y = y + hgt / 2;
      else {
        for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.TorusGeometry(w / 2 - i * 0.18, 0.03, 8, 24), M(0xd4af37))).position.y = y + hgt - i * 0.3;
        for (let i = 0; i < 12; i++) {
          const b = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.05), M(0xffffff, { emissive: 0xfff3d6, emissiveIntensity: 0.8 })));
          const a = (i / 12) * Math.PI * 2;
          b.position.set(Math.cos(a) * (w / 2 - 0.05), y + hgt - 0.1 - (i % 3) * 0.3, Math.sin(a) * (w / 2 - 0.05));
        }
      }
      const pl = new THREE.PointLight(lightColor, on ? (it.render === 'chandelier' ? 10 : 6) * intensity : 0, 11, 1.2);
      pl.position.y = y;
      g.add(pl);
      node.light = pl;
      pool(2.6, 0.02, true);
      break;
    }
    case 'diya_row': {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 0.24;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.04, 10), M(0xb08a2e))).position.set(x, 0.02, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 8), M(0xffc24d, { emissive: 0xff9a2e, emissiveIntensity: on ? 1.2 : 0 }))).position.set(x, 0.08, 0);
      }
      const pl = new THREE.PointLight(lightColor, on ? 3 * intensity : 0, 4, 1.8);
      pl.position.y = 0.3;
      g.add(pl);
      node.light = pl;
      break;
    }
    case 'skylight': {
      const frame = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), M(0x2a2724)));
      frame.position.y = WALL_HEIGHT - 0.05;
      const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, d - 0.2), new THREE.MeshBasicMaterial({ color: on ? 0xcfe3ff : 0x3a3f48 })));
      glass.rotation.x = Math.PI / 2;
      glass.position.y = WALL_HEIGHT - 0.11;
      const dl = new THREE.PointLight(0xdfeeff, on ? 8 * intensity : 0, 12, 1.2);
      dl.position.y = WALL_HEIGHT - 0.3;
      g.add(dl);
      node.light = dl;
      break;
    }
    case 'pedestal': {
      if (it.params?.easel) {
        for (const x of [-0.25, 0.25]) { const leg = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, hgt, 0.04), M())); leg.position.set(x, hgt / 2, 0); leg.rotation.x = -0.12; }
        add(new THREE.Mesh(new THREE.BoxGeometry(0.04, hgt * 0.9, 0.04), M())).position.set(0, hgt * 0.45, -0.3);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.08), M())).position.set(0, 0.6, 0.06);
      } else {
        const wide = !!it.params?.wide;
        add(new THREE.Mesh(wide ? new THREE.BoxGeometry(w, hgt, d) : new THREE.CylinderGeometry(w / 2, w / 2 + 0.03, hgt, 16), M())).position.y = hgt / 2;
        add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.04, d + 0.08), M())).position.y = hgt;
      }
      break;
    }
    case 'case': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt * 0.55, d), M(0x2a2724))).position.y = hgt * 0.275;
      add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, hgt * 0.45, d - 0.04), M(0xdfe9ec, { transparent: true, opacity: 0.28 }))).position.y = hgt * 0.55 + hgt * 0.225;
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), M(0x2a2724))).position.y = hgt;
      break;
    }
    case 'bench': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), M())).position.y = hgt;
      for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) add(new THREE.Mesh(new THREE.BoxGeometry(0.08, hgt, d - 0.1), M())).position.set(x, hgt / 2, 0);
      break;
    }
    case 'sofa': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt * 0.6, d), M())).position.y = hgt * 0.3;
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt * 0.4, d), M(new THREE.Color(color).multiplyScalar(1.15).getHex()))).position.y = hgt * 0.8;
      if (it.params?.daybed) add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.12), M())).position.set(0, hgt + 0.25, -d / 2 + 0.06);
      break;
    }
    case 'table': {
      if (it.params?.lectern) {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.1, hgt - 0.1, 0.1), M())).position.y = (hgt - 0.1) / 2;
        const top = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), M(0xf2ead8)));
        top.position.y = hgt;
        top.rotation.x = -0.45;
      } else {
        add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.04, 16), M())).position.y = hgt;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hgt, 8), M())).position.y = hgt / 2;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), M())).position.y = 0.015;
      }
      break;
    }
    case 'shelf': add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.25), M())).position.z = 0.125; break;
    case 'plant': {
      const spriteId = String(it.params?.sprite ?? '');
      const sp = paradiseSprite(spriteId, 7)?.sprite;
      const id = sp ? PARADISE_IMAGES[sp.file] : undefined;
      if (sp && id !== undefined) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, color: 0xffffff });
        const geo = new THREE.PlaneGeometry(sp.widthM, sp.heightM);
        geo.translate((0.5 - sp.pivot[0]) * sp.widthM, (sp.pivot[1] - 0.5) * sp.heightM, 0);
        const m = new THREE.Mesh(geo, mat);
        g.add(m);
        node.billboard = m;
        loadModuleTexture(id).then((t) => { mat.map = t; mat.needsUpdate = true; });
      } else {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 12), M(0xa85a37))).position.y = 0.2;
        add(new THREE.Mesh(new THREE.SphereGeometry(w / 2, 10, 8), M(0x4f7a3a))).position.y = 0.4 + w / 2;
      }
      break;
    }
    case 'column': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.04, hgt, 16), M())).position.y = hgt / 2;
      if (it.params?.carved) for (let i = 1; i < 6; i++) add(new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.02, 0.03, 6, 20), M(new THREE.Color(color).multiplyScalar(0.8).getHex()))).position.y = i * (hgt / 6);
      add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.15, w + 0.3), M())).position.y = hgt - 0.075;
      break;
    }
    case 'arch': {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -hgt / 2);
      shape.lineTo(-w / 2, hgt / 2 - w / 2);
      if (it.params?.cusped) {
        const n = 5;
        for (let i = 0; i <= n; i++) {
          const a = Math.PI - (i / n) * Math.PI;
          const r = w / 2 + (i % 2 ? 0.08 : 0);
          shape.lineTo(Math.cos(a) * r, hgt / 2 - w / 2 + Math.sin(a) * r);
        }
      } else shape.absarc(0, hgt / 2 - w / 2, w / 2, Math.PI, 0, true);
      shape.lineTo(w / 2, -hgt / 2);
      shape.lineTo(-w / 2, -hgt / 2);
      const hole = new THREE.Path();
      const iw = w / 2 - 0.22;
      hole.moveTo(-iw, -hgt / 2 + 0.1);
      hole.lineTo(-iw, hgt / 2 - w / 2);
      hole.absarc(0, hgt / 2 - w / 2, iw, Math.PI, 0, true);
      hole.lineTo(iw, -hgt / 2 + 0.1);
      hole.lineTo(-iw, -hgt / 2 + 0.1);
      shape.holes.push(hole);
      const arch = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }), M()));
      arch.position.z = 0.02;
      const back = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, hgt - 0.1), M(new THREE.Color(color).multiplyScalar(0.72).getHex())));
      back.position.z = -0.01;
      break;
    }
    case 'niche': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, hgt + 0.1, 0.06), M())).position.z = 0.03;
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.05), M(new THREE.Color(color).multiplyScalar(0.55).getHex()))).position.z = 0.04;
      const pl = new THREE.PointLight(0xffe2b8, on ? 1.5 : 0, 2, 2);
      pl.position.set(0, hgt / 2 - 0.1, 0.2);
      g.add(pl);
      node.light = pl;
      break;
    }
    case 'jaali': {
      const mat = M(color, { transparent: true, opacity: 0.92 });
      for (let i = 0; i < 6; i++) for (let j = 0; j < 9; j++) {
        const t = add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 10), mat));
        t.position.set((i - 2.5) * 0.26, 0.2 + j * 0.26, 0);
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.1), mat)).position.y = hgt;
      for (const x of [-w / 2, w / 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.08, hgt, 0.1), mat)).position.set(x, hgt / 2, 0);
      break;
    }
    case 'rug': case 'rangoli': {
      const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d), M()));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      const inner = add(new THREE.Mesh(it.render === 'rangoli' ? new THREE.CircleGeometry(w * 0.36, 8) : new THREE.PlaneGeometry(w * 0.7, d * 0.7), M(it.render === 'rangoli' ? 0xf2c230 : new THREE.Color(color).multiplyScalar(1.4).getHex())));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.014;
      if (it.params?.ornate) {
        const med = add(new THREE.Mesh(new THREE.CircleGeometry(d * 0.22, 12), M()));
        med.rotation.x = -Math.PI / 2;
        med.position.y = 0.016;
      }
      break;
    }
    case 'rope': {
      for (const x of [-w / 2, w / 2]) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, hgt, 8), M(0xb08a2e))).position.set(x, hgt / 2, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), M(0xb08a2e))).position.set(x, 0.015, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M(0xb08a2e))).position.set(x, hgt, 0);
      }
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-w / 2, hgt - 0.05, 0), new THREE.Vector3(0, hgt - 0.3, 0), new THREE.Vector3(w / 2, hgt - 0.05, 0)]);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.02, 6), M()));
      break;
    }
    case 'plaque': case 'sign': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.02), M())).position.z = 0.01;
      const lines = it.render === 'sign' ? 1 : 3;
      for (let i = 0; i < lines; i++) add(new THREE.Mesh(new THREE.BoxGeometry(w * (0.7 - i * 0.15), hgt * (lines === 1 ? 0.4 : 0.12), 0.004), M(it.render === 'sign' ? 0xf4efe6 : 0x3a3330))).position.set(-w * 0.1 + (i * w * 0.075), (lines === 1 ? 0 : hgt * 0.3 - i * hgt * 0.26), 0.023);
      break;
    }
    case 'statue': {
      const kind = String(it.params?.kind ?? '');
      if (kind === 'nandi') {
        add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, hgt * 0.5, d), M())).position.y = hgt * 0.3;
        add(new THREE.Mesh(new THREE.SphereGeometry(d * 0.42, 10, 8), M())).position.set(w * 0.4, hgt * 0.65, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(d * 0.5, 10, 8), M())).position.set(-w * 0.1, hgt * 0.7, 0);
        for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), M(0xf2e9d8))).position.set(w * 0.45, hgt * 0.95, s * 0.15);
      } else if (kind === 'elephant') {
        add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, hgt * 0.5, d), M())).position.y = hgt * 0.55;
        for (const x of [-0.4, 0.4]) for (const z of [-0.22, 0.22]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, hgt * 0.35, 8), M())).position.set(x * w * 0.6, hgt * 0.17, z * d);
        add(new THREE.Mesh(new THREE.SphereGeometry(d * 0.42, 10, 8), M())).position.set(w * 0.45, hgt * 0.75, 0);
        const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, hgt * 0.6, 8), M()));
        trunk.position.set(w * 0.72, hgt * 0.45, 0);
        for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), M(new THREE.Color(color).multiplyScalar(0.9).getHex()))).position.set(w * 0.4, hgt * 0.8, s * d * 0.45);
      } else {
        // the peacock: a body, a neck and a fan
        add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M())).position.y = 0.16;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8), M())).position.set(0.08, 0.32, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M())).position.set(0.1, 0.45, 0);
        const fan = add(new THREE.Mesh(new THREE.CircleGeometry(0.25, 16, Math.PI * 0.1, Math.PI * 0.8), M(0x2f7a6b, { side: THREE.DoubleSide })));
        fan.position.set(-0.1, 0.18, 0);
        fan.rotation.y = Math.PI / 2;
      }
      break;
    }
    case 'vase': {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push(new THREE.Vector2((0.35 + Math.sin(t * Math.PI) * 0.65) * (w / 2), t * hgt));
      }
      add(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), M(color, { side: THREE.DoubleSide })));
      break;
    }
    case 'bust': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), M())).position.y = 0.04;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, hgt * 0.35, 10), M())).position.y = hgt * 0.25;
      add(new THREE.Mesh(new THREE.SphereGeometry(hgt * 0.26, 12, 10), M())).position.y = hgt * 0.7;
      break;
    }
    case 'bell': {
      for (const x of [-0.2, 0.2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.06, hgt, 0.06), M(0x5a3b22))).position.set(x, hgt / 2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.1), M(0x5a3b22))).position.y = hgt;
      const pts = [new THREE.Vector2(0.02, 0.5), new THREE.Vector2(0.12, 0.45), new THREE.Vector2(0.16, 0.2), new THREE.Vector2(0.22, 0.02), new THREE.Vector2(0.2, 0)];
      add(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), M(color, { side: THREE.DoubleSide }))).position.y = hgt - 0.55;
      break;
    }
    case 'mirror': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.04), M())).position.z = 0.02;
      const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, hgt - 0.12), new THREE.MeshBasicMaterial({ color: 0xcfd8df })));
      glass.position.z = 0.045;
      break;
    }
    case 'curtain': {
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.05, hgt, 12, 1, true), M(color, { side: THREE.DoubleSide })));
      m.position.set(0, hgt / 2, 0.3);
      m.scale.z = 0.5;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w + 0.4, 8), M(0xb08a2e))).rotation.z = Math.PI / 2;
      g.children[g.children.length - 1].position.set(0, hgt, 0.3);
      break;
    }
    case 'fountain': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.35, 24), M())).position.y = 0.175;
      add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2 - 0.12, w / 2 - 0.12, 0.06, 24), new THREE.MeshLambertMaterial({ color: 0x6aa6c0, transparent: true, opacity: 0.8 }))).position.y = 0.36;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.6, 12), M())).position.y = 0.65;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.12, 20), M())).position.y = 0.98;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), M(0xe9f3f8, { transparent: true, opacity: 0.7 }))).position.y = 1.2;
      const pl = new THREE.PointLight(0xcfe6f2, 2, 5, 1.8);
      pl.position.y = 1.0;
      g.add(pl);
      break;
    }
    case 'camera': {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0x2b2b2b, { side: THREE.DoubleSide }))).position.set(0, WALL_HEIGHT - o.h - 0.02, 0.05);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), M(0xff2a2a, { emissive: 0xff0000, emissiveIntensity: 1.5 }))).position.set(0.03, WALL_HEIGHT - o.h - 0.06, 0.1);
      break;
    }
    case 'sensor': add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), M())).position.z = 0.025; break;
    case 'extinguisher': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, hgt, 12), M())).position.set(0, 0, 0.1);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.02), M(0x2a2a2a))).position.set(0, hgt * 0.35, 0.01);
      break;
    }
    case 'torana': {
      for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.35, hgt, 0.35), M())).position.set(x, hgt / 2, 0);
      for (let i = 0; i < 3; i++) {
        const beam = add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.25, 0.3), M(new THREE.Color(color).multiplyScalar(0.9 + i * 0.05).getHex())));
        beam.position.y = hgt - 0.9 + i * 0.42;
      }
      break;
    }
    case 'scroll': {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), M()));
      m.position.y = 0.005;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, d, 8), M(0x8a5a2b))).rotation.x = Math.PI / 2;
      g.children[g.children.length - 1].position.set(-w / 2, 0.03, 0);
      break;
    }
    case 'planter_box': {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, hgt * 0.7, d), M())).position.y = hgt * 0.35;
      for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), M([0xd94f3d, 0xf2b134, 0xd94f3d, 0xe8738f, 0xf2b134][i]))).position.set((i - 2) * (w / 5), hgt * 0.78, 0);
      break;
    }
    case 'frame':
      return null;
  }
  // small objects rest on their carrier's top
  if (o.surfaceId === 'DISPLAY_PEDESTAL' || o.surfaceId === 'TABLETOP' || o.surfaceId === 'SHELF' || o.surfaceId === 'DISPLAY_CASE') {
    const y = o.y ?? 1.0;
    const p = o.surfaceId === 'SHELF' ? polar(WALL_RADIUS - 0.16, ang) : polar(WALL_RADIUS - o.h, ang);
    g.position.set(p.x, y, p.z);
    g.lookAt(0, y, 0);
    g.rotateY((o.rotation * Math.PI) / 180);
  }
  if (isLightItem(o.itemId)) g.userData.light = true;
  return node;
}

export { PALETTES };

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: '#15110f' },
});
