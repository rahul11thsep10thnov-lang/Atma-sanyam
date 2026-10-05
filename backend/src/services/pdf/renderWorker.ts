// Worker-thread entry: renders one PDF off the API's main thread, so a long
// paper never stalls requests from candidates taking tests.
import { parentPort, workerData } from 'node:worker_threads';
import { renderPaperPdf, type PaperTest, type RenderOptions } from './paperPdf.js';

const { test, opts } = workerData as { test: PaperTest; opts: RenderOptions };
renderPaperPdf(test, opts).then(
  (r) => parentPort!.postMessage({ ok: true, data: r.data, pages: r.pages }),
  (e: unknown) => parentPort!.postMessage({ ok: false, message: e instanceof Error ? e.message : String(e) })
);
