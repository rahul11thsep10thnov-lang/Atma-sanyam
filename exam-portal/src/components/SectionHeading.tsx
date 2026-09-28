export function SectionHeading({
  id,
  title,
  subtitle,
}: {
  id?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
