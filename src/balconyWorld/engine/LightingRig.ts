import * as THREE from 'three';
import { EnvironmentDefinition } from '../state/types';
import { LightingFrame } from './FocusEnvironmentEngine';
import { QualityProfile } from './QualityProfile';
import { SkyHandle, sunDirectionFrom } from './Sky';

/**
 * Applies a FocusEnvironmentEngine LightingFrame to the three.js scene: the
 * sun and moon, ambient light, sky, fog, the pool of light at the plant's
 * base, the sunbeam from above, dust and rain particles, the balcony lamps,
 * the wet deck. Owns no timing and no state machine — it only renders what
 * the frame says, so the same rig serves every environment.
 */
export class LightingRig {
  readonly sun: THREE.DirectionalLight;
  private readonly moon: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly ambient: THREE.AmbientLight;
  private readonly fog: THREE.Fog;
  private readonly pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly dust: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null;
  private readonly rain: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null;
  private readonly focusPoint = new THREE.Vector3(0, 0, -1.3);
  private readonly sunDir = new THREE.Vector3();
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();
  private readonly basis = new THREE.Matrix4();
  private lampBase = new Map<THREE.Light, number>();
  private deck: THREE.Mesh | null = null;
  private deckRoughness = 1;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly sky: SkyHandle,
    def: EnvironmentDefinition,
    private readonly profile: QualityProfile,
  ) {
    this.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
    scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight(def.lighting.hemisphereSky, def.lighting.hemisphereGround, 0.9);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, def.lighting.ambient);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(def.lighting.sunColor, def.lighting.sunIntensity);
    this.sun.target.position.copy(this.focusPoint);
    scene.add(this.sun.target);
    if (profile.shadowMap) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      this.sun.shadow.camera.left = -3.2;
      this.sun.shadow.camera.right = 3.2;
      this.sun.shadow.camera.top = 3.2;
      this.sun.shadow.camera.bottom = -3.2;
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 30;
      this.sun.shadow.bias = -0.0008;
    }
    scene.add(this.sun);

    this.moon = new THREE.DirectionalLight(0xcfd9ff, 0);
    this.moon.position.set(-4, 9, 6);
    scene.add(this.moon);

    // pool of light: an additive radial disc lying on the floor
    this.pool = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6b8, opacity: 0 }),
    );
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.renderOrder = 2;
    scene.add(this.pool);

    // the sunbeam: a tall soft quad aligned with the sun direction, faced to the camera
    this.beam = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 4.2),
      new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9c4, opacity: 0, side: THREE.DoubleSide }),
    );
    this.beam.renderOrder = 3;
    scene.add(this.beam);

    this.dust = profile.level === 'LOW' ? null : makeParticles(profile.level === 'HIGH' ? 140 : 50, 0.022, 0xfff1cf);
    if (this.dust) scene.add(this.dust);
    this.rain = profile.level === 'LOW' ? null : makeParticles(profile.level === 'HIGH' ? 320 : 160, 0.018, 0xdfe8f0);
    if (this.rain) scene.add(this.rain);

    scene.traverse((node) => {
      if (node.name === 'shell-deck' && node instanceof THREE.Mesh) {
        this.deck = node;
        const mat = node.material as THREE.MeshStandardMaterial;
        if ('roughness' in mat) this.deckRoughness = mat.roughness;
      }
    });
  }

  /** Where the pool and beam centre — the active plant, else the balcony's focal spot. */
  setFocusPoint(point: THREE.Vector3) {
    this.focusPoint.copy(point);
    this.sun.target.position.copy(point);
  }

  /** Lamps are point lights on props (`prop-light`); the rig scales them by the frame. */
  registerLamps() {
    this.lampBase.clear();
    this.scene.traverse((node) => {
      if (node.name === 'prop-light' && (node as THREE.Light).isLight) {
        const light = node as THREE.Light;
        this.lampBase.set(light, light.intensity);
      }
    });
  }

  apply(frame: LightingFrame, timeSeconds: number, camera: THREE.Camera) {
    const dir = sunDirectionFrom(frame.sun.azimuth, frame.sun.elevation, this.sunDir);
    const aboveHorizon = Math.max(0, Math.sin(THREE.MathUtils.degToRad(Math.max(frame.sun.elevation, 1))));

    this.sun.position.copy(dir).multiplyScalar(12).add(this.focusPoint);
    this.sun.intensity = frame.sun.intensity * (0.6 + 0.4 * aboveHorizon);
    this.sun.color.setRGB(...frame.sun.color);
    if (this.sun.castShadow) this.sun.shadow.radius = 1 + frame.sun.shadowSoftness * 6;

    this.moon.intensity = frame.moon.intensity * 0.6;
    this.moon.color.setRGB(...frame.moon.color);

    this.hemi.color.setRGB(...frame.ambient.skyColor);
    this.hemi.groundColor.setRGB(...frame.ambient.groundColor);
    this.hemi.intensity = 0.55 + frame.ambient.intensity * 1.2;
    this.ambient.intensity = frame.ambient.intensity * frame.backgroundBrightness;

    const sky = this.sky.material.uniforms;
    (sky.topColor.value as THREE.Color).setRGB(...frame.sky.top);
    (sky.horizonColor.value as THREE.Color).setRGB(...frame.sky.horizon);
    (sky.sunColor.value as THREE.Color).setRGB(...frame.sky.sunGlow);
    (sky.sunDir.value as THREE.Vector3).copy(dir);
    sky.stars.value = frame.sky.stars;

    this.fog.color.setRGB(...frame.fog.color);
    this.fog.near = THREE.MathUtils.lerp(30, 8, frame.fog.density);
    this.fog.far = THREE.MathUtils.lerp(160, 40, frame.fog.density);

    // pool of light at the plant's base
    const r = frame.pool.radius;
    this.pool.position.set(this.focusPoint.x, 0.006, this.focusPoint.z);
    this.pool.scale.set(r * 2 * frame.pool.elongation, r * 2, 1);
    this.pool.rotation.z = THREE.MathUtils.degToRad(frame.sun.azimuth) * 0.5;
    this.pool.material.opacity = Math.min(1, frame.pool.intensity * 0.55);
    this.pool.material.color.setRGB(...frame.pool.color);

    // beam: long axis along the sun direction, rotated about it to face the camera
    const y = this.tmpA.copy(dir);
    const toCam = this.tmpB.copy(camera.position).sub(this.focusPoint);
    toCam.sub(this.tmpC.copy(y).multiplyScalar(toCam.dot(y))).normalize();
    const x = this.tmpC.crossVectors(y, toCam).normalize();
    this.basis.makeBasis(x, y, toCam);
    this.beam.setRotationFromMatrix(this.basis);
    // slides in from the sun's side during the reward (travel 0 → 1)
    const slide = (1 - frame.beam.travel) * 2.2;
    this.beam.position.copy(this.focusPoint).add(this.tmpB.copy(dir).multiplyScalar(2.1 + slide * 0.4)).add(this.tmpA.set(-slide * Math.sign(dir.x || 1), 0, 0));
    this.beam.position.y = Math.max(this.beam.position.y, 1.6);
    this.beam.material.opacity = Math.min(0.5, frame.beam.intensity * 0.16 * (0.6 + 0.4 * frame.beam.haze));
    this.beam.scale.set(1 + frame.beam.haze * 0.6, 1, 1);

    if (this.dust) {
      this.dust.visible = frame.particles.dust > 0.02;
      this.dust.material.opacity = Math.min(0.8, frame.particles.dust * 0.7);
      driftParticles(this.dust, this.focusPoint, timeSeconds, 0.12, 1.4, 2.6, 'dust');
    }
    if (this.rain) {
      this.rain.visible = frame.particles.rain > 0.02;
      this.rain.material.opacity = Math.min(0.75, frame.particles.rain * 0.7);
      if (this.rain.visible) driftParticles(this.rain, this.focusPoint, timeSeconds, 6 + frame.particles.rain * 4, 2.6, 3.2, 'rain');
    }

    for (const [light, base] of this.lampBase) light.intensity = base * frame.lamps.intensity;

    if (this.deck) {
      const mat = this.deck.material as THREE.MeshStandardMaterial;
      if ('roughness' in mat) mat.roughness = THREE.MathUtils.lerp(this.deckRoughness, 0.25, frame.wetness);
    }
  }
}

// --- helpers -------------------------------------------------------------------

function radialTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.max(0, 1 - d);
      const v = Math.round(255 * a * a * (3 - 2 * a)); // smooth, no hard spotlight edge
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = v;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function beamTexture(w = 32, h = 128): THREE.DataTexture {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w - 0.5;
      const v = (y + 0.5) / h; // 0 = bottom (plant), 1 = top (sun)
      const across = Math.exp(-(u * u) / 0.08);
      const along = Math.sin(v * Math.PI) * (0.55 + 0.45 * v);
      const i = (y * w + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(255 * across * along);
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function makeParticles(count: number, size: number, color: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.userData.seeds = seeds;
  const material = new THREE.PointsMaterial({ size, color, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/** Repositions every particle from its seed and the clock: dust drifts and
 * tumbles slowly inside the beam volume, rain falls straight through it. */
function driftParticles(points: THREE.Points, centre: THREE.Vector3, t: number, speed: number, halfWidth: number, height: number, kind: 'dust' | 'rain') {
  const geometry = points.geometry;
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const seeds = geometry.userData.seeds as Float32Array;
  const n = pos.count;
  for (let i = 0; i < n; i++) {
    const sx = seeds[i * 3];
    const sy = seeds[i * 3 + 1];
    const sz = seeds[i * 3 + 2];
    let x: number;
    let y: number;
    let z: number;
    if (kind === 'dust') {
      x = centre.x + (sx - 0.5) * halfWidth * 2 + Math.sin(t * 0.3 * speed + sz * 6.28) * 0.15;
      y = 0.2 + ((sy + t * 0.02 * speed) % 1) * height + Math.sin(t * 0.5 + sx * 6.28) * 0.05;
      z = centre.z + (sz - 0.5) * halfWidth * 1.4 + Math.cos(t * 0.25 + sy * 6.28) * 0.1;
    } else {
      x = centre.x + (sx - 0.5) * halfWidth * 2;
      y = height - ((sy + t * 0.12 * speed) % 1) * height;
      z = centre.z + (sz - 0.5) * halfWidth * 2;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
}
