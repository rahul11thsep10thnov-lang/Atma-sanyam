export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  contentCount?: number;
}

// "Nature › Mountains › Himalayas" labels, ordered depth-first.
export function categoryOptions(all: Category[]) {
  const byParent = new Map<string | null, Category[]>();
  for (const c of all) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const out: { id: string; label: string; depth: number; rootId: string }[] = [];
  const walk = (parent: string | null, trail: string[], depth: number, rootId: string | null) => {
    for (const c of byParent.get(parent) ?? []) {
      const root = rootId ?? c.id;
      out.push({ id: c.id, label: [...trail, c.name].join(' › '), depth, rootId: root });
      walk(c.id, [...trail, c.name], depth + 1, root);
    }
  };
  walk(null, [], 0, null);
  return out;
}
