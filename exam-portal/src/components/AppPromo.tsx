import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

/** "Get our app" block. Screenshot: drop public/app-preview.png (or .webp
 * / .jpg). Link: NEXT_PUBLIC_APP_DOWNLOAD_URL (Play Store URL). */
function previewSrc(): string | null {
  for (const f of ["app-preview.webp", "app-preview.png", "app-preview.jpg"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return `/${f}`;
  }
  return null;
}

export function AppPromo() {
  const url = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;
  const src = previewSrc();
  return (
    <section aria-labelledby="app-promo" className="flex w-full flex-col items-center gap-6 rounded-2xl border border-orange-200 bg-white/85 p-6 sm:flex-row sm:p-8">
      <div className="relative h-72 w-40 shrink-0 overflow-hidden rounded-[1.75rem] border-[6px] border-slate-800 bg-gradient-to-b from-orange-50 to-orange-100 shadow-xl">
        {src ? (
          <Image src={src} alt="SarkariChayan app screenshot" fill sizes="160px" className="object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="rahul-tab-text text-sm leading-tight">Sarkari<br />Chayan</span>
            <span className="h-2 w-24 rounded bg-orange-200" />
            <span className="h-2 w-20 rounded bg-orange-200" />
            <span className="h-2 w-24 rounded bg-orange-200" />
            <span className="mt-2 rounded-md bg-[#f6b483] px-2 py-1 text-[10px] font-bold text-[#4a220a]">JOBS</span>
            <span className="rounded-md bg-[#f6b483] px-2 py-1 text-[10px] font-bold text-[#4a220a]">RESULTS</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <h2 id="app-promo" className="text-2xl font-semibold">Get the SarkariChayan app</h2>
        <p className="text-sm text-slate-600">Every new job, admit card, answer key and result on your phone — with instant alerts.</p>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 self-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:self-start">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M3.6 1.8 13.4 12l-9.8 10.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Zm11 11.4 2.6 2.6-11.5 6.6 8.9-9.2Zm3.6-3.7 3 1.7c.8.5.8 1.6 0 2.1l-3 1.7-2.8-2.8 2.8-2.7ZM5.7 1.6l11.5 6.6-2.6 2.6-8.9-9.2Z" /></svg>
            Download the app
          </a>
        ) : (
          <span className="inline-flex w-fit self-center rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 sm:self-start">App coming soon</span>
        )}
      </div>
    </section>
  );
}
