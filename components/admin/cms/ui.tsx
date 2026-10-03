"use client";

import Link from "next/link";
import { placeholderSvgDataUrl } from "@/lib/data/placeholder";
import type { CmsImage, PipelineStage, PublicationStatus } from "@/lib/cms/types";

/** Shared styling and tiny helpers for the CMS admin screens (client-safe). */

export { field, label, btn, btnPrimary, btnSecondary, btnDanger, btnSaffron, fmtDate } from "./shared";

export const STATUS_TONE: Record<PublicationStatus, string> = {
  PUBLISHED: "bg-forest-100 text-forest-700",
  DRAFT: "bg-saffron-100 text-saffron-700",
  IN_REVIEW: "bg-sky-100 text-sky-700",
  ARCHIVED: "bg-charcoal/10 text-charcoal"
};

export const STAGE_TONE: Partial<Record<PipelineStage, string>> = {
  COMPLETED: "bg-forest-100 text-forest-700",
  FAILED: "bg-terracotta-100 text-terracotta-700",
  SKIPPED: "bg-charcoal/10 text-charcoal",
  AWAITING_APPROVAL: "bg-saffron-100 text-saffron-700",
  READY_TO_PUBLISH: "bg-saffron-100 text-saffron-700",
  QUEUED: "bg-charcoal/5 text-charcoal-light"
};

export function Badge({ children, tone = "bg-forest-50 text-forest-700" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: PublicationStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status.replace("_", " ")}</Badge>;
}

export function StageBadge({ stage }: { stage: PipelineStage }) {
  if (stage === "NOT_IN_PIPELINE") return <span className="text-xs text-charcoal-light">—</span>;
  return <Badge tone={STAGE_TONE[stage] ?? "bg-sky-100 text-sky-700"}>{stage.replace(/_/g, " ")}</Badge>;
}

/** URL to show for a stored image in the admin (thumbnail → local file → source → generated placeholder). */
export function thumbUrl(img: CmsImage | null | undefined, w = 480, h = 320): string {
  if (!img) return placeholderSvgDataUrl("No image", w, h);
  if (img.url.startsWith("placeholder://")) {
    const l = decodeURIComponent(img.url.replace("placeholder://", "").split("?")[0]);
    return placeholderSvgDataUrl(l || "Placeholder", w, h);
  }
  return img.thumbnail_url ?? img.local_path ?? img.url;
}

export const isPlaceholderUrl = (url: string) => url.startsWith("placeholder://");

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const cls = { info: "border-sky-200 bg-sky-50 text-sky-900", warn: "border-saffron-200 bg-saffron-50 text-saffron-800", error: "border-terracotta-200 bg-terracotta-50 text-terracotta-800", ok: "border-forest-200 bg-forest-50 text-forest-800" }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal">{title}</h1>
        {intro && <p className="mt-1 max-w-3xl text-sm text-charcoal-light">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Admin breadcrumb" className="mb-3 text-xs text-charcoal-light">
      {items.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5">/</span>}
          {c.href ? <Link href={c.href} className="hover:text-forest-700">{c.label}</Link> : <span className="text-charcoal">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
export const num = (s: string): number | null => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : null);
export const tri = (v: boolean | null) => (v === null ? "" : v ? "yes" : "no");
export const fromTri = (s: string): boolean | null => (s === "yes" ? true : s === "no" ? false : null);
