"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Keeps the search bar showing the current /jobs filters after a search. */
export function BigSearchDefaults() {
  const pathname = usePathname();
  const sp = useSearchParams();
  useEffect(() => {
    const form = document.getElementById("big-search") as HTMLFormElement | null;
    if (!form) return;
    const onJobs = pathname === "/jobs";
    for (const name of ["state", "qualification", "q"]) {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = onJobs ? (sp.get(name) ?? "") : "";
    }
  }, [pathname, sp]);
  return null;
}
