import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { EnvironmentDefinition, UserPlacedObject } from '../state/types';
import { createRenderer } from './Renderer';
import { buildShell } from './ProceduralShell';
import { createSky } from './Sky';
import { CameraController } from './CameraController';
import { ObjectSystem } from './ObjectSystem';
import { PlacementController } from './PlacementController';
import { QualityProfile } from './QualityProfile';

export interface Viewport {
  width: number; // in points (dp) — what gestures report
  height: number;
}

/**
 * The Balcony World engine (architecture doc, section B): owns the three.js
 * scene, the GL renderer, the camera controller, the object system and the
 * render-on-demand loop. The screen hands it a GL context, a viewport and
 * gesture deltas; everything else lives here, framework-free.
 */
export class BalconyEngine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controller: CameraController;
  readonly objects: ObjectSystem;
  readonly placement = new PlacementController();
  readonly renderer: THREE.WebGLRenderer;

  /** Fires after any frame in which the camera moved — the screen persists it. */
  onCameraChanged: (() => void) | null = null;

  private dirty = true;
  private running = false;
  private rafId: number | null = null;
  private lastAmbientAt = 0;
  private disposed = false;
  private bufferWidth = 0;
  private bufferHeight = 0;
  private lastRenderAt = 0;
  /** Exponential moving average of rendered frames per second — what the
   * stats overlay shows and what the performance step tunes against. */
  fps = 0;

  constructor(
    private readonly gl: ExpoWebGLRenderingContext,
    readonly definition: EnvironmentDefinition,
    readonly profile: QualityProfile,
    viewport: Viewport,
  ) {
    this.renderer = createRenderer(gl, {
      antialias: profile.antialias,
      resolutionScale: profile.resolutionScale,
      shadowMap: profile.shadowMap,
    });

    // A phone held upright has a narrow horizontal field of view; a wider
    // vertical FOV in portrait keeps the whole balcony width in frame.
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    this.camera = new THREE.PerspectiveCamera(viewport.width > viewport.height ? 46 : 62, aspect, 0.1, 260);

    const shell = definition.shell.params;
    const cam = definition.camera;
    this.controller = new CameraController(
      {
        yaw: [-0.85, 0.85],
        pitch: [-0.05, 0.45],
        distance: cam.zoom,
        targetBox: { min: [-shell.width / 2 + 0.6, 0.6, -shell.balconyDepth + 0.3], max: [shell.width / 2 - 0.6, 1.7, 0.5] },
        eyeBox: {
          min: [-shell.width / 2 + 0.25, 0.5, -shell.balconyDepth + 0.6],
          max: [shell.width / 2 - 0.25, shell.height - 0.25, shell.roomDepth - 0.3],
        },
      },
      { ...cam.default, target: cam.target },
    );

    this.buildEnvironment();
    this.objects = new ObjectSystem(this.scene, profile);
  }

  private buildEnvironment() {
    const def = this.definition;
    this.scene.add(buildShell(def.shell.params));

    const { mesh: sky, sunDirection } = createSky(def);
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);

    const hemi = new THREE.HemisphereLight(def.lighting.hemisphereSky, def.lighting.hemisphereGround, 0.9);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0xffffff, def.lighting.ambient));

    const sun = new THREE.DirectionalLight(def.lighting.sunColor, def.lighting.sunIntensity);
    sun.position.copy(sunDirection).multiplyScalar(12).add(new THREE.Vector3(0, 0, -0.9));
    sun.target.position.set(0, 0, -0.9);
    this.scene.add(sun.target);
    if (this.profile.shadowMap) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(this.profile.shadowMapSize, this.profile.shadowMapSize);
      sun.shadow.camera.left = -3.2;
      sun.shadow.camera.right = 3.2;
      sun.shadow.camera.top = 3.2;
      sun.shadow.camera.bottom = -3.2;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 30;
      sun.shadow.bias = -0.0008;
    }
    this.scene.add(sun);
  }

  loadObjects(records: UserPlacedObject[]) {
    records.forEach((r) => this.objects.add(r));
    this.dirty = true;
  }

  setDirty() {
    this.dirty = true;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.dirty = true;
    const loop = (now: number) => {
      if (!this.running) return;
      this.frame(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.renderer.dispose();
  }

  /** Normalized device coords from a touch in the view's point space. */
  ndcFrom(x: number, y: number, viewport: Viewport): THREE.Vector2 {
    return new THREE.Vector2((x / viewport.width) * 2 - 1, -(y / viewport.height) * 2 + 1);
  }

  focusOnObject(id: string, now: number) {
    const obj = this.objects.get(id);
    if (!obj) return;
    const { center, radius } = this.objects.boundsOf(obj);
    this.controller.focusOn(center, Math.max(radius, 0.45), now);
    this.dirty = true;
  }

  resetCamera(now: number) {
    this.controller.reset(now);
    this.dirty = true;
  }

  /** expo-gl resizes its drawing buffer on rotation/layout without a new
   * context; keep the renderer and camera aspect in step with it. */
  private resizeIfNeeded() {
    const w = this.gl.drawingBufferWidth;
    const h = this.gl.drawingBufferHeight;
    if (w === this.bufferWidth && h === this.bufferHeight) return;
    if (w <= 0 || h <= 0) return;
    this.bufferWidth = w;
    this.bufferHeight = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w > h ? 46 : 62;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private frame(now: number) {
    this.resizeIfNeeded();
    const cameraMoved = this.controller.update(now);
    if (cameraMoved) this.dirty = true;

    const ambientInterval = 1000 / this.profile.ambientFps;
    if (now - this.lastAmbientAt >= ambientInterval) {
      this.lastAmbientAt = now;
      this.objects.updateAmbient(now / 1000);
      this.dirty = true;
    }

    if (!this.dirty) return;
    this.dirty = false;
    this.controller.applyTo(this.camera);
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
    if (this.lastRenderAt > 0) {
      const instant = 1000 / Math.max(1, now - this.lastRenderAt);
      this.fps = this.fps === 0 ? instant : this.fps * 0.9 + instant * 0.1;
    }
    this.lastRenderAt = now;
    if (cameraMoved && this.onCameraChanged) this.onCameraChanged();
  }
}
