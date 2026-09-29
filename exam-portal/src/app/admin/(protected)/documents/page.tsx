import type { Metadata } from "next";
import { listDocumentsForAdmin } from "@/lib/services/documents";
import { listExamsForSelect, listOrganizations } from "@/lib/services/lookups";
import { Pagination } from "@/components/Pagination";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { DocumentUploader } from "./DocumentUploader";
import {
  uploadDocumentAction,
  toggleVerifiedAction,
  deleteDocumentAction,
  runExtractionAction,
} from "./actions";

export const metadata: Metadata = { title: "Documents" };

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; uploaded?: string; deleted?: string; error?: string }>;
}) {
  const { page: pageParam, uploaded, deleted, error } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [{ items, total, pageSize }, exams, organizations] = await Promise.all([
    listDocumentsForAdmin(page),
    listExamsForSelect(),
    listOrganizations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Documents</h1>

      {uploaded ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Document uploaded. It&apos;s UNVERIFIED until an admin checks it
          against the official source.
        </p>
      ) : null}
      {deleted ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Document deleted.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <DocumentUploader action={uploadDocumentAction} exams={exams} organizations={organizations} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">File</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Exam</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Extraction</th>
              <th className="px-4 py-2">Uploaded</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((doc) => (
              <tr key={doc.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <a
                    href={doc.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {doc.filename}
                  </a>
                  {doc.sourceUrl ? (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="ml-2 text-xs text-slate-400 hover:underline"
                    >
                      source
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {doc.documentType.replace("_", " ")}
                </td>
                <td className="px-4 py-2 text-slate-600">{doc.exam?.title ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      doc.verificationStatus === "VERIFIED"
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {doc.verificationStatus}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {doc.extractionJobs[0] ? (
                    <Link
                      href={`/admin/documents/extraction/${doc.extractionJobs[0].id}`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                      title={doc.extractionJobs[0].error ?? undefined}
                    >
                      {doc.extractionJobs[0].status} (#{doc.extractionJobs[0].attempt})
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Not run</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDate(doc.uploadedAt)}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <form action={toggleVerifiedAction}>
                      <input type="hidden" name="id" value={doc.id} />
                      <input
                        type="hidden"
                        name="verified"
                        value={doc.verificationStatus === "VERIFIED" ? "false" : "true"}
                      />
                      <button type="submit" className="text-brand-700 hover:underline">
                        {doc.verificationStatus === "VERIFIED" ? "Unverify" : "Verify"}
                      </button>
                    </form>
                    <form action={runExtractionAction}>
                      <input type="hidden" name="id" value={doc.id} />
                      <button type="submit" className="text-brand-700 hover:underline">
                        Run extraction
                      </button>
                    </form>
                    <form action={deleteDocumentAction}>
                      <input type="hidden" name="id" value={doc.id} />
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/documents" />
    </div>
  );
}
