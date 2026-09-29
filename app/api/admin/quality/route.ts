import { NextRequest } from "next/server";
import { getDb } from "@/lib/master/repo";
import { assessAll, auditLinks, pendingVerification, staleFacts } from "@/lib/master/engine/verification";
import { validateDatabase } from "@/lib/master/engine/validation";
import { getDestinationContent } from "@/lib/master/generation/pipeline";
import { authorizeAdmin } from "@/lib/auth/admin";
import { json, rateLimit } from "@/lib/api/http";

/** GET /api/admin/quality — one report: integrity, verification queue, stale facts, conflicts, links, generated-page checks. */
export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const limited = rateLimit(request, "admin-quality", 30);
  if (limited) return limited;

  const db = getDb();
  const issues = validateDatabase(db);
  const health = assessAll(db).reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.health]: (acc[a.health] ?? 0) + 1 }), {});
  const pages = db.destinations.map((d) => ({ destination: d.slug, content: getDestinationContent(db, d.id) }));

  return json({
    generated_at: new Date().toISOString(),
    integrity: { errors: issues.filter((i) => i.severity === "ERROR"), warnings: issues.filter((i) => i.severity === "WARNING").length },
    facts: { total: db.facts.length, health },
    pending_verification: pendingVerification(db),
    stale: staleFacts(db).map((a) => ({ id: a.fact.id, entity_id: a.fact.entity_id, fact_type: a.fact.fact_type, verified_at: a.fact.verified_at })),
    conflicts: db.conflict_records.filter((c) => c.status === "OPEN"),
    links: auditLinks(db),
    generated_pages: pages.map((p) => ({
      destination: p.destination,
      fact_check: p.content.fact_check.status,
      violations: p.content.fact_check.violations.length,
      seo_errors: p.content.seo_issues.filter((i) => i.severity === "ERROR").length
    }))
  });
}
