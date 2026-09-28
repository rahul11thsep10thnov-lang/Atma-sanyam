import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium tracking-wide text-brand-700 uppercase">
        404
      </p>
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist, or hasn&apos;t
        been published yet.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Back to homepage
      </Link>
    </main>
  );
}
