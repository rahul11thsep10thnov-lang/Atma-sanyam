"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n/lang";

/** Header language switch: sets the cookie via /lang/<code> and returns here. */
export function LangToggle({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const to = `${pathname}${qs ? `?${qs}` : ""}`;
  const next: Lang = lang === "hi" ? "en" : "hi";
  return (
    <a
      href={`/lang/${next}?to=${encodeURIComponent(to)}`}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      lang={next}
      aria-label={next === "hi" ? "हिन्दी में देखें" : "View in English"}
    >
      {next === "hi" ? "हिन्दी" : "English"}
    </a>
  );
}
