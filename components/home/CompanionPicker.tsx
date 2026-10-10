"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CompanionType } from "@/lib/cms/types";
import { COMPANION_COOKIE } from "@/lib/cms/companion";

/**
 * "Who's coming along?" — four circular options. The choice is kept in a
 * session cookie so the server can tailor the recommendation rail, and it
 * survives navigation until the browser closes.
 *
 * The circles are drawn illustrations, not stock photographs: we only use
 * photographs whose licence has been checked and recorded.
 */
const ART: Record<CompanionType, { bg: string; icon: JSX.Element }> = {
  COUPLE: {
    bg: "from-terracotta-300 to-saffron-400",
    icon: (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="24" cy="22" r="8" fill="#fff" />
        <circle cx="42" cy="24" r="7" fill="#fff" opacity=".9" />
        <path d="M10 52c0-9 6-15 14-15s14 6 14 15" fill="#fff" />
        <path d="M30 52c0-8 5-13 12-13s12 5 12 13" fill="#fff" opacity=".9" />
        <path d="M33 10c2-3 6-3 7 0 1 3-4 7-4 7s-5-4-3-7z" fill="#B45A3C" />
      </svg>
    )
  },
  FAMILY: {
    bg: "from-forest-300 to-forest-500",
    icon: (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="18" cy="20" r="7" fill="#fff" />
        <circle cx="46" cy="20" r="7" fill="#fff" />
        <circle cx="32" cy="34" r="5" fill="#fff" opacity=".95" />
        <path d="M6 52c0-9 5-14 12-14s12 5 12 14" fill="#fff" />
        <path d="M34 52c0-9 5-14 12-14s12 5 12 14" fill="#fff" />
        <path d="M24 56c0-6 3-10 8-10s8 4 8 10" fill="#fff" opacity=".95" />
      </svg>
    )
  },
  FRIENDS: {
    bg: "from-saffron-300 to-saffron-500",
    icon: (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="14" cy="22" r="6" fill="#fff" />
        <circle cx="32" cy="18" r="7" fill="#fff" />
        <circle cx="50" cy="22" r="6" fill="#fff" />
        <path d="M3 50c0-8 4-13 11-13s11 5 11 13" fill="#fff" />
        <path d="M20 50c0-9 5-15 12-15s12 6 12 15" fill="#fff" />
        <path d="M39 50c0-8 4-13 11-13s11 5 11 13" fill="#fff" />
      </svg>
    )
  },
  SOLO: {
    bg: "from-forest-400 to-saffron-500",
    icon: (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="32" cy="20" r="9" fill="#fff" />
        <path d="M14 54c0-11 8-18 18-18s18 7 18 18" fill="#fff" />
        <path d="M44 30l8-6 2 3-8 6z" fill="#fff" opacity=".8" />
        <rect x="42" y="36" width="6" height="12" rx="2" fill="#1F3B32" opacity=".5" />
      </svg>
    )
  }
};

export function CompanionPicker({
  initial,
  title,
  labels,
  hint,
  clearLabel,
  tone = "dark"
}: {
  initial: CompanionType | null;
  title: string;
  labels: Record<CompanionType, string>;
  hint: string;
  clearLabel: string;
  /** "light" = white text, for use on a photograph. */
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  const [selected, setSelected] = useState<CompanionType | null>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function choose(next: CompanionType | null) {
    setSelected(next);
    document.cookie = next ? `${COMPANION_COOKIE}=${next}; path=/; SameSite=Lax` : `${COMPANION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
    start(() => router.refresh());
  }

  return (
    <div className="mx-auto mt-10 max-w-3xl text-center">
      <h2 className={`text-xs font-semibold uppercase tracking-[0.28em] sm:text-sm ${light ? "text-white drop-shadow" : "text-forest-700"}`}>{title}</h2>
      <ul className="mt-5 flex snap-x justify-start gap-6 overflow-x-auto px-3 pb-3 pt-3 sm:justify-center sm:gap-10" role="radiogroup" aria-label={title}>
        {(["SOLO", "COUPLE", "FRIENDS", "FAMILY"] as CompanionType[]).map((type) => {
          const active = selected === type;
          return (
            <li key={type} className="snap-center shrink-0">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(active ? null : type)}
                className="group flex flex-col items-center gap-2 outline-none"
              >
                <span
                  className={`relative block h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br ring-4 transition sm:h-24 sm:w-24 ${ART[type].bg} ${active ? "ring-saffron-500 scale-105 shadow-lg" : "ring-white shadow-md group-hover:scale-105 group-focus-visible:ring-forest-500"}`}
                >
                  <Image src={`/images/companions/${type.toLowerCase()}.jpg`} alt="" fill sizes="96px" className="scale-110 object-cover" />
                </span>
                <span className={`text-sm font-semibold ${active ? (light ? "text-saffron-300" : "text-saffron-700") : light ? "text-white drop-shadow" : "text-charcoal"}`}>{labels[type]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className={`mt-3 min-h-[1.25rem] text-xs transition ${light ? "text-white/90" : "text-charcoal-light"} ${selected ? "opacity-100" : "opacity-0"}`} aria-live="polite">
        {selected && (
          <>
            {hint.replace("{type}", labels[selected].toLowerCase())}{" "}
            <button type="button" onClick={() => choose(null)} className="underline decoration-dotted hover:text-forest-700" disabled={pending}>{clearLabel}</button>
          </>
        )}
      </p>
    </div>
  );
}
