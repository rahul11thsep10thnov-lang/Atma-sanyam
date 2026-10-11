"use client";

import { useSiteSettings } from "@/lib/site";

/** The quotation under the website name — edited in the admin console
 * (Settings → Website) and served by the API; a built-in default is shown
 * until it loads or when the API is not configured. */
export default function SiteQuote({ className = "" }: { className?: string }) {
  const site = useSiteSettings();
  return (
    <span className={`brand-quote mt-0.5 block line-clamp-2 text-[0.74rem] leading-tight text-[#7a4a2a] sm:truncate sm:text-[1.05rem] sm:leading-normal ${className}`} title={site.quote}>
      {site.quote}
    </span>
  );
}
