export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6">
        <p className="font-medium text-slate-700">Exam Portal</p>
        <p className="max-w-2xl">
          An independent, unofficial information portal for Indian
          government examinations, jobs, results, admit cards, and answer
          keys. Always verify details against the official notification
          and the organization&apos;s own website before applying.
        </p>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Exam Portal. Not affiliated with any
          government body.
        </p>
      </div>
    </footer>
  );
}
