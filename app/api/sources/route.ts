import { getDb } from "@/lib/master/repo";
import { json } from "@/lib/api/http";

export async function GET() {
  const sources = getDb().sources;
  return json({ count: sources.length, results: sources });
}
