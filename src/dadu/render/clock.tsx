// A shared animation clock: one interval per scene, consumed by every sprite
// through context, so a room with seven characters re-renders once per frame
// instead of seven times. Static (t = 0) when animation is off or reduced
// motion is on.
import React, { createContext, useContext, useEffect, useState } from 'react';

const ClockCtx = createContext<number>(0);

export function AnimationClock({ enabled, fps = 10, children }: { enabled: boolean; fps?: number; children: React.ReactNode }) {
  const t = useClockValue(enabled, fps);
  return <ClockCtx.Provider value={t}>{children}</ClockCtx.Provider>;
}

export function useClock(): number {
  return useContext(ClockCtx);
}

export function useClockValue(enabled: boolean, fps = 10): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!enabled) { setT(0); return; }
    const start = Date.now();
    const id = setInterval(() => setT((Date.now() - start) / 1000), 1000 / fps);
    return () => clearInterval(id);
  }, [enabled, fps]);
  return t;
}

/** Pure helpers shared by rigs. Blink lasts 150 ms every ~4.6 s. */
export const anim = {
  blink: (t: number) => t > 0 && (t % 4.6) < 0.15,
  breathe: (t: number) => (t > 0 ? Math.sin(t * 2.1) : 0),
  swing: (t: number, speed: number) => (t > 0 ? Math.sin(t * speed) : 0),
  bob: (t: number) => (t > 0 ? Math.abs(Math.sin(t * 8)) : 0),
  mouthOpen: (t: number) => (t > 0 ? (Math.sin(t * 14) + 1) / 2 : 0.5),
};
