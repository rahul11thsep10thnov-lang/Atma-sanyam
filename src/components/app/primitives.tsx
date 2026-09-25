import { createElement } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  MapPinned,
  Globe2,
  Brain,
  Calculator,
  Languages,
  BookOpen,
  FlaskConical,
  Landmark,
  Scale,
  Monitor,
  Newspaper,
  ShieldCheck,
  Mountain,
  ScrollText,
} from "lucide-react";
import { Accent, getSubjectAccent, tileStyle } from "@/lib/accentColors";
import { cn } from "@/lib/utils";

const SUBJECT_ICON: Record<string, LucideIcon> = {
  "state-gk": MapPinned,
  gk: Globe2,
  reasoning: Brain,
  maths: Calculator,
  hindi: Languages,
  english: BookOpen,
  science: FlaskConical,
  history: ScrollText,
  geography: Mountain,
  polity: Landmark,
  constitution: Scale,
  computer: Monitor,
  "current-affairs": Newspaper,
  "police-law": ShieldCheck,
};

export function SubjectIcon({ subject, size = 17 }: { subject: string; size?: number }) {
  return createElement(SUBJECT_ICON[subject] ?? BookOpen, { size });
}

/** Pastel subject tile: icon box + title + subtitle (the 2×2 "Quant / Reasoning" grid). */
export function SubjectTile({
  href,
  subject,
  title,
  subtitle,
  accent,
  badge,
}: {
  href: string;
  subject: string;
  title: string;
  subtitle?: string;
  accent?: Accent;
  badge?: string;
}) {
  const a = accent ?? getSubjectAccent(subject);
  return (
    <Link href={href} className="tile min-w-0" style={tileStyle(a)}>
      <span className="tile-icon">
        <SubjectIcon subject={subject} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark break-words line-clamp-2">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[13px] leading-snug text-slate-500 line-clamp-2">{subtitle}</span>}
      </span>
      {badge && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold tracking-wider"
          style={{ background: a.tileBorder, color: a.tileText }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

const BAR_VARIANTS = {
  orange: { bg: "linear-gradient(90deg,#ff6a00,#ff8b3d)", shadow: "rgba(255,106,0,.7)", pill: "#ff6a13" },
  green: { bg: "linear-gradient(90deg,#0fa35e,#16b86c)", shadow: "rgba(16,167,96,.6)", pill: "#0b8a4e" },
  purple: { bg: "linear-gradient(90deg,#5b5bf0,#8b5cf6)", shadow: "rgba(99,91,240,.6)", pill: "#5b3fd1" },
  dark: { bg: "linear-gradient(90deg,#1c2333,#2b3448)", shadow: "rgba(28,35,51,.6)", pill: "#1c2333" },
} as const;

/** Full-width gradient action bar with a white "Start ›" pill. */
export function CtaBar({
  href,
  label,
  icon: Icon,
  variant = "orange",
  pill = "Start",
  className,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: keyof typeof BAR_VARIANTS;
  pill?: string;
  className?: string;
}) {
  const v = BAR_VARIANTS[variant];
  return (
    <Link
      href={href}
      className={cn("cta-bar", className)}
      style={{
        ["--bar-bg" as string]: v.bg,
        ["--bar-shadow" as string]: v.shadow,
        ["--bar-pill-text" as string]: v.pill,
      }}
    >
      {Icon && (
        <span className="cta-bar-icon">
          <Icon size={19} />
        </span>
      )}
      <span className="min-w-0 text-[16px] leading-snug">{label}</span>
      <span className="cta-bar-pill">{pill} ›</span>
    </Link>
  );
}

/** Section heading with the orange left bar and an optional count pill. */
export function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="section-bar font-display text-lg font-semibold leading-snug text-brand-dark">{title}</h2>
      {count && (
        <span className="shrink-0 rounded-full bg-white px-3 py-1 font-display text-sm font-medium text-slate-500 border border-[var(--card-border)]">
          {count}
        </span>
      )}
    </div>
  );
}

/** Small rounded status/label pill. */
export function Pill({
  children,
  color = "#0b8a4e",
  bg = "#e8f8ef",
  className,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 font-display text-[13px] font-semibold", className)}
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}
