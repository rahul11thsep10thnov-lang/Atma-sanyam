// A rotating accent-color palette used to color-code cards (state cards,
// subject cards, exam cards) the way category-coded UIs do — each item gets
// a deterministic color from its position so the grid reads as organized
// rather than uniform, without hardcoding a color per item.
export interface Accent {
  name: string;
  border: string; // CSS var reference for card-accent left border
  bg: string; // tailwind bg-* class for pastel chip background
  text: string; // tailwind text-* class for accent-colored text
  chipBg: string; // inline style bg for small chips
}

const PALETTE: Accent[] = [
  { name: "orange", border: "var(--brand-orange)", bg: "bg-orange-50", text: "text-brand-orange", chipBg: "var(--brand-orange-light)" },
  { name: "purple", border: "var(--brand-purple)", bg: "bg-violet-50", text: "text-brand-purple", chipBg: "var(--brand-purple-light)" },
  { name: "blue", border: "var(--brand-blue)", bg: "bg-blue-50", text: "text-brand-blue", chipBg: "var(--brand-blue-light)" },
  { name: "green", border: "var(--brand-green)", bg: "bg-emerald-50", text: "text-brand-green", chipBg: "var(--brand-green-light)" },
  { name: "gold", border: "var(--brand-gold)", bg: "bg-amber-50", text: "text-brand-gold", chipBg: "var(--brand-gold-light)" },
  { name: "navy", border: "var(--brand-navy)", bg: "bg-slate-50", text: "text-brand-navy", chipBg: "#eaf0f6" },
];

export function getAccent(index: number): Accent {
  return PALETTE[index % PALETTE.length];
}
