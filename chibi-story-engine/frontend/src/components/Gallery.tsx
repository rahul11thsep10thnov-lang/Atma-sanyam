import { inputClass } from "./ui";

export interface FilterState {
  q: string;
  category: string;
  approval: string;
}

export const emptyFilter: FilterState = { q: "", category: "", approval: "" };

/** Search + category + approval filters shared by the asset galleries. */
export function GalleryFilters({ value, onChange, categories, noun }: { value: FilterState; onChange: (v: FilterState) => void; categories: [string, number][]; noun: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" role="search" aria-label={`Filter ${noun}`}>
      <input
        className={`${inputClass} max-w-xs`}
        type="search"
        placeholder={`Search ${noun} by name, alias, tag or story…`}
        aria-label={`Search ${noun}`}
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
      />
      <select aria-label="Category" className={`${inputClass} max-w-[14rem]`} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map(([name, n]) => (
          <option key={name} value={name}>
            {name} ({n})
          </option>
        ))}
      </select>
      <select aria-label="Approval status" className={`${inputClass} max-w-[10rem]`} value={value.approval} onChange={(e) => onChange({ ...value, approval: e.target.value })}>
        <option value="">Any status</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  );
}

export function matches(a: { name: string; id: string; aliases: string[]; tags: string[]; related_stories?: string[]; category?: string | null; approval_status: string; catalog_code?: string | null }, f: FilterState): boolean {
  if (f.category && (a.category ?? "original") !== f.category) return false;
  if (f.approval && a.approval_status !== f.approval) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  return [a.name, a.id, a.catalog_code ?? "", ...a.aliases, ...a.tags, ...(a.related_stories ?? [])].some((t) => t.toLowerCase().includes(q));
}

export function countBy<T>(items: T[], key: (t: T) => string): [string, number][] {
  const m = new Map<string, number>();
  items.forEach((i) => m.set(key(i), (m.get(key(i)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
