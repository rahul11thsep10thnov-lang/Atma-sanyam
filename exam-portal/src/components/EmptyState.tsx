/** Shown wherever a section/list has nothing published yet (Section 35:
 * every list needs an honest empty state, not a blank gap). */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}
