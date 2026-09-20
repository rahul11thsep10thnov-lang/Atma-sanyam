import type { Locale } from "./config";
import { locales } from "./config";

/** Swaps the locale segment of a pathname, preserving the rest of the path (destination/page). */
export function replaceLocaleInPath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split("/");
  const first = segments[1];
  if ((locales as readonly string[]).includes(first)) {
    segments[1] = nextLocale;
    return segments.join("/") || "/";
  }
  return `/${nextLocale}${pathname}`;
}

export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/");
  const first = segments[1];
  if ((locales as readonly string[]).includes(first)) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}
