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
import { LightingRig } from './LightingRig';
import { FocusEnvironmentEngine, LightingFrame, localHour } from './FocusEnvironmentEngine';

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
  /** The living-world state machine (time of day, weather, focus arc). */
  readonly environment: FocusEnvironmentEngine;
  readonly lighting: LightingRig;

  /** Fires after any frame in which the camera moved — the screen persists it. */
  onCameraChanged: (() => void) | null = null;
  /** Fires on every environment tick — the screen feeds the audio mixer and UI from it. */
  onLightingFrame: ((frame: LightingFrame, dtSeconds: number) => void) | null = null;

  private dirty = true;
  private running = false;
  private rafId: number | null = null;
  private lastAmbientAt = 0;
  private disposed = false;
  private bufferWidth = 0;
  private bufferHeight = 0;
  private lastRenderAt = 0;
  private lastEnvironmentAt = 0;
  private pushIn = 0;
  private readonly cameraTarget = new THREE.Vector3();
  /** Exponential moving average of rendered frames per second — what the
   * stats overlay shows and what the performance step tunes against. */
  fps = 0;

  constructor(
    private readonly gl: ExpoWebGLRenderingContext,
    readonly definition: EnvironmentDefinition,
    readonly profile: QualityProfile,
    viewport: Viewport,
    environment: FocusEnvironmentEngine = new FocusEnvironmentEngine(),
  ) {
    this.environment = environment;
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

    this.scene.add(buildShell(definition.shell.params));
    const sky = createSky(definition);
    this.scene.add(sky.mesh);
    this.lighting = new LightingRig(this.scene, sky, definition, profile);
    this.lighting.setFocusPoint(new THREE.Vector3(definition.camera.target[0], 0, definition.camera.target[2]));
    this.objects = new ObjectSystem(this.scene, profile);
  }

  loadObjects(records: UserPlacedObject[]) {
    records.forEach((r) => this.objects.add(r));
    this.lighting.registerLamps();
    this.refocusLighting();
    this.dirty = true;
  }

  /** The pool of light and the beam centre on the first plant — the thing a
   * session grows — falling back to the environment's focal spot. */
  refocusLighting() {
    const plant = this.objects.list().find((o) => o.def.category === 'PLANTS');
    if (plant) {
      const [w, d] = plant.def.footprint;
      this.lighting.setFocusPoint(new THREE.Vector3(plant.group.position.x, 0, plant.group.position.z + Math.min(w, d) * 0.1));
    } else {
      const t = this.definition.camera.target;
      this.lighting.setFocusPoint(new THREE.Vector3(t[0], 0, t[2]));
    }
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
      const seconds = now / 1000;
      const frame = this.environment.tick(seconds, localHour());
      const dt = this.lastEnvironmentAt ? seconds - this.lastEnvironmentAt : 0;
      this.lastEnvironmentAt = seconds;
      this.lighting.apply(frame, seconds, this.camera);
      this.pushIn = frame.camera.pushIn;
      this.objects.updateAmbient(seconds, frame.plantMotion.wind, frame.plantMotion.speed);
      if (this.onLightingFrame) this.onLightingFrame(frame, dt);
      this.dirty = true;
    }

    if (!this.dirty) return;
    this.dirty = false;
    this.controller.applyTo(this.camera);
    if (this.pushIn > 0) {
      // the reward's almost imperceptible push-in: ≤3% of the way to the target
      const t = this.controller.getState().target;
      this.cameraTarget.set(t[0], t[1], t[2]);
      this.camera.position.lerp(this.cameraTarget, this.pushIn * 0.03);
    }
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
