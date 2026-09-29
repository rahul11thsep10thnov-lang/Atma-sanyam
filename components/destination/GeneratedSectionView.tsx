import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ImageAsset } from "@/lib/types";
import type { Cell, GeneratedSection } from "@/lib/master/generation/types";
import { formatDate } from "@/lib/master/generation/format";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

const PARAGRAPH_STYLE: Record<string, string> = {
  fact: "text-charcoal",
  tradition: "border-l-4 border-saffron-400 bg-saffron-50/70 pl-4 pr-3 py-2 italic text-charcoal",
  history: "border-l-4 border-forest-300 pl-4 text-charcoal",
  estimate: "rounded-lg bg-forest-50 px-3 py-2 text-charcoal",
  note: "text-charcoal-light"
};

export function sectionTitle(section: GeneratedSection, name: string, dict: Dictionary): string {
  const titles = dict.destination.sectionTitles as Record<string, string>;
  return (titles[section.id] ?? section.title).replace("{name}", name);
}

function CellView({ cell, locale }: { cell: Cell; locale: string }) {
  if (typeof cell === "string") return <>{cell}</>;
  return (
    <Link href={`/${locale}${cell.href}`} className="font-medium text-forest-600 hover:underline">
      {cell.text}
    </Link>
  );
}

/**
 * Renders one generated section (spec section 38 template). Everything shown here came
 * from stored records via the writer — this component only draws it, and always shows
 * the section's verification state, notices and what has not been collected.
 */
export function GeneratedSectionView({
  section, name, locale, dict, images, tone = "plain", children
}: {
  section: GeneratedSection;
  name: string;
  locale: string;
  dict: Dictionary;
  images: ImageAsset[];
  tone?: "plain" | "tinted";
  children?: ReactNode;
}) {
  const { ui } = dict.common;
  const last = formatDate(section.last_verified);

  return (
    <WatermarkSection images={images} id={section.id} className={`border-b border-forest-100/70 py-9 ${tone === "tinted" ? "bg-forest-50/50" : ""}`}>
      <div className="container-page">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="section-heading">{sectionTitle(section, name, dict)}</h2>
          <VerificationBadge status={section.verification.status} ui={ui} />
        </div>

        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed sm:text-base">
          {section.paragraphs.map((p, i) => (
            <p key={i} className={PARAGRAPH_STYLE[p.kind]}>
              {p.label && <span className="mr-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold not-italic text-saffron-700">{p.label}</span>}
              {p.text}
            </p>
          ))}
        </div>

        {section.bullets.length > 0 && (
          <ul className="mt-4 max-w-3xl list-disc space-y-1.5 pl-5 text-sm text-charcoal-light sm:text-base">
            {section.bullets.map((b, i) => (
              <li key={i}>
                <CellView cell={b} locale={locale} />
              </li>
            ))}
          </ul>
        )}

        {section.table && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-forest-100 bg-white/90">
            <table className="min-w-full divide-y divide-forest-100 text-left text-sm">
              <thead className="bg-forest-50 text-xs uppercase tracking-wide text-forest-700">
                <tr>
                  {section.table.headers.map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {section.table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className={`px-3 py-2 align-top ${c === 0 ? "font-medium text-charcoal" : "text-charcoal-light"}`}>
                        <CellView cell={cell} locale={locale} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {children}

        {section.notices.length > 0 && (
          <ul className="mt-4 max-w-3xl space-y-1 text-xs text-terracotta-700">
            {section.notices.map((n) => (
              <li key={n}>⚠ {n}</li>
            ))}
          </ul>
        )}

        {section.missing.length > 0 && (
          <div className="mt-4 max-w-3xl rounded-lg border border-dashed border-charcoal/25 bg-white/70 px-3 py-2 text-xs text-charcoal-light">
            <strong className="font-semibold text-charcoal">{ui.notYetCollected}:</strong> {section.missing.join(" ")}
          </div>
        )}

        <p className="mt-3 text-[11px] text-charcoal-light/80">
          {last ? `${ui.lastVerified}: ${last}` : ui.neverVerified}
        </p>
      </div>
    </WatermarkSection>
  );
}
