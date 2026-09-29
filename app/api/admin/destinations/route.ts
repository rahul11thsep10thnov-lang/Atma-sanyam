import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { json } from "@/lib/api/http";

/** Superseded by POST /api/admin/pipeline/onboard, which runs the full validated page-creation pipeline. */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json({ error: "Use POST /api/admin/pipeline/onboard", replaced_by: "/api/admin/pipeline/onboard" }, { status: 410 });
}
