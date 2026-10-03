import { NextResponse } from "next/server";
import { getBoardState } from "@/lib/felicitation/service";

/** Public board feed: only eligible entries and only public fields
 * (name, locality, city, exam). serverNow lets every visitor compute the
 * same synchronized slot. */
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getBoardState();
  return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
}
