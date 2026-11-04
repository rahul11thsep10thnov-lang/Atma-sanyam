// The prototype's renderer-independent core: lights, sky, optional image-based
// lighting, an orbit camera (pan, pinch zoom, overview and close-up), picking,
// plant placement, selection and performance counters. It takes a ready
// THREE.WebGLRenderer, so it runs on an expo-gl view on a phone and on a plain
// canvas in a browser.
import * as THREE from 'three';
import { SPECIES_BY_ID } from './catalog';
import { Specimen } from './garden';
import { caps, clock, skyDome } from './materials';
import { Arboretum, Collection, DEG, ProtoScene, SceneName, View, createArboretum, createCollection, createConservatory } from './scenes';
import { V } from './geo';
import { clamp } from './rng';

export type TimeOfDay = 'day' | 'golden' | 'dusk';

interface Look {
  sun: number;
  sunI: number;
  sunPos: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  skyTop: number;
  skyHorizon: number;
  skyGround: number;
  fog: number;
  fogD: number;
  exposure: number;
  halo: number;
  env: number;
}

const LOOKS: Record<TimeOfDay, Look> = {
  day: { sun: 0xfff2dc, sunI: 3.4, sunPos: [-0.5, 0.78, 0.45], hemiSky: 0xbddaff, hemiGround: 0x748446, hemiI: 0.5, skyTop: 0x6fa6dc, skyHorizon: 0xe9efe4, skyGround: 0xdde6cc, fog: 0xdde8dc, fogD: 0.0032, exposure: 1.0, halo: 0.25, env: 0.75 },
  golden: { sun: 0xffc98a, sunI: 3.1, sunPos: [-0.8, 0.42, 0.5], hemiSky: 0xf3c9a0, hemiGround: 0x6a6a3a, hemiI: 0.45, skyTop: 0x7c9ed0, skyHorizon: 0xf7d2a4, skyGround: 0xe9d6ae, fog: 0xf0d8b4, fogD: 0.0038, exposure: 1.05, halo: 0.6, env: 0.7 },
  dusk: { sun: 0xffa874, sunI: 1.5, sunPos: [-0.9, 0.2, 0.4], hemiSky: 0x8c86b8, hemiGround: 0x3e3e3a, hemiI: 0.42, skyTop: 0x2e3a72, skyHorizon: 0xe8a07a, skyGround: 0x6e6270, fog: 0xb89aa0, fogD: 0.0042, exposure: 1.0, halo: 1.0, env: 0.45 },
};

export interface PickInfo {
  kind: 'specimen' | 'banyan' | 'collection' | 'slot' | 'ground' | 'corridor';
  /** Where a tap met the floor (wing coordinates), for zone taps. */
  at?: { x: number; z: number };
  id?: string;
  speciesId?: string;
  name?: string;
  hindi?: string;
  scientific?: string;
  blurb?: string;
  stage?: number;
  simDays?: number;
  zone?: string;
  slotId?: number;
  screen: { x: number; y: number };
}

export interface Stats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  scene: SceneName;
  specimens: number;
  env: boolean;
  shadows: boolean;
  pixelRatio: number;
  size: string;
  extra: Record<string, string | number>;
}

export interface EngineOptions {
  quality?: 'high' | 'safe';
  onStats?: (s: Stats) => void;
  onSelect?: (p: PickInfo | null) => void;
  onPlaced?: (p: PickInfo) => void;
  /** Report taps on bare ground (for zone information). */
  groundTaps?: boolean;
  onLabels?: (l: { id: string; speciesId: string; name: string; x: number; y: number }[]) => void;
}

const FOV = 26;

export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 800);
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 0.5);
  private sky: THREE.Mesh | null = null;
  private current: ProtoScene | null = null;
  private cache: Partial<Record<SceneName, ProtoScene>> = {};
  private width = 1;
  private height = 1;
  private t = 0;
  private frameN = 0;
  private acc = { frames: 0, ms: 0, last: 0 };
  private statsSnap: Stats | null = null;
  private look: TimeOfDay = 'day';
  private raycaster = new THREE.Raycaster();
  private selectionRing: THREE.Mesh;
  private selectedId: string | null = null;
  private placing: string | null = null;
  private labelClock = 0;
  readonly opts: EngineOptions;
  hasEnv = false;
  private envTex: THREE.Texture | null = null;
  paused = false;
  /** 0 freezes wind, water and wildlife (reduce motion); the camera still moves on request. */
  motion = 1;
  /** Drawing-buffer pixels per layout unit (touch coordinates arrive in layout units). */
  uiScale = 1;

  // orbit state (current follows goal)
  private cur = { target: V(0, 1, 0), fit: 12, yaw: 45 * DEG, pitch: 38 * DEG };
  private goal = { target: V(0, 1, 0), fit: 12, yaw: 45 * DEG, pitch: 38 * DEG };
  private home: View | null = null;

  constructor(readonly renderer: THREE.WebGLRenderer, width: number, height: number, opts: EngineOptions = {}) {
    this.opts = opts;
    const safe = opts.quality === 'safe';
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    const ms = safe ? 1024 : 2048;
    this.sun.shadow.mapSize.set(ms, ms);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.selectionRing = new THREE.Mesh(
      (() => {
        const g = new THREE.RingGeometry(0.86, 1, 48);
        g.rotateX(-Math.PI / 2);
        return g;
      })(),
      new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.selectionRing.visible = false;
    this.selectionRing.renderOrder = 6;
    this.scene.add(this.selectionRing);
    this.tryEnvironment();
    this.resize(width, height);
    this.setTimeOfDay('day');
  }

  // ---- lighting ---------------------------------------------------------------------------------------

  /** Image-based light from a procedural sky: only where the phone supports float targets. */
  private tryEnvironment() {
    caps.env = false;
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const ok = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
      if (!ok || this.opts.quality === 'safe') return;
      const pm = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.add(skyDome(0x9cc4f0, 0xfff0d8, 0x8a9a64, V(-0.5, 0.78, 0.45).normalize()));
      const bright = new THREE.Mesh(new THREE.SphereGeometry(40, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 8, 6.5) }));
      bright.position.set(-120, 190, 110);
      envScene.add(bright);
      const rt = pm.fromScene(envScene, 0.03);
      this.envTex = rt.texture;
      this.scene.environment = rt.texture;
      pm.dispose();
      this.hasEnv = true;
      caps.env = true;
    } catch {
      this.hasEnv = false;
      this.scene.environment = null;
    }
  }

  setTimeOfDay(look: TimeOfDay) {
    this.look = look;
    const L = LOOKS[look];
    this.sun.color.set(L.sun);
    this.sun.intensity = L.sunI;
    const sp = V(...L.sunPos).normalize();
    this.sunDirection.copy(sp);
    this.hemi.color.set(L.hemiSky);
    this.hemi.groundColor.set(L.hemiGround);
    this.hemi.intensity = this.hasEnv ? L.hemiI * 0.5 : L.hemiI * 1.7;
    this.scene.environmentIntensity = L.env;
    this.scene.fog = new THREE.FogExp2(L.fog, L.fogD);
    this.renderer.toneMappingExposure = L.exposure;
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky.geometry.dispose();
      (this.sky.material as THREE.Material).dispose();
    }
    this.sky = skyDome(L.skyTop, L.skyHorizon, L.skyGround, sp);
    this.scene.add(this.sky);
    for (const s of Object.values(this.cache)) {
      const halo = s?.group.getObjectByName('halo') as THREE.Points | undefined;
      if (halo) (halo.material as THREE.PointsMaterial).opacity = L.halo;
    }
    this.placeSun();
  }
  readonly sunDirection = V(-0.5, 0.78, 0.45);
  get timeOfDay() {
    return this.look;
  }

  private placeSun() {
    const c = this.cur.target;
    this.sun.position.copy(c).addScaledVector(this.sunDirection, 70);
    this.sun.target.position.copy(c);
    const ext = this.current?.name === 'arboretum' ? 28 : this.current?.name === 'collection' ? 22 : 15;
    const cam = this.sun.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 10;
    cam.far = 160;
    cam.updateProjectionMatrix();
  }

  // ---- scenes -----------------------------------------------------------------------------------------

  /** Build (once) and return a scene. Heavy: the UI should show a busy state first. */
  ensureScene(name: SceneName): ProtoScene {
    let s = this.cache[name];
    if (!s) {
      s =
        name === 'conservatory'
          ? createConservatory()
          : name === 'arboretum'
            ? createArboretum()
            : name === 'world-conservatory'
              ? createConservatory({ populate: false })
              : name === 'world-arboretum'
                ? createArboretum({ populate: false })
                : createCollection();
      this.cache[name] = s;
      const halo = s.group.getObjectByName('halo') as THREE.Points | undefined;
      if (halo) (halo.material as THREE.PointsMaterial).opacity = LOOKS[this.look].halo;
    }
    return s;
  }

  setScene(name: SceneName) {
    const next = this.ensureScene(name);
    if (this.current) this.scene.remove(this.current.group);
    this.cancelPlacement();
    this.select(null);
    this.current = next;
    this.scene.add(next.group);
    this.setView('overview', true);
    this.placeSun();
  }

  get currentScene(): ProtoScene | null {
    return this.current;
  }

  // ---- camera -----------------------------------------------------------------------------------------

  setView(which: 'overview' | 'closeup' | 'landscape', snap = false) {
    const s = this.current;
    if (!s) return;
    const v = which === 'overview' ? s.overview : which === 'closeup' ? s.closeup : (s.landscape ?? s.overview);
    this.home = s.overview;
    this.goal.target.copy(v.target);
    this.goal.fit = v.fit;
    this.goal.yaw = v.yaw;
    this.goal.pitch = v.pitch;
    if (snap) {
      this.cur.target.copy(this.goal.target);
      this.cur.fit = this.goal.fit;
      this.cur.yaw = this.goal.yaw;
      this.cur.pitch = this.goal.pitch;
      this.updateCamera(0);
    }
  }

  /** Fly the camera to look at a world point (e.g. a tapped specimen). */
  focusOn(p: THREE.Vector3, fit: number) {
    this.goal.target.copy(p);
    this.goal.fit = clamp(fit, this.current?.minFit ?? 1, this.current?.maxFit ?? 30);
  }

  zoomBy(factor: number) {
    const s = this.current;
    if (!s) return;
    this.goal.fit = clamp(this.goal.fit / factor, s.minFit, s.maxFit);
  }

  private worldPerPixel(): number {
    return (2 * this.dist(this.goal.fit) * Math.tan((FOV * DEG) / 2)) / this.height;
  }

  panBy(dxIn: number, dyIn: number) {
    const s = this.current;
    if (!s) return;
    const dx = dxIn * this.uiScale;
    const dy = dyIn * this.uiScale;
    const wpp = this.worldPerPixel();
    const yaw = this.goal.yaw;
    const right = V(Math.cos(yaw), 0, -Math.sin(yaw));
    const fwd = V(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.goal.target.addScaledVector(right, -dx * wpp).addScaledVector(fwd, (dy * wpp) / Math.max(0.35, Math.sin(this.goal.pitch)));
    const home = s.overview.target;
    const off = V(this.goal.target.x - home.x, 0, this.goal.target.z - home.z);
    if (off.length() > s.bound) {
      off.setLength(s.bound);
      this.goal.target.x = home.x + off.x;
      this.goal.target.z = home.z + off.z;
    }
  }

  orbitBy(dx: number, dy: number) {
    this.goal.yaw -= dx * this.uiScale * 0.006;
    this.goal.pitch = clamp(this.goal.pitch + dy * this.uiScale * 0.004, 16 * DEG, 74 * DEG);
  }

  rotateBy(angle: number) {
    this.goal.yaw -= angle;
  }

  private dist(fit: number) {
    return fit / (Math.tan((FOV * DEG) / 2) * Math.min(this.width / this.height, 1));
  }

  private updateCamera(dt: number) {
    const k = dt <= 0 ? 1 : 1 - Math.exp(-dt * 6.5);
    this.cur.target.lerp(this.goal.target, k);
    this.cur.fit += (this.goal.fit - this.cur.fit) * k;
    this.cur.pitch += (this.goal.pitch - this.cur.pitch) * k;
    let dy = this.goal.yaw - this.cur.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.cur.yaw += dy * k;
    const d = this.dist(this.cur.fit);
    const cp = Math.cos(this.cur.pitch);
    this.camera.position.set(this.cur.target.x + Math.sin(this.cur.yaw) * cp * d, this.cur.target.y + Math.sin(this.cur.pitch) * d, this.cur.target.z + Math.cos(this.cur.yaw) * cp * d);
    this.camera.near = Math.max(0.5, d - 90);
    this.camera.far = d + 700;
    this.camera.lookAt(this.cur.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  resize(w: number, h: number) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.camera.aspect = this.width / this.height;
    this.renderer.setSize(this.width, this.height, false);
    this.updateCamera(0);
  }

  // ---- picking / placement / selection ----------------------------------------------------------------------

  private ndc(x: number, y: number) {
    return new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
  }

  private specimenInfo(sp: Specimen): PickInfo {
    const s = SPECIES_BY_ID[sp.speciesId]!;
    const slot = (this.current as ProtoScene).garden!.slots[sp.slot]!;
    return { kind: 'specimen', id: sp.id, speciesId: sp.speciesId, name: s.name, hindi: s.hindi, scientific: s.scientific, blurb: s.blurb, stage: sp.stage, simDays: sp.simDays, zone: slot.zone, slotId: sp.slot, screen: { x: 0, y: 0 } };
  }

  /** A tap at (x, y) in view pixels. */
  tap(xIn: number, yIn: number): PickInfo | null {
    const s = this.current;
    if (!s) return null;
    const x = xIn * this.uiScale;
    const y = yIn * this.uiScale;
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);

    // placement mode: the nearest lit slot to where the ray meets the ground
    if (this.placing && s.garden) {
      const g = s.garden;
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = this.raycaster.ray.intersectPlane(ground, new THREE.Vector3());
      const picked = hit ? g.nearestMarker(hit.x, hit.z, 1.4) : null;
      if (picked) {
        const sp = g.add(this.placing, 1, picked.id, { animate: true, time: this.t, days: 0 });
        if (sp) {
          const info = this.specimenInfo(sp);
          this.cancelPlacement();
          this.select(sp.id);
          this.opts.onPlaced?.(info);
          this.opts.onSelect?.(info);
          return info;
        }
      }
      return { kind: 'ground', screen: { x: xIn, y: yIn } };
    }

    const targets: THREE.Object3D[] = [...(s.garden?.proxies ?? []), ...s.extraPickables];
    const hits = this.raycaster.intersectObjects(targets, false);
    const h = hits[0];
    if (!h) {
      this.select(null);
      if (this.opts.groundTaps) {
        const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
        if (hit) {
          const info: PickInfo = { kind: 'ground', at: { x: hit.x, z: hit.z }, screen: { x: xIn, y: yIn } };
          this.opts.onSelect?.(info);
          return info;
        }
      }
      this.opts.onSelect?.(null);
      return null;
    }
    const ud = h.object.userData as { kind: string; id: string; speciesId?: string; stage?: number };
    if (ud.kind === 'corridor') {
      this.select(null);
      const info: PickInfo = { kind: 'corridor', screen: { x: xIn, y: yIn } };
      this.opts.onSelect?.(info);
      return info;
    }
    if (ud.kind === 'banyan') {
      this.select(null);
      const info: PickInfo = { kind: 'banyan', id: 'grand-banyan', name: 'The Grand Banyan', screen: { x: xIn, y: yIn } };
      this.opts.onSelect?.(info);
      const c = (s as Arboretum).banyan;
      if (c) this.focusOn(V(0, 6.2, 0), Math.min(this.goal.fit, 13));
      return info;
    }
    if (ud.kind === 'collection') {
      const sp = SPECIES_BY_ID[ud.speciesId!]!;
      const info: PickInfo = { kind: 'collection', id: ud.id, speciesId: sp.id, name: sp.name, hindi: sp.hindi, scientific: sp.scientific, blurb: sp.blurb, stage: ud.stage, screen: { x: xIn, y: yIn } };
      this.opts.onSelect?.(info);
      return info;
    }
    const spec = s.garden?.specimens.get(ud.id);
    if (!spec) return null;
    this.select(spec.id);
    const info = this.specimenInfo(spec);
    info.screen = { x: xIn, y: yIn };
    this.opts.onSelect?.(info);
    const p = spec.mesh.position;
    this.focusOn(V(p.x, p.y + 0.6, p.z), Math.min(this.goal.fit, 3.2 + spec.stage * 0.5));
    return info;
  }

  select(id: string | null) {
    this.selectedId = id;
    const sp = id ? this.current?.garden?.specimens.get(id) : null;
    this.selectionRing.visible = !!sp;
    if (sp) {
      this.selectionRing.position.set(sp.mesh.position.x, sp.mesh.position.y + 0.05, sp.mesh.position.z);
      const r = Math.max(0.5, Math.min(3, sp.proxy.scale.x * 1.25));
      this.selectionRing.scale.set(r, 1, r);
    }
  }

  /** Light up the free positions for a species (water plants on water, the rest on land). */
  startPlacement(speciesId: string): number {
    const g = this.current?.garden;
    const sp = SPECIES_BY_ID[speciesId];
    if (!g || !sp) return 0;
    this.placing = speciesId;
    this.markerKind = sp.water ? 'water' : 'land';
    g.showMarkers(this.markerKind, this.markerSize());
    this.markerFit = this.goal.fit;
    return g.markerCount;
  }

  cancelPlacement() {
    this.placing = null;
    this.current?.garden?.showMarkers(null);
  }

  private markerKind: 'land' | 'water' = 'land';
  private markerFit = 0;
  /** Placement rings grow with the view so they stay visible when zoomed out. */
  private markerSize() {
    return clamp(this.goal.fit / 9, 0.8, 3.2);
  }

  get placingSpecies() {
    return this.placing;
  }

  /** Simulate growth: the selected specimen takes its next stage (a new shape). */
  growSelected(): PickInfo | null {
    const g = this.current?.garden;
    const sp = this.selectedId ? g?.specimens.get(this.selectedId) : null;
    if (!g || !sp || sp.stage >= 7) return sp ? this.specimenInfo(sp) : null;
    g.setStage(sp.id, sp.stage + 1);
    sp.simDays += 25;
    this.select(sp.id);
    const info = this.specimenInfo(sp);
    this.opts.onSelect?.(info);
    return info;
  }

  setLandscapeState(i: number) {
    const a = this.current as Arboretum | null;
    if (a && a.name === 'arboretum') {
      this.select(null);
      a.setState(i);
    }
  }

  setCollection(mode: 'shelf' | 'trees' | 'growth', speciesId: string, stage: number) {
    const c = this.current as Collection | null;
    if (c && c.name === 'collection') {
      c.setMode(mode, speciesId, stage);
      this.setView('overview');
    }
  }

  project(v: THREE.Vector3): { x: number; y: number } | null {
    const p = v.clone().project(this.camera);
    if (p.z > 1) return null;
    return { x: (((p.x + 1) / 2) * this.width) / this.uiScale, y: (((1 - p.y) / 2) * this.height) / this.uiScale };
  }

  // ---- frame ---------------------------------------------------------------------------------------------------

  frame(dtIn: number) {
    if (this.paused || !this.current) return;
    const dt = Math.min(0.1, dtIn);
    this.t += dt * this.motion;
    clock.uTime.value = this.t;
    this.updateCamera(dt);
    this.cutaway();
    this.placeSunLater();
    this.current.update(dt * this.motion, this.t);
    if (this.frameN % 10 === 0) this.updateLod();
    if (this.placing && this.current.garden && Math.abs(this.goal.fit / (this.markerFit || 1) - 1) > 0.12) {
      this.markerFit = this.goal.fit;
      this.current.garden.showMarkers(this.markerKind, this.markerSize());
    }
    if (this.selectionRing.visible) {
      const k = 1 + 0.06 * Math.sin(this.t * 4);
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(this.t * 4) * k * 0.5;
    }
    const r = this.renderer;
    const t0 = performance.now();
    r.info.reset();
    const water = this.current.diorama?.water;
    if (water && this.frameN % 2 === 0) water.renderReflection(r, this.scene, this.camera, this.current.hide);
    r.render(this.scene, this.camera);
    this.frameN++;
    const ms = performance.now() - t0;
    this.acc.frames++;
    this.acc.ms += ms;
    const now = performance.now();
    if (!this.acc.last) this.acc.last = now;
    if (now - this.acc.last > 700) {
      const secs = (now - this.acc.last) / 1000;
      this.statsSnap = {
        fps: this.acc.frames / secs,
        frameMs: this.acc.ms / Math.max(1, this.acc.frames),
        drawCalls: r.info.render.calls,
        triangles: r.info.render.triangles,
        geometries: r.info.memory.geometries,
        textures: r.info.memory.textures,
        scene: this.current.name,
        specimens: this.current.garden?.specimens.size ?? 0,
        env: this.hasEnv,
        shadows: true,
        pixelRatio: r.getPixelRatio(),
        size: `${this.width}×${this.height}`,
        extra: this.current.info(),
      };
      this.acc = { frames: 0, ms: 0, last: now };
      this.opts.onStats?.(this.statsSnap);
    }
    if (this.current.name === 'collection' && this.opts.onLabels) {
      this.labelClock += dt;
      if (this.labelClock > 0.15) {
        this.labelClock = 0;
        this.opts.onLabels((this.current as Collection).labels((v) => this.project(v)));
      }
    }
  }

  /** Close in, the dome's glass and ribs would stand between the camera and the plants:
   * like a cutaway model, they fade away as you zoom in and return for the overview. */
  private cutaway() {
    const s = this.current;
    if (!s || s.name === 'collection') return;
    const show = this.cur.fit > s.maxFit * 0.42;
    for (const n of ['dome-frame', 'glass']) {
      const o = s.group.getObjectByName(n);
      if (o && o.visible !== show) o.visible = show;
    }
  }

  /** Specimens far from the camera (small on screen) use thinned geometry. */
  private updateLod() {
    const g = this.current?.garden;
    if (!g) return;
    const cam = this.camera.position;
    const k = this.height / (2 * Math.tan((FOV * DEG) / 2));
    g.updateLod((sp) => {
      const d = Math.max(1, cam.distanceTo(sp.mesh.position));
      return ((sp.proxy.scale.y) / d) * k / this.uiScale;
    });
  }

  private placeSunLater() {
    // keep the shadow frustum on whatever the camera looks at
    this.sun.position.copy(this.cur.target).addScaledVector(this.sunDirection, 70);
    this.sun.target.position.copy(this.cur.target);
  }

  get stats(): Stats | null {
    return this.statsSnap;
  }

  dispose() {
    for (const s of Object.values(this.cache)) s?.dispose();
    this.envTex?.dispose();
    this.sky?.geometry.dispose();
    this.renderer.dispose();
  }
}
