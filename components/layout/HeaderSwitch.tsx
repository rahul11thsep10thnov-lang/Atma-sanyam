"use client";

import { usePathname } from "next/navigation";

/** Shows the wallpaper-and-logo header on the homepage only; every inner page gets the slim bar. */
export function HeaderSwitch({ homePath, home, nested }: { homePath: string; home: React.ReactNode; nested: React.ReactNode }) {
  const path = (usePathname() ?? "/").replace(/\/$/, "");
  return <>{path === homePath || path === "" ? home : nested}</>;
}
