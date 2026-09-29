"use client";

import { useEffect } from "react";

/** The root layout is locale-agnostic, so the page's language is applied to <html> once the locale segment renders. */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
