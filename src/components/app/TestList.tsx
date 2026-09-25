import Link from "next/link";
import { ChevronUp, Play, FileText, Clock } from "lucide-react";
import AttemptBadge from "@/components/app/AttemptBadge";

export interface TestRow {
  id: string;
  href: string;
  title: string;
  chip: string;
  sub?: string;
  questions: number;
  minutes?: number;
  marks?: number;
}

export interface TestGroup {
  key: string;
  badge: string;
  title: string;
  rows: TestRow[];
}

/** Collapsible group card ("2025 · SSC CGL Tier I 2025 · 44 tests ▴") with shift-style rows. */
export function TestGroupCard({ group, defaultOpen }: { group: TestGroup; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#ff8b3d] font-display text-base font-bold text-white">
          {group.badge}
        </span>
        <span className="min-w-0 flex-1 font-display text-[1.2rem] font-semibold leading-snug text-brand-dark">
          {group.title}
        </span>
        <span className="hidden shrink-0 rounded-full bg-[#eef1f6] px-3 py-1.5 font-display text-sm font-medium text-slate-600 sm:inline">
          {group.rows.length} tests
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange-light text-brand-orange transition-transform group-open:rotate-0 rotate-180">
          <ChevronUp size={18} strokeWidth={3} />
        </span>
      </summary>
      <div className="border-t border-[var(--card-border)]">
        {group.rows.map((r) => (
          <TestRowItem key={r.id} row={r} />
        ))}
      </div>
    </details>
  );
}

export function TestRowItem({ row }: { row: TestRow }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--card-border)] border-l-4 border-l-brand-orange px-4 py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[1.1rem] font-semibold text-brand-dark">{row.title}</span>
          <span className="rounded-lg bg-[#eef1f6] px-2 py-0.5 font-display text-xs font-bold text-slate-600">{row.chip}</span>
        </div>
        {row.sub && <p className="mt-1 text-[15px] text-slate-600">{row.sub}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FileText size={14} /> {row.questions} Qs
          </span>
          {row.minutes !== undefined && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} /> {row.minutes} min
              </span>
            </>
          )}
          {row.marks !== undefined && (
            <>
              <span>·</span>
              <span>{row.marks} marks</span>
            </>
          )}
        </p>
        <div className="mt-2.5">
          <AttemptBadge testId={row.id} />
        </div>
      </div>
      <Link href={row.href} className="btn-cta inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-[16px]">
        <Play size={15} fill="currentColor" /> Attempt Test
      </Link>
    </div>
  );
}

/** Big two-option toggle ("🎯 Tier I | 📊 Tier II"). Uses links so it works without JS. */
export function ExamToggle({ options }: { options: { href: string; label: string; active: boolean; icon: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "page" : undefined}
          className={
            o.active
              ? "btn-cta flex items-center justify-center gap-2 py-3.5 text-[17px]"
              : "flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--card-border)] bg-white py-3.5 font-display text-[17px] font-semibold text-slate-600"
          }
        >
          {o.icon}
          {o.label}
        </Link>
      ))}
    </div>
  );
}

/** Breadcrumb strip under the page title. */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-y border-[var(--card-border)] bg-white">
      <ol className="container-page max-w-3xl flex flex-wrap items-center gap-2 py-3 font-display text-[15px] font-medium">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-400">›</span>}
            {it.href ? (
              <Link href={it.href} className="text-brand-orange">
                {it.label}
              </Link>
            ) : (
              <span className="text-slate-700">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Dark gradient page hero with icon tile + glass chips. */
export function DarkHero({
  icon,
  title,
  meta,
  chips,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  chips: { icon: React.ReactNode; label: string }[];
}) {
  return (
    <div className="hero-dark p-5 sm:p-7">
      <div className="relative z-10 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#ff9a4d] shadow-lg shadow-orange-900/30">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.6rem] font-bold leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-1 text-[15px] text-slate-300">{meta}</p>
        </div>
      </div>
      <div className="relative z-10 mt-5 flex flex-wrap gap-2.5">
        {chips.map((c) => (
          <span key={c.label} className="glass-chip">
            {c.icon}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal filter chip (state picker). */
export function StateChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "shrink-0 rounded-full border border-brand-orange bg-brand-orange px-3.5 py-1.5 font-display text-sm font-semibold text-white"
          : "shrink-0 rounded-full border border-[var(--card-border)] bg-white px-3.5 py-1.5 font-display text-sm font-semibold text-slate-600"
      }
    >
      {label}
    </Link>
  );
}
