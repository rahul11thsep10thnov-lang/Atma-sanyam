// Water with a REAL planar reflection: the scene is drawn a second time from
// a camera mirrored in the water plane into a small render target, and the
// water shader samples it with rippled coordinates. Depth tint and shore
// transparency come from the ground-height texture. Unsigned-byte targets
// only, so it needs no float-texture extension.
import * as THREE from 'three';
import { clock } from './materials';

export interface WaterOptions {
  radius: number;
  y: number;
  /** Ground height texture and the half-size (world units) it covers. */
  heightTex: THREE.Texture;
  half: number;
  lo: number;
  hi: number;
  deep: number;
  shallow: number;
  sunDir: THREE.Vector3;
  reflectionSize?: number;
}

const VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vRefl;
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vRefl = textureMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform sampler2D tReflect;
uniform sampler2D tHeight;
uniform float uTime;
uniform float uHalf;
uniform float uLo;
uniform float uHi;
uniform float uY;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSunDir;
varying vec4 vRefl;
varying vec3 vWorld;

vec2 ripple(vec2 p, float t) {
  vec2 g = vec2(0.0);
  g += vec2(cos(p.x * 2.1 + p.y * 1.3 + t * 0.9), cos(p.x * 1.1 - p.y * 2.3 + t * 0.7)) * 0.5;
  g += vec2(cos(p.x * 4.7 - p.y * 3.1 - t * 1.3), cos(p.x * 3.3 + p.y * 4.9 + t * 1.1)) * 0.28;
  g += vec2(cos(p.x * 9.1 + p.y * 7.7 + t * 2.1), cos(p.x * 8.3 - p.y * 9.9 - t * 1.7)) * 0.12;
  return g;
}

void main() {
  vec2 uv = vWorld.xz / (2.0 * uHalf) + 0.5;
  float h = texture2D(tHeight, uv).r * (uHi - uLo) + uLo;
  float depth = max(0.0, uY - h);
  vec2 g = ripple(vWorld.xz, uTime);
  vec3 n = normalize(vec3(g.x * 0.05, 1.0, g.y * 0.05));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(V, n), 0.0);
  float fres = mix(0.14, 1.0, pow(1.0 - ndv, 3.0));
  vec2 ruv = vRefl.xy / vRefl.w + n.xz * 0.05;
  vec3 refl = texture2D(tReflect, clamp(ruv, 0.001, 0.999)).rgb;
  vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 0.55, depth));
  vec3 col = mix(body, refl, fres * 0.9);
  vec3 H = normalize(uSunDir + V);
  col += vec3(1.0, 0.92, 0.75) * pow(max(dot(n, H), 0.0), 220.0) * 1.4;
  float alpha = smoothstep(0.0, 0.06, depth) * mix(0.78, 0.97, smoothstep(0.05, 0.4, depth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Water {
  readonly mesh: THREE.Mesh;
  private rt: THREE.WebGLRenderTarget;
  private virtualCamera = new THREE.PerspectiveCamera();
  private textureMatrix = new THREE.Matrix4();
  private plane: THREE.Plane;
  private tmp = {
    pos: new THREE.Vector3(),
    cam: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    view: new THREE.Vector3(),
    look: new THREE.Vector3(),
    target: new THREE.Vector3(),
    rot: new THREE.Matrix4(),
  };
  readonly y: number;

  constructor(o: WaterOptions) {
    this.y = o.y;
    const size = o.reflectionSize ?? 512;
    this.rt = new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tReflect: { value: this.rt.texture },
        tHeight: { value: o.heightTex },
        textureMatrix: { value: this.textureMatrix },
        uTime: clock.uTime,
        uHalf: { value: o.half },
        uLo: { value: o.lo },
        uHi: { value: o.hi },
        uY: { value: o.y },
        uDeep: { value: new THREE.Color(o.deep) },
        uShallow: { value: new THREE.Color(o.shallow) },
        uSunDir: { value: o.sunDir.clone().normalize() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    const g = new THREE.CircleGeometry(o.radius, 64);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.position.y = o.y;
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -o.y);
    this.mesh.updateMatrixWorld(true);
  }

  /** Draw the mirrored view into the reflection target. */
  renderReflection(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, hide: THREE.Object3D[]): void {
    const t = this.tmp;
    this.mesh.updateMatrixWorld(true);
    t.pos.setFromMatrixPosition(this.mesh.matrixWorld);
    t.cam.setFromMatrixPosition(camera.matrixWorld);
    t.normal.set(0, 1, 0);
    t.view.subVectors(t.pos, t.cam);
    if (t.view.dot(t.normal) > 0) return; // seen from below
    t.view.reflect(t.normal).negate().add(t.pos);
    t.rot.extractRotation(camera.matrixWorld);
    t.look.set(0, 0, -1).applyMatrix4(t.rot).add(t.cam);
    t.target.subVectors(t.pos, t.look).reflect(t.normal).negate().add(t.pos);
    const vc = this.virtualCamera;
    vc.position.copy(t.view);
    vc.up.set(0, 1, 0).applyMatrix4(t.rot).reflect(t.normal);
    vc.lookAt(t.target);
    vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(this.mesh.matrixWorld);

    const wasVisible = hide.map((o) => o.visible);
    hide.forEach((o) => (o.visible = false));
    this.mesh.visible = false;
    const prevTarget = renderer.getRenderTarget();
    const prevClip = renderer.clippingPlanes;
    const prevAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.clippingPlanes = [this.plane];
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(prevTarget);
    renderer.clippingPlanes = prevClip;
    renderer.shadowMap.autoUpdate = prevAuto;
    hide.forEach((o, i) => (o.visible = wasVisible[i]!));
    this.mesh.visible = true;
  }

  dispose(): void {
    this.rt.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
  }
}
