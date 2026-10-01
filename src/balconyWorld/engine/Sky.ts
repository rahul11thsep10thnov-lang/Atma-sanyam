import * as THREE from 'three';
import { EnvironmentDefinition } from '../state/types';

const VERTEX = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform float stars;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(horizonColor, topColor, pow(h, 0.5));
    float d = max(dot(vDir, sunDir), 0.0);
    sky += sunColor * (pow(d, 160.0) * 1.2 + pow(d, 12.0) * 0.35 + pow(d, 3.0) * 0.08);
    // a little warmth settling on the horizon band
    sky += horizonColor * (1.0 - smoothstep(0.0, 0.14, h)) * 0.1;
    // a sparse star field that the environment engine fades in at night
    if (stars > 0.001 && h > 0.05) {
      vec3 cell = floor(vDir * 140.0);
      float s = hash(cell);
      float star = smoothstep(0.985, 1.0, s) * stars * smoothstep(0.05, 0.3, h);
      sky += vec3(0.9, 0.93, 1.0) * star * (0.6 + 0.4 * hash(cell + 7.0));
    }
    gl_FragColor = vec4(sky, 1.0);
  }
`;

export interface SkyHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  sunDirection: THREE.Vector3;
}

/** Azimuth 0 is straight ahead (toward -Z, the view), 90 is to the right;
 * elevation is degrees above the horizon. */
export function sunDirectionFrom(azimuthDeg: number, elevationDeg: number, target = new THREE.Vector3()): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/** Gradient sky dome with a soft sun — V1 of the sky system (section J).
 * The environment engine drives its uniforms every frame (LightingRig); an
 * equirect panorama per environment slots in later as a second
 * implementation of the same handle. */
export function createSky(def: EnvironmentDefinition): SkyHandle {
  const sunDirection = sunDirectionFrom(def.sky.sunAzimuth, def.sky.sunElevation);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(def.sky.topColor) },
      horizonColor: { value: new THREE.Color(def.sky.horizonColor) },
      sunColor: { value: new THREE.Color(def.sky.sunColor) },
      sunDir: { value: sunDirection.clone() },
      stars: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 18), material);
  mesh.renderOrder = -1;
  return { mesh, material, sunDirection };
}
