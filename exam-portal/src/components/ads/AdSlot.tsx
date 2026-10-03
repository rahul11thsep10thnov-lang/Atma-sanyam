"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** One AdSense display unit. Renders nothing without a publisher id/slot
 * or for members (the parent passes `hidden`). Reserves its height so the
 * page does not jump when the ad loads (CLS). */
export function AdSlot({ slot, hidden = false, className = "" }: { slot?: string; hidden?: boolean; className?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pushed = useRef(false);
  useEffect(() => {
    if (hidden || !client || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers */
    }
  }, [client, slot, hidden]);
  if (hidden || !client || !slot) return null;
  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ minHeight: 100 }} aria-label="Advertisement">
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
