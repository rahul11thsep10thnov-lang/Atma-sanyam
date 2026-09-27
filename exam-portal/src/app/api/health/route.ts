import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/health — liveness + database connectivity check.
 *
 * Used by uptime monitors and deployment health checks (Section 30: clean,
 * minimal public APIs). Exposes no data beyond a boolean.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}
