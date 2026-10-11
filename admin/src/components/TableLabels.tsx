'use client';

import { useEffect } from 'react';

/** On phones the CSS turns each table row into a card. A cell has no heading in
 * that layout, so copy the column heading onto every cell (data-label) as the
 * table renders or changes. Does nothing visible on wide screens. */
function label(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>('.table-wrap > table').forEach((table) => {
    const heads = Array.from(table.querySelectorAll<HTMLElement>('thead th')).map((th) => (th.textContent ?? '').replace(/[↕▲▼]/g, '').trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((cell, i) => {
        const text = heads[i] ?? '';
        if (cell.getAttribute('data-label') !== text) cell.setAttribute('data-label', text);
      });
    });
  });
}

export function TableLabels() {
  useEffect(() => {
    const target = document.querySelector('.main') ?? document.body;
    label(target);
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        label(target);
      });
    });
    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
