/** A plain, non-interactive badge — used for states/organizations until
 * their listing pages exist (Phase 5) to preview the categorization
 * without linking anywhere yet. */
export function Chip({ label, count }: { label: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
      {label}
      {typeof count === "number" ? (
        <span className="text-slate-400">{count}</span>
      ) : null}
    </span>
  );
}
