import { NextRequest } from "next/server";
import { search } from "@/lib/search/search";
import { intParam, json, rateLimit } from "@/lib/api/http";

/** GET /api/search?q=3 day trip from Delhi — intent-aware search over the master database. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "search", 90);
  if (limited) return limited;
  const q = new URL(request.url).searchParams;
  const query = (q.get("q") ?? "").slice(0, 200);
  const limit = intParam(q.get("limit"), 1, 30, 10);
  if (!query.trim()) return json({ query, intent: "NONE", interpretation: "", count: 0, hits: [] });
  const res = search(query, limit);
  return json({ ...res, count: res.hits.length });
}
