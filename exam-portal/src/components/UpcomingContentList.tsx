/**
 * Like `RelatedContent`, but for a content type whose detail page hasn't
 * shipped yet (Result/AdmitCard/AnswerKey/Syllabus are Phases 6–9) — a
 * published row exists in the database, but linking to `/results/[slug]`
 * etc. today would be a dead link from our own UI. Swap the caller over
 * to `RelatedContent` once that phase adds the real page.
 */
export function UpcomingContentList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.title} className="text-sm text-slate-600">
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
