/**
 * Markdown-lite for CMS text fields: blank-line paragraphs, "- " bullet
 * lists, **bold** and *italic*. Deliberately tiny — no raw HTML is ever
 * accepted from the editor, so nothing here needs sanitising beyond escaping.
 */

export type Block = { type: "p"; text: string } | { type: "ul"; items: string[] };

export function parseBlocks(text: string | null | undefined): Block[] {
  if (!text) return [];
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => /^[-*•]\s+/.test(l))) blocks.push({ type: "ul", items: lines.map((l) => l.replace(/^[-*•]\s+/, "")) });
    else {
      // A paragraph followed by bullet lines in the same chunk.
      const para = lines.filter((l) => !/^[-*•]\s+/.test(l));
      const items = lines.filter((l) => /^[-*•]\s+/.test(l)).map((l) => l.replace(/^[-*•]\s+/, ""));
      if (para.length) blocks.push({ type: "p", text: para.join(" ") });
      if (items.length) blocks.push({ type: "ul", items });
    }
  }
  return blocks;
}

export type Inline = { kind: "text" | "bold" | "italic"; text: string };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[2]) out.push({ kind: "bold", text: m[2] });
    else if (m[3]) out.push({ kind: "italic", text: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export const plainText = (text: string | null | undefined) => (text ?? "").replace(/\*\*?/g, "").replace(/^[-*•]\s+/gm, "").replace(/\s+/g, " ").trim();
