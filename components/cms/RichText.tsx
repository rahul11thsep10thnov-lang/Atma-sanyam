import { parseBlocks, parseInline } from "@/lib/cms/markdown";

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.kind === "bold" ? <strong key={i} className="font-semibold text-charcoal">{part.text}</strong> : part.kind === "italic" ? <em key={i}>{part.text}</em> : <span key={i}>{part.text}</span>
      )}
    </>
  );
}

/** Renders a CMS markdown-lite field as paragraphs and lists. */
export function RichText({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className={`space-y-3 text-sm leading-relaxed text-charcoal sm:text-base ${className}`}>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}><InlineText text={b.text} /></p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5">
            {b.items.map((it, k) => (
              <li key={k}><InlineText text={it} /></li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
