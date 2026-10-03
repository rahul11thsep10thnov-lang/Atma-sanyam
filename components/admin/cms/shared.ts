/** Style tokens and formatters shared by server pages and client components (no "use client" — plain values survive both). */

export const field = "mt-1 w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20 disabled:bg-forest-50";
export const label = "block text-sm font-medium text-charcoal";
export const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-forest-700 text-white hover:bg-forest-600`;
export const btnSecondary = `${btn} border border-forest-200 bg-white text-charcoal hover:bg-forest-50`;
export const btnDanger = `${btn} border border-terracotta-500/40 bg-white text-terracotta-700 hover:bg-terracotta-50`;
export const btnSaffron = `${btn} bg-saffron-500 text-white hover:bg-saffron-600`;

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
