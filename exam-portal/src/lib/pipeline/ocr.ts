/**
 * OCR for image notices (PNG/JPG/WebP/TIFF) — many boards post scanned
 * notices as images. Backed by tesseract.js (pure WASM, no native deps);
 * the engine is an interface so tests inject a fake and deployments can
 * swap in a hosted OCR service.
 *
 * Scanned *PDFs* additionally need rasterising page-by-page before OCR,
 * which needs a canvas implementation this project does not ship. They
 * are therefore recorded as an OCR-type PipelineError ("needs
 * rasteriser") rather than silently treated as empty — see
 * pipeline/ingest.ts.
 *
 * Enabled only when OCR_ENABLED=true: tesseract downloads ~15 MB of
 * language data on first use, which must be a deliberate choice.
 */
export interface OcrEngine {
  readonly name: string;
  recognize(image: Buffer): Promise<string>;
}

class TesseractEngine implements OcrEngine {
  readonly name = "tesseract.js";
  private workerPromise: Promise<import("tesseract.js").Worker> | null = null;

  private worker() {
    this.workerPromise ??= import("tesseract.js").then((t) => t.createWorker(["eng", "hin"]));
    return this.workerPromise;
  }

  async recognize(image: Buffer): Promise<string> {
    const worker = await this.worker();
    const { data } = await worker.recognize(image);
    return data.text;
  }
}

let engine: OcrEngine | null | undefined;

export function getOcrEngine(): OcrEngine | null {
  if (engine !== undefined) return engine;
  engine = process.env.OCR_ENABLED === "true" ? new TesseractEngine() : null;
  return engine;
}

/** Test/deployment hook to replace the engine. */
export function setOcrEngine(custom: OcrEngine | null) {
  engine = custom;
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && /^image\/(png|jpe?g|webp|tiff|bmp)/i.test(mime);
}
