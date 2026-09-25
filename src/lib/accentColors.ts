import type { CSSProperties } from "react";

// Category color system: each item (state, subject, exam) gets a
// deterministic pastel tile + a strong accent, so grids read as organized.
export interface Accent {
  name: string;
  border: string; // strong accent (left/top card borders, titles)
  bg: string; // tailwind class for soft background
  text: string; // tailwind class for accent text
  chipBg: string; // soft background (inline style)
  tileBg: string; // pastel tile background
  tileBorder: string; // pastel tile border
  tileText: string; // readable accent text on light backgrounds
}

const PALETTE: Accent[] = [
  { name: "orange", border: "#ff6a13", bg: "bg-orange-50", text: "text-[#c2410c]", chipBg: "#fff1e6", tileBg: "#fff6ee", tileBorder: "#fcd6b4", tileText: "#c2410c" },
  { name: "purple", border: "#6d4fe0", bg: "bg-violet-50", text: "text-[#5b3fd1]", chipBg: "#f1eeff", tileBg: "#f4f2ff", tileBorder: "#d9d1fb", tileText: "#5b3fd1" },
  { name: "blue", border: "#1d78d8", bg: "bg-blue-50", text: "text-[#1d64c4]", chipBg: "#eaf3fd", tileBg: "#eff6ff", tileBorder: "#c6dcf8", tileText: "#1d64c4" },
  { name: "green", border: "#10a760", bg: "bg-emerald-50", text: "text-[#0b8a4e]", chipBg: "#e8f8ef", tileBg: "#eefbf4", tileBorder: "#bfe9d2", tileText: "#0b8a4e" },
  { name: "red", border: "#dc3b2f", bg: "bg-red-50", text: "text-[#b42318]", chipBg: "#fdecea", tileBg: "#fff3f2", tileBorder: "#f7c9c4", tileText: "#b42318" },
  { name: "gold", border: "#e0a100", bg: "bg-amber-50", text: "text-[#a16207]", chipBg: "#fff8e6", tileBg: "#fffaeb", tileBorder: "#f5dd9a", tileText: "#a16207" },
];

export function getAccent(index: number): Accent {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export function getAccentByName(name: Accent["name"]): Accent {
  return PALETTE.find((a) => a.name === name) ?? PALETTE[0];
}

// Stable color per subject so e.g. "Reasoning" is always lavender everywhere.
const SUBJECT_ACCENT: Record<string, Accent["name"]> = {
  "state-gk": "orange",
  gk: "green",
  reasoning: "purple",
  maths: "blue",
  hindi: "red",
  english: "blue",
  science: "green",
  history: "gold",
  geography: "green",
  polity: "purple",
  constitution: "purple",
  computer: "blue",
  "current-affairs": "gold",
  "police-law": "red",
};

export function getSubjectAccent(subjectId: string): Accent {
  return getAccentByName(SUBJECT_ACCENT[subjectId] ?? "orange");
}

// Inline style helper for .tile elements.
export function tileStyle(a: Accent): CSSProperties {
  return {
    ["--tile-bg" as string]: a.tileBg,
    ["--tile-border" as string]: a.tileBorder,
    ["--tile-text" as string]: a.tileText,
  } as CSSProperties;
}
