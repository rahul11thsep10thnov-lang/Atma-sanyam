import Link from "next/link";

const classes =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700";

/** A badge, optionally linking somewhere. Without `href`, it's a plain
 * non-interactive preview — used until the target listing page exists. */
export function Chip({
  label,
  count,
  href,
}: {
  label: string;
  count?: number;
  href?: string;
}) {
  const content = (
    <>
      {label}
      {typeof count === "number" ? (
        <span className="text-slate-400">{count}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${classes} hover:border-brand-600`}>
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
