import Link from "next/link";

export interface RelatedItem {
  title: string;
  href: string;
}

export function RelatedContent({
  title,
  items,
}: {
  title: string;
  items: RelatedItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-brand-700 hover:underline"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
