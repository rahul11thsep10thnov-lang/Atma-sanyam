"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CelebrationEngine, deviceFactor, type Intensity } from "./controller";

/**
 * Transparent canvas overlay for a miniature celebration around its
 * parent (which must be `position: relative`). Extends `spill` px beyond
 * the parent's edges, never takes pointer events, pauses when off-screen
 * or the tab is hidden, and renders nothing for reduced-motion users.
 *
 *   <CelebrationOverlay duration={7000} intensity="premium" enabled
 *       phaseMs={() => msIntoCurrentDisplay} />
 */
export function CelebrationOverlay({
  duration = 7000,
  intensity = "premium",
  enabled = true,
  spill = 60,
  phaseMs,
  seed,
}: {
  duration?: number;
  intensity?: Intensity;
  enabled?: boolean;
  spill?: number;
  /** ms into the current display slot (server-synchronised). */
  phaseMs?: () => number;
  seed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phaseMs);
  useEffect(() => {
    phaseRef.current = phaseMs;
  }, [phaseMs]);
  const reduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // server render: nothing until the client decides
  );
  const active = enabled && !reduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const host = canvas.parentElement!;
    const margin = window.innerWidth < 640 ? Math.round(spill * 0.6) : spill;
    const engine = new CelebrationEngine({ intensity, displayMs: duration, deviceFactor: deviceFactor(), seed: seed ?? (Date.now() & 0xffffffff) });
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      cssW = Math.max(1, rect.width + margin * 2);
      cssH = Math.max(1, rect.height + margin * 2);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.left = `${-margin}px`;
      canvas.style.top = `${-margin}px`;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      engine.resize(cssW, cssH, margin); // positions recomputed, not stretched
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let last = 0;
    let onScreen = true;
    let running = false;
    const frame = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      engine.step(dt, phaseRef.current ? phaseRef.current() : now % duration);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.render(ctx, () => ctx.clearRect(0, 0, cssW, cssH));
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || !onScreen || document.visibilityState !== "visible") return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) start();
      else stop();
    });
    io.observe(host);
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVis);
    start();
    // Exposed for automated checks only (frame rate, particle counts).
    (canvas as HTMLCanvasElement & { __engine?: CelebrationEngine }).__engine = engine;

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      engine.dispose();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, intensity, duration, spill, seed]);

  if (!active) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="celebration-overlay" data-testid="celebration-overlay" />;
}
