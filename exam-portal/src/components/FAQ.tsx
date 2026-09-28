import type { FaqItem } from "@/lib/faq";

/** Native `<details>`/`<summary>` accordion — no client JS needed
 * (Section 25). Only rendered by callers when `items.length > 0`. */
export function FAQ({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-900 marker:content-none">
            {item.question}
          </summary>
          <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
