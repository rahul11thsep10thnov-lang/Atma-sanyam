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
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(horizonColor, topColor, pow(h, 0.55));
    float d = max(dot(vDir, sunDir), 0.0);
    sky += sunColor * (pow(d, 64.0) * 0.9 + pow(d, 6.0) * 0.22);
    // a little warmth settling on the horizon band
    sky += horizonColor * (1.0 - smoothstep(0.0, 0.18, h)) * 0.08;
    gl_FragColor = vec4(sky, 1.0);
  }
`;

/** Gradient sky dome with a soft sun — V1 of the sky system (section J).
 * An equirect panorama per environment slots in later as a second
 * implementation of the same `sunDirection` contract. */
export function createSky(def: EnvironmentDefinition): { mesh: THREE.Mesh; sunDirection: THREE.Vector3 } {
  const az = THREE.MathUtils.degToRad(def.sky.sunAzimuth);
  const el = THREE.MathUtils.degToRad(def.sky.sunElevation);
  const sunDirection = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(def.sky.topColor) },
      horizonColor: { value: new THREE.Color(def.sky.horizonColor) },
      sunColor: { value: new THREE.Color(def.sky.sunColor) },
      sunDir: { value: sunDirection },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 18), material);
  mesh.renderOrder = -1;
  return { mesh, sunDirection };
}
