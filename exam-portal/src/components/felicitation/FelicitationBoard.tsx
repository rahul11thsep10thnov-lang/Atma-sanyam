"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PublicFelicitation } from "@/lib/felicitation/service";
import { currentSlot } from "@/lib/felicitation/state";
import { FelicitationSubmitModal } from "./FelicitationSubmitModal";

export interface BoardState {
  serverNow: number;
  durationMs: number;
  enabled: boolean;
  paused: boolean;
  animations: boolean;
  intensity: "subtle" | "normal" | "festive";
  priceRupees: number;
  referencePriceRupees: number;
  entries: PublicFelicitation[];
}

const REFRESH_MS = 60_000;
const PETAL_COLORS = ["#f59f00", "#fd7e14", "#e8590c", "#f783ac", "#ffd43b", "#d9480f"];

function Bunting() {
  const flags = Array.from({ length: 11 });
  const colors = ["#e8590c", "#f59f00", "#c2255c", "#f59f00"];
  return (
    <svg viewBox="0 0 220 18" className="fb-bunting pointer-events-none absolute inset-x-2 top-0 h-4 w-[calc(100%-1rem)]" aria-hidden="true" preserveAspectRatio="none">
      <path d="M0 2 Q110 12 220 2" fill="none" stroke="#b5651d" strokeWidth="1" />
      {flags.map((_, i) => {
        const x = 6 + i * 19.8;
        const y = 2 + 10 * (1 - Math.pow((x - 110) / 110, 2)) * 0.95;
        return <path key={i} d={`M${x - 6} ${y} L${x + 6} ${y} L${x} ${y + 8} Z`} fill={colors[i % colors.length]} opacity="0.9" />;
      })}
    </svg>
  );
}

function Petals({ burstKey, count }: { burstKey: string; count: number }) {
  const petals = useMemo(() => {
    // Deterministic per entry so server/client and all visitors match.
    const st = { seed: 0 };
    for (const ch of burstKey) st.seed = (st.seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => {
      st.seed = (st.seed * 1103515245 + 12345) >>> 0;
      return st.seed / 4294967296;
    };
    return Array.from({ length: count * 2 }, (_, i) => ({
      side: i % 2 === 0 ? "left" : "right",
      dx: `${70 + rnd() * 90}px`,
      dy: `${-40 + rnd() * 70}px`,
      rot: `${180 + rnd() * 360}deg`,
      delay: `${Math.round(rnd() * 500)}ms`,
      color: PETAL_COLORS[i % PETAL_COLORS.length],
    }));
  }, [burstKey, count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
      {petals.map((p, i) => (
        <span key={`${burstKey}-${i}`} className={`fb-petal ${p.side}`} style={{ background: p.color, animationDelay: p.delay, ["--dx" as string]: p.dx, ["--dy" as string]: p.dy, ["--rot" as string]: p.rot }} />
      ))}
    </div>
  );
}

export function FelicitationBoard({ initial }: { initial: BoardState }) {
  const [state, setState] = useState(initial);
  // Server clock offset; the first render uses the server's own time.
  const offsetRef = useRef<number | null>(null);
  const [now, setNow] = useState(initial.serverNow);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const reduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const refresh = useCallback(async () => {
    try {
      const t0 = Date.now();
      const res = await fetch("/api/felicitation/board", { cache: "no-store" });
      if (!res.ok) return;
      const s = (await res.json()) as BoardState;
      const t1 = Date.now();
      offsetRef.current = s.serverNow - (t0 + t1) / 2; // server clock, not the device clock
      setState(s);
    } catch {
      /* offline: keep showing what we have; expiry is re-checked on reconnect */
    }
  }, []);

  useEffect(() => {
    offsetRef.current ??= initial.serverNow - Date.now();
    const tick = setInterval(() => setNow(Date.now() + (offsetRef.current ?? 0)), 500);
    const poll = setInterval(refresh, REFRESH_MS);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [refresh, initial.serverNow]);

  if (!state.enabled) return null;
  const entries = state.entries;
  const slot = currentSlot(entries.length, now, state.durationMs);
  const entry = slot.index >= 0 ? entries[slot.index] : null;
  const single = entries.length === 1;
  const animate = state.animations && !reduced;
  const petalCount = state.intensity === "subtle" ? 4 : state.intensity === "festive" ? 10 : 7;
  // Key changes once per slot (or never, for a single entry) → re-animate.
  const animKey = entry ? (single ? entry.id : `${entry.id}:${Math.floor(now / state.durationMs)}`) : "empty";
  const leaving = !single && entry && slot.msLeft < 450 && animate;

  const callIn = (
    <button type="button" onClick={() => setOpen(true)} className="mx-auto -mt-px inline-flex items-center gap-1.5 rounded-b-xl border border-t-0 border-[#f1d3b0] bg-gradient-to-b from-[#fff4e6] to-[#ffe8cc] px-5 py-2 text-2xl font-semibold text-[#9c3d0a] shadow-sm hover:from-[#ffe8cc] hover:to-[#ffd8a8]">
      🎉 Add Your Achievement
    </button>
  );

  return (
    <div className="flex w-full flex-col items-stretch sm:w-[26rem]" data-testid="felicitation-board">
      {minimized ? (
        <button type="button" onClick={() => setMinimized(false)} className="fb-board rounded-xl px-3 py-1.5 text-left text-sm">
          <span className="fb-title text-lg">Felicitation Board</span> <span className="text-xs text-slate-500">— show</span>
        </button>
      ) : (
        <section aria-label="Felicitation Board" aria-live="polite" className="fb-board relative overflow-hidden rounded-2xl px-4 pb-3 pt-5">
          {animate ? <Bunting /> : null}
          <button type="button" onClick={() => setMinimized(true)} className="absolute right-1.5 top-1 text-xs text-slate-400 hover:text-slate-700 sm:hidden" aria-label="Minimize Felicitation Board">–</button>
          <h2 className="fb-title text-center text-[1.3rem] leading-tight sm:text-[1.55rem]" style={{ WebkitTextStroke: "0" }}>Felicitation Board</h2>
          <div className="mx-auto mt-1 h-px w-2/3 bg-gradient-to-r from-transparent via-[#f0b47a] to-transparent" />
          <div className={`relative ${entry ? "min-h-[5.5rem]" : "min-h-[2.25rem] sm:min-h-[5.5rem]"}`}>
            {entry ? (
              <div key={animKey} className={`${animate ? (leaving ? "fb-exit" : "fb-enter") : ""} flex flex-col items-center pt-2 text-center`} data-entry-id={entry.id}>
                <p className="text-base font-bold text-slate-900">🎉 {entry.candidateName}</p>
                <p className="text-xs text-slate-600">{entry.locality}</p>
                <p className="text-xs text-slate-600">{entry.city}</p>
                <p className="mt-1 rounded-full bg-[#fff1e0] px-2.5 py-0.5 text-xs font-semibold text-[#9c3d0a]">Qualified: {entry.examName}</p>
              </div>
            ) : (
              <p className="pt-4 text-center text-xs text-slate-500">{state.paused ? "Broadcasts are paused." : "Cleared an exam? Celebrate it here."}</p>
            )}
            {entry && animate ? <Petals burstKey={animKey} count={petalCount} /> : null}
          </div>
          {entries.length > 1 ? (
            <div className="mt-1 flex justify-center gap-1" aria-hidden="true">
              {entries.map((e, i) => <span key={e.id} className={`h-1 w-1 rounded-full ${i === slot.index ? "bg-[#e8590c]" : "bg-[#f1d3b0]"}`} />)}
            </div>
          ) : null}
        </section>
      )}
      {callIn}
      <FelicitationSubmitModal open={open} onClose={() => setOpen(false)} priceRupees={state.priceRupees} referencePriceRupees={state.referencePriceRupees} />
    </div>
  );
}
