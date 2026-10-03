import { NextResponse } from "next/server";
import { readMedia } from "@/lib/cms/storage";

export const dynamic = "force-dynamic";

/** Serves approved/uploaded image files from the media storage directory. */
export function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const file = readMedia(params.path ?? []);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: { "Content-Type": file.type, "Content-Length": String(file.size), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }
  });
}
