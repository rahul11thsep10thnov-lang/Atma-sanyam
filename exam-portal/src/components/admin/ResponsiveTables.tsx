"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * On phones every admin table becomes a stack of cards (CSS in globals.css,
 * `.admin-cards`). A card row needs to say which column each value belongs
 * to, so this copies each header's text onto the cells below it as
 * `data-label`. It re-runs when the route changes and when a page updates
 * its table (filters, pagination). Tables can opt out with `data-no-cards`.
 */
export function ResponsiveTables() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".admin-cards");
    if (!root) return;
    const label = () => {
      root.querySelectorAll<HTMLTableElement>("table:not([data-no-cards])").forEach((table) => {
        const heads = Array.from(table.querySelectorAll<HTMLElement>("thead th")).map((th) => (th.textContent ?? "").trim());
        if (!heads.length) return;
        table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((tr) => {
          let col = 0;
          Array.from(tr.children).forEach((cell) => {
            const span = Number((cell as HTMLTableCellElement).colSpan) || 1;
            if (span === 1 && !(cell as HTMLElement).dataset.label && heads[col]) (cell as HTMLElement).dataset.label = heads[col];
            col += span;
          });
        });
      });
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
