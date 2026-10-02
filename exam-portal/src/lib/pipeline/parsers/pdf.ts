import path from "node:path";

export interface PdfText {
  text: string;
  pageCount: number;
  pages: string[];
}

/** Separator between pages in `text`, so a later field provenance can
 * recover `sourcePage` by counting form-feeds before the match. */
export const PAGE_BREAK = "\f";

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsPromise;
}

/** Text of every page via pdf.js (pure JS, no native deps). */
export async function extractPdfText(buffer: Buffer): Promise<PdfText> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl: path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + path.sep,
  } as never);
  const doc = await task.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      } else if (item.str && !item.str.endsWith(" ")) {
        line += " ";
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n").replace(/[ \t]+/g, " ").trim());
  }
  const pageCount = doc.numPages;
  await task.destroy();
  return { text: pages.join(PAGE_BREAK), pageCount, pages };
}

/** A "text" PDF with almost no text per page is a scan → OCR candidate. */
export function looksScanned(result: PdfText, minCharsPerPage = 40): boolean {
  if (result.pageCount === 0) return false;
  return result.text.replace(/\s/g, "").length / result.pageCount < minCharsPerPage;
}
