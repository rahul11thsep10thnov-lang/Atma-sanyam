// A three.js renderer on an expo-gl view: creates the renderer when the
// context arrives, runs a frame loop only while the view is on screen, and
// hands the scene builder a handle it can draw into and tear down.
import { useCallback, useEffect, useRef } from 'react';
import { PixelRatio, Platform } from 'react-native';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';

export interface ThreeHandle {
  gl: ExpoWebGLRenderingContext;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  width: number;
  height: number;
  /** Seconds since the loop started. */
  time: number;
}

export interface ThreeSceneSpec {
  /** Build the scene once; return a per-frame update and a cleanup. */
  create: (h: ThreeHandle) => { update?: (h: ThreeHandle, dt: number) => void; dispose?: () => void } | void;
  /** Cap the device pixel ratio (mid-range phones struggle above 2). */
  maxPixelRatio?: number;
  /** Render only on demand when true (static views). */
  paused?: boolean;
}

export function useThree(spec: ThreeSceneSpec) {
  const handle = useRef<ThreeHandle | null>(null);
  const hooks = useRef<{ update?: (h: ThreeHandle, dt: number) => void; dispose?: () => void }>({});
  const raf = useRef<number | null>(null);
  const alive = useRef(true);
  const paused = useRef(!!spec.paused);
  paused.current = !!spec.paused;
  const create = useRef(spec.create);
  create.current = spec.create;

  const stopLoop = () => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  };

  const startLoop = useCallback(() => {
    stopLoop();
    let last = Date.now();
    const start = last;
    const frame = () => {
      const h = handle.current;
      if (!h || !alive.current) return;
      const now = Date.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      h.time = (now - start) / 1000;
      if (!paused.current) hooks.current.update?.(h, dt);
      h.renderer.render(h.scene, h.camera);
      h.gl.endFrameEXP();
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, []);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const pr = Math.min(spec.maxPixelRatio ?? 2, PixelRatio.get());
      const renderer = new THREE.WebGLRenderer({ context: gl as unknown as WebGLRenderingContext, antialias: Platform.OS === 'web', alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Platform.OS === 'web' ? pr : 1);
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = false;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 600);
      const h: ThreeHandle = { gl, renderer, scene, camera, width, height, time: 0 };
      handle.current = h;
      hooks.current = create.current(h) ?? {};
      startLoop();
    },
    [spec.maxPixelRatio, startLoop],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopLoop();
      hooks.current.dispose?.();
      const h = handle.current;
      if (h) {
        h.renderer.dispose();
        handle.current = null;
      }
    };
  }, []);

  return { onContextCreate, handle, GLView };
}
