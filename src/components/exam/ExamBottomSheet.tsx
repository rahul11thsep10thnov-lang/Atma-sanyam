"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ExamBottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted || !open) return null;

  // Portaled to document.body so this sheet isn't trapped inside any
  // sticky/positioned ancestor's stacking context (fixed z-index children
  // of a `position: sticky` parent can't out-rank later same-context
  // siblings — see MobileMenu for the same fix).
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/40"
      />
      <div className="relative z-10 max-h-[75vh] w-full overflow-y-auto rounded-t-2xl bg-white pb-safe">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close question palette"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
