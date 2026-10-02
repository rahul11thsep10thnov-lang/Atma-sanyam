import type { Metadata } from "next";
import Link from "next/link";
import {
  searchSite,
  contentTypeLabel,
  type SearchContentType,
} from "@/lib/services/search";
import { listOrganizations, listCategories, listStates } from "@/lib/services/lookups";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const TYPE_OPTIONS: SearchContentType[] = [
  "recruitment",
  "exam",
  "job",
  "result",
  "admit-card",
  "answer-key",
  "syllabus",
  "article",
  "organization",
];

const selectClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    organizationId?: string;
    categoryId?: string;
    stateId?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = TYPE_OPTIONS.includes(params.type as SearchContentType)
    ? (params.type as SearchContentType)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, total, pageSize }, organizations, categories, states] = await Promise.all([
    searchSite({
      q,
      type,
      organizationId: params.organizationId,
      categoryId: params.categoryId,
      stateId: params.stateId,
      page,
    }),
    listOrganizations(),
    listCategories(),
    listStates(),
  ]);

  // Preserve the current query/filters across pagination links and the
  // filter form's own action target.
  const baseQuery: Record<string, string> = { q };
  if (type) baseQuery.type = type;
  if (params.organizationId) baseQuery.organizationId = params.organizationId;
  if (params.categoryId) baseQuery.categoryId = params.categoryId;
  if (params.stateId) baseQuery.stateId = params.stateId;
  const basePath = `/search?${new URLSearchParams(baseQuery).toString()}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-slate-900">
        {q ? `Search results for "${q}"` : "Search"}
      </h1>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Query</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            className={selectClass}
            placeholder="Search…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Type</span>
          <select name="type" defaultValue={type ?? ""} className={selectClass}>
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {contentTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Organization</span>
          <select
            name="organizationId"
            defaultValue={params.organizationId ?? ""}
            className={selectClass}
          >
            <option value="">Any</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            name="categoryId"
            defaultValue={params.categoryId ?? ""}
            className={selectClass}
          >
            <option value="">Any</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">State</span>
          <select name="stateId" defaultValue={params.stateId ?? ""} className={selectClass}>
            <option value="">Any</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Apply
        </button>
      </form>

      {q.length > 0 && q.length < 2 ? (
        <p className="text-sm text-slate-500">Type at least 2 characters to search.</p>
      ) : null}

      {q.length >= 2 && items.length === 0 ? (
        <EmptyState message={`No published content matches "${q}".`} />
      ) : null}

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={`${item.type}-${item.href}-${index}`}
              className="rounded-md border border-slate-200 bg-white px-4 py-3"
            >
              <Link href={item.href} className="hover:underline">
                <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {contentTypeLabel(item.type)}
                </span>
                <span className="text-sm font-medium text-slate-900">{item.title}</span>
              </Link>
              {item.subtitle ? (
                <span className="ml-2 text-xs text-slate-500">{item.subtitle}</span>
              ) : null}
              {item.date ? (
                <span className="ml-2 text-xs text-slate-400">{formatDate(item.date)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Pagination page={page} pageSize={pageSize} total={total} basePath={basePath} />
    </main>
  );
}
