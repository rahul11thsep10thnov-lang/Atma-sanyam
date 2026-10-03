import type { ImageCredit } from "@/lib/cms/images";

const A = ({ href, children }: { href: string | null; children: React.ReactNode }) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">{children}</a> : <>{children}</>;

/** Photo credit with links to the photographer, licence and source page (Unsplash: "Photo by X on Unsplash"). */
export function Credit({ credit, label }: { credit: ImageCredit; label?: string }) {
  if (credit.style === "unsplash")
    return <span>Photo by <A href={credit.who_url}>{credit.who}</A> on <A href={credit.source_url}>Unsplash</A></span>;
  const parts: React.ReactNode[] = [];
  if (credit.who) parts.push(<A key="w" href={credit.who_url}>{credit.who}</A>);
  if (credit.license) parts.push(<A key="l" href={credit.license_url}>{credit.license}</A>);
  if (credit.source) parts.push(<A key="s" href={credit.source_url}>{credit.source}</A>);
  return (
    <span>
      {label ? `${label}: ` : ""}
      {parts.map((p, i) => <span key={i}>{i > 0 && " · "}{p}</span>)}
    </span>
  );
}
