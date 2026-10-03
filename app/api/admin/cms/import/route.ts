import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { createDestination } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { candidatesFromText, extractFromPdf } from "@/lib/cms/pipeline/pdf";
import { enqueue } from "@/lib/cms/pipeline/runner";
import { getDestination, getImport, listImports, saveImport } from "@/lib/cms/store";
import type { ImportRecord } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const rec = getImport(id);
    return rec ? json({ import: rec }) : notFound("Import not found");
  }
  return json({ imports: listImports().map((r) => ({ id: r.id, file_name: r.file_name, uploaded_at: r.uploaded_at, candidates: r.candidates.length, confirmed_at: r.confirmed_at, created: r.created_ids.length })) });
}

/**
 * POST /api/admin/cms/import — multipart { file: PDF } or { text: "one name per line" }.
 * Extracts the text layer, identifies place names, cleans and de-duplicates them and
 * stores a preview. Nothing is created until the admin confirms (PUT).
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected multipart form data with a PDF file");
  }
  const file = form.get("file");
  const pasted = form.get("text");
  let extracted;
  let fileName = "pasted-list.txt";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PDF_BYTES) return badRequest("PDF must be 25 MB or smaller");
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return badRequest("Upload a PDF file");
    fileName = file.name.slice(0, 160);
    try {
      extracted = await extractFromPdf(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      return badRequest(`Could not read the PDF: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (typeof pasted === "string" && pasted.trim()) {
    extracted = candidatesFromText(pasted);
  } else {
    return badRequest("Attach a PDF (file) or paste a list (text)");
  }
  const rec: ImportRecord = {
    id: `IMP-${Date.now().toString(36)}`,
    file_name: fileName,
    uploaded_at: new Date().toISOString(),
    page_count: extracted.page_count,
    raw_line_count: extracted.raw_line_count,
    candidates: extracted.candidates.slice(0, 2000),
    confirmed_at: null,
    created_ids: []
  };
  saveImport(rec);
  return json({ import: rec }, { status: 201 });
}

/**
 * PUT /api/admin/cms/import — { id, candidates: [{ slug, name, state?, selected }] }
 * Creates one DRAFT destination per selected candidate and queues them, in order, for the pipeline.
 */
export async function PUT(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  let body: { id?: unknown; candidates?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (typeof body.id !== "string") return badRequest("id is required");
  const rec = getImport(body.id);
  if (!rec) return notFound("Import not found");
  if (rec.confirmed_at) return badRequest("This import was already confirmed");
  const edits = Array.isArray(body.candidates) ? (body.candidates as Array<Record<string, unknown>>) : [];
  const bySlug = new Map(edits.filter((c) => typeof c.slug === "string").map((c) => [c.slug as string, c]));
  const created: string[] = [];
  const candidates = rec.candidates.map((c) => {
    const e = bySlug.get(c.slug);
    const name = e && typeof e.name === "string" && e.name.trim() ? e.name.trim().slice(0, 160) : c.name;
    const selected = e ? e.selected === true : c.selected;
    const state = e && typeof e.state === "string" && e.state.trim() ? e.state.trim().slice(0, 80) : e && e.state === "" ? null : c.state;
    return { ...c, name, selected, state };
  });
  for (const c of candidates) {
    if (!c.selected) continue;
    // An existing record is queued as it is (its content is kept; empty fields and images are filled in).
    if (c.duplicate_of && getDestination(c.duplicate_of)) {
      created.push(c.duplicate_of);
      continue;
    }
    const doc = createDestination(c.name, c.state ?? null, { provenance: { created: [{ label: `PDF import ${rec.file_name}`, url: null, retrieved_at: new Date().toISOString(), status: "MANUAL" }] } });
    created.push(doc.id);
  }
  const job = created.length ? enqueue(rec.id, created) : null;
  const saved = saveImport({ ...rec, candidates, confirmed_at: new Date().toISOString(), created_ids: created });
  return json({ import: saved, created: created.length, job });
}
