import { NextResponse } from "next/server";

/**
 * A consistent JSON envelope across every public API route (Section 30:
 * Android/mobile clients need one predictable shape, not a different
 * one per content type just because the underlying admin service
 * happened to name its return key `jobs` vs `items` vs `results`).
 */
export function paginatedResponse<T>(items: T[], total: number, pageSize: number, page: number) {
  return NextResponse.json({
    data: items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export function detailResponse<T>(item: T | null | undefined) {
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: item });
}

/** Clamps to a positive integer, defaulting to 1 for anything else —
 * never lets a malformed `?page=` value 500 the route. */
export function parsePage(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get("page"));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}
