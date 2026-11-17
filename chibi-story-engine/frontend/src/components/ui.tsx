import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    ghost: "bg-white text-ink border border-line hover:bg-paper",
    danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  }[variant];
  return <button {...props} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`} />;
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-4 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  rendered: "bg-green-100 text-green-800",
  cached: "bg-green-100 text-green-800",
  published: "bg-green-100 text-green-800",
  pass: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  queued: "bg-amber-100 text-amber-800",
  warning: "bg-amber-100 text-amber-800",
  interrupted: "bg-amber-100 text-amber-800",
  running: "bg-sky-100 text-sky-800",
  rendering: "bg-sky-100 text-sky-800",
  info: "bg-sky-100 text-sky-800",
  rejected: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  error: "bg-red-100 text-red-800",
  cancelled: "bg-stone-200 text-stone-700",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const key = tone ?? (typeof children === "string" ? children : "");
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[key] ?? "bg-stone-100 text-stone-700"}`}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-stone-500">{children}</p>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-leaf transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function seconds(value: number): string {
  const m = Math.floor(value / 60);
  const s = value - m * 60;
  return m ? `${m} min ${s.toFixed(0)} s` : `${s.toFixed(1)} s`;
}
