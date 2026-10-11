"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeNone = () => () => {};

/** Accessible modal: role=dialog, Esc closes, focus moves in and returns. */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Portal target exists only in the browser.
  const mounted = useSyncExternalStore(subscribeNone, () => true, () => false);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  // Rendered into <body> so no ancestor (header, board, clipped or
  // transformed wrappers) can crop it or sit on top of it.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`max-h-[100dvh] w-full overflow-y-auto sm:max-h-[calc(100dvh-2rem)] rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const inputCls = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
export const labelCls = "block text-xs font-semibold text-slate-700";
export const primaryBtn = "inline-flex w-full items-center justify-center rounded-lg bg-[#6b3412] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4a220a] disabled:opacity-60";
export const secondaryBtn = "inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
