"use client";

import { useSiteSettings } from "@/lib/site";

/** The quotation under the website name — edited in the admin console
 * (Settings → Website) and served by the API; a built-in default is shown
 * until it loads or when the API is not configured. */
export default function SiteQuote({ className = "" }: { className?: string }) {
  const site = useSiteSettings();
  return (
    <span className={`brand-quote mt-0.5 block truncate text-[0.82rem] text-[#7a4a2a] sm:text-[1.05rem] ${className}`} title={site.quote}>
      {site.quote}
    </span>
  );
}
