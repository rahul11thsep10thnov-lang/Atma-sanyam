import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import { lastReport, runMasterImport } from "@/lib/cms/masterImport";
import { enqueue } from "@/lib/cms/pipeline/runner";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

/** GET — the last master-workbook import report. */
export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json({ report: lastReport() });
}

/**
 * POST multipart { file: .xlsx, mode: "preview" | "apply" } — previews or applies an import of the
 * India Tourism Master Database workbook. Applying never duplicates or overwrites: matching records are
 * linked and only empty fields are filled; new rows become DRAFT, UNVERIFIED records.
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected multipart form data with an .xlsx file");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("file is required");
  if (!/\.xlsx$/i.test(file.name)) return badRequest("Only .xlsx workbooks are accepted");
  if (file.size === 0 || file.size > MAX_BYTES) return badRequest("Workbook must be between 1 byte and 20 MB");
  const apply = form.get("mode") === "apply";
  try {
    const out = await runMasterImport(Buffer.from(await file.arrayBuffer()), file.name, { dryRun: !apply, enqueue: (ids) => enqueue("master-v1", ids) });
    return json(out);
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Could not read the workbook");
  }
}
