import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';

/** The expo-gl ⇄ three.js bridge. expo-gl hands us a WebGL2 context with no
 * DOM canvas, so three gets a minimal stand-in object; the drawing buffer is
 * already in physical pixels, so pixel ratio stays 1 and the quality
 * profile's resolution scale is applied to the size instead. After every
 * frame the caller must `gl.endFrameEXP()` — see BalconyEngine. */
export function createRenderer(
  gl: ExpoWebGLRenderingContext,
  options: { antialias: boolean; resolutionScale: number; shadowMap: boolean },
): THREE.WebGLRenderer {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl as unknown as WebGLRenderingContext,
    antialias: options.antialias,
    alpha: false,
    powerPreference: 'default',
  });
  renderer.setPixelRatio(1);
  // expo-gl's drawing buffer is fixed-size, so a smaller setSize would only
  // draw into a corner of it. Sub-native resolution (the LOW profile's
  // `resolutionScale`) needs render-to-texture + upscale — part of the
  // performance step; until then every profile renders at buffer size.
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = options.shadowMap;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}
