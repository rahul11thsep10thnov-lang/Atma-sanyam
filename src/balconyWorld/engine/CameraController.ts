import * as THREE from 'three';
import { CameraState, Vec3 } from '../state/types';

export interface CameraLimits {
  yaw: [number, number]; // radians
  pitch: [number, number];
  distance: [number, number];
  /** The orbit target may wander only inside this box (the balcony). */
  targetBox: { min: Vec3; max: Vec3 };
  /** The eye itself is clamped to this box (the room), so it can never leave
   * the architecture or end up behind a wall, whatever the orbit params say. */
  eyeBox: { min: Vec3; max: Vec3 };
}

const DAMPING = 0.86;
const STOP_EPSILON = 0.0004;
const FOCUS_MS = 450;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Orbit camera around a target inside the balcony (architecture doc,
 * section D). Pure math: gestures feed deltas in, `update(dt)` integrates
 * inertia and eased focus/reset animations, `applyTo` writes the pose into a
 * three.js camera. Testable without a device. */
export class CameraController {
  yaw: number;
  pitch: number;
  distance: number;
  target = new THREE.Vector3();

  private velocityYaw = 0;
  private velocityPitch = 0;
  private anim: { from: CameraState; to: CameraState; start: number } | null = null;

  constructor(
    private readonly limits: CameraLimits,
    private readonly home: CameraState,
  ) {
    this.yaw = home.yaw;
    this.pitch = home.pitch;
    this.distance = home.distance;
    this.target.set(...home.target);
  }

  getState(): CameraState {
    return { yaw: this.yaw, pitch: this.pitch, distance: this.distance, target: [this.target.x, this.target.y, this.target.z] };
  }

  setState(state: CameraState) {
    this.anim = null;
    this.yaw = clamp(state.yaw, ...this.limits.yaw);
    this.pitch = clamp(state.pitch, ...this.limits.pitch);
    this.distance = clamp(state.distance, ...this.limits.distance);
    this.target.set(...state.target);
    this.clampTarget();
  }

  /** One-finger drag. `dx`/`dy` in screen points; velocity feeds inertia. */
  orbitBy(dx: number, dy: number, viewportWidth: number) {
    this.anim = null;
    const k = (Math.PI * 0.9) / viewportWidth; // a full-width drag ≈ 160°
    const dYaw = -dx * k;
    const dPitch = dy * k * 0.7;
    this.yaw = clamp(this.yaw + dYaw, ...this.limits.yaw);
    this.pitch = clamp(this.pitch + dPitch, ...this.limits.pitch);
    this.velocityYaw = dYaw;
    this.velocityPitch = dPitch;
  }

  /** Pinch. `scale` is the gesture's relative scale since the last update. */
  zoomBy(scale: number) {
    this.anim = null;
    if (scale <= 0) return;
    this.distance = clamp(this.distance / scale, ...this.limits.distance);
  }

  /** Two-finger drag: slide the target across the floor, camera-relative. */
  panBy(dx: number, dy: number, viewportWidth: number) {
    this.anim = null;
    const metresPerPoint = (this.distance * 0.9) / viewportWidth;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.target.addScaledVector(right, -dx * metresPerPoint);
    this.target.addScaledVector(forward, dy * metresPerPoint);
    this.clampTarget();
  }

  release() {
    // inertia takes over from the last orbit velocity
  }

  stopInertia() {
    this.velocityYaw = 0;
    this.velocityPitch = 0;
  }

  /** Double-tap on an object: frame it. */
  focusOn(point: THREE.Vector3, radius: number, now: number) {
    const to: CameraState = {
      yaw: this.yaw,
      pitch: clamp(Math.max(this.pitch, 0.18), ...this.limits.pitch),
      distance: clamp(radius * 2.4, ...this.limits.distance),
      target: [point.x, point.y, point.z],
    };
    this.anim = { from: this.getState(), to, start: now };
    this.stopInertia();
  }

  reset(now: number) {
    this.anim = { from: this.getState(), to: { ...this.home, target: [...this.home.target] as Vec3 }, start: now };
    this.stopInertia();
  }

  /** Returns true when the pose changed and a frame should render. */
  update(now: number): boolean {
    let changed = false;
    if (this.anim) {
      const t = Math.min(1, (now - this.anim.start) / FOCUS_MS);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const { from, to } = this.anim;
      this.yaw = from.yaw + (to.yaw - from.yaw) * e;
      this.pitch = from.pitch + (to.pitch - from.pitch) * e;
      this.distance = from.distance + (to.distance - from.distance) * e;
      this.target.set(
        from.target[0] + (to.target[0] - from.target[0]) * e,
        from.target[1] + (to.target[1] - from.target[1]) * e,
        from.target[2] + (to.target[2] - from.target[2]) * e,
      );
      this.clampTarget();
      if (t >= 1) this.anim = null;
      changed = true;
    } else if (Math.abs(this.velocityYaw) > STOP_EPSILON || Math.abs(this.velocityPitch) > STOP_EPSILON) {
      this.velocityYaw *= DAMPING;
      this.velocityPitch *= DAMPING;
      this.yaw = clamp(this.yaw + this.velocityYaw, ...this.limits.yaw);
      this.pitch = clamp(this.pitch + this.velocityPitch, ...this.limits.pitch);
      changed = true;
    } else {
      this.velocityYaw = 0;
      this.velocityPitch = 0;
    }
    return changed;
  }

  applyTo(camera: THREE.PerspectiveCamera) {
    const eye = new THREE.Vector3(
      this.target.x + this.distance * Math.sin(this.yaw) * Math.cos(this.pitch),
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const { min, max } = this.limits.eyeBox;
    eye.set(clamp(eye.x, min[0], max[0]), clamp(eye.y, min[1], max[1]), clamp(eye.z, min[2], max[2]));
    camera.position.copy(eye);
    camera.lookAt(this.target);
  }

  private clampTarget() {
    const { min, max } = this.limits.targetBox;
    this.target.set(clamp(this.target.x, min[0], max[0]), clamp(this.target.y, min[1], max[1]), clamp(this.target.z, min[2], max[2]));
  }
}
