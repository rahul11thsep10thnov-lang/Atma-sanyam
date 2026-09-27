import Link from "next/link";
import { RefreshCw } from "lucide-react";

/** Full-screen loading / error / empty states for the live test pages. */
export function LiveState({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="exam-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {busy && <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange-light border-t-brand-orange" aria-hidden />}
      <p className="max-w-sm font-display text-[17px] text-slate-700" role={busy ? "status" : "alert"}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-cta inline-flex items-center gap-2 px-5 py-3 text-[16px]">
          <RefreshCw size={17} /> Try again
        </button>
      )}
      {!busy && (
        <Link href="/mock-test" className="font-display text-[15px] font-semibold text-slate-500 underline">
          Sabhi Mock Tests
        </Link>
      )}
    </div>
  );
}
