import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // `basePath` may already carry its own query string (e.g. search's
  // filters) — append `page` with `&` in that case, `?` otherwise.
  const withPage = (p: number) =>
    `${basePath}${basePath.includes("?") ? "&" : "?"}page=${p}`;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link
          href={withPage(page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={withPage(page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
