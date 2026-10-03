import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import type { CmsImage } from "@/lib/cms/types";
import { saveMedia } from "@/lib/cms/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * POST /api/admin/cms/upload — multipart form: file, plus licence metadata
 * (photographer, license, license_url, source_page_url, attribution_text, caption, alt).
 * Stores the file in media storage (/media/uploads/…) and returns an APPROVED CmsImage record the
 * editor attaches to a destination, attraction, hotel or restaurant. The licence
 * fields are recorded as entered — the person uploading is responsible for the rights.
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected multipart form data");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("file is required");
  const ext = EXT[file.type];
  if (!ext) return badRequest("Only JPEG, PNG and WebP images are accepted");
  if (file.size === 0 || file.size > MAX_BYTES) return badRequest("Image must be between 1 byte and 15 MB");
  const text = (k: string, max = 300) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  const license = text("license", 120);
  if (!license) return badRequest("license is required — record the licence under which this image may be used");

  const id = `UPL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const local = saveMedia("uploads", id, ext, Buffer.from(await file.arrayBuffer()));

  const now = new Date().toISOString();
  const image: CmsImage = {
    id,
    url: local,
    thumbnail_url: null,
    original_url: null,
    source: "Manual upload",
    source_page_url: text("source_page_url", 500),
    photographer: text("photographer", 160),
    license,
    license_url: text("license_url", 500),
    attribution_required: form.get("attribution_required") === "true",
    attribution_text: text("attribution_text", 300),
    download_status: "LOCAL",
    local_path: local,
    provider: "manual",
    approval_status: "APPROVED",
    caption: text("caption", 300),
    alt: text("alt", 200) ?? file.name.replace(/\.[a-z0-9]+$/i, ""),
    width: null,
    height: null,
    retrieved_at: now,
    sort_order: 0
  };
  return json({ image }, { status: 201 });
}
