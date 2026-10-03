import Link from "next/link";

export interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ items, tone = "dark" }: { items: Crumb[]; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <nav aria-label="Breadcrumb" className={light ? "py-2 text-xs text-white/75" : "container-page py-3 text-xs text-charcoal-light"}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className={light ? "font-medium text-white" : "font-medium text-charcoal"}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className={light ? "hover:text-white" : "hover:text-forest-600"}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
