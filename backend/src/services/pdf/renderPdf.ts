// Runs the PDF renderer in a worker thread (pdfkit is synchronous: a 500-
// question paper takes ~5 s of CPU). One render at a time, with a timeout.
import { Worker } from 'node:worker_threads';
import { HttpError } from '../../lib/httpError.js';
import type { PaperTest, RenderOptions } from './paperPdf.js';

const TIMEOUT_MS = 120_000;
// In development and tests the sources are TypeScript (run through tsx).
const fromSource = import.meta.url.endsWith('.ts');
const WORKER_URL = new URL(`./renderWorker.${fromSource ? 'ts' : 'js'}`, import.meta.url);

let queue: Promise<unknown> = Promise.resolve();

function runWorker(test: PaperTest, opts: RenderOptions): Promise<{ data: Buffer; pages: number }> {
  return new Promise((resolve, reject) => {
    const worker = fromSource
      ? // Register tsx inside the worker so the .ts sources (and their .js import specifiers) load.
        new Worker(
          `(async () => { (await import(${JSON.stringify(import.meta.resolve('tsx/esm/api'))})).register(); await import(${JSON.stringify(WORKER_URL.href)}); })();`,
          { eval: true, workerData: { test, opts } }
        )
      : new Worker(WORKER_URL, { workerData: { test, opts }, execArgv: [] });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new HttpError(503, 'Making the PDF took too long. Try a smaller test or again later.', 'pdf_timeout'));
    }, TIMEOUT_MS);
    worker.once('message', (m: { ok: true; data: Uint8Array; pages: number } | { ok: false; message: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (m.ok) resolve({ data: Buffer.from(m.data.buffer, m.data.byteOffset, m.data.byteLength), pages: m.pages });
      else reject(new Error(`PDF rendering failed: ${m.message}`));
    });
    worker.once('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`PDF worker exited with code ${code}`));
    });
  });
}

/** Renders off the main thread; requests queue so only one PDF uses a CPU core at a time. */
export function renderPaperPdfInWorker(test: PaperTest, opts: RenderOptions): Promise<{ data: Buffer; pages: number }> {
  const job = queue.then(() => runWorker(test, opts));
  queue = job.catch(() => undefined);
  return job;
}
