/** Decorative flourish (double rule with curled ends and a leaf fan in
 * the middle), drawn in the Rahul Heading brown. */
function Flourish({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 320 28" className={className} style={flip ? { transform: "scaleY(-1)" } : undefined} aria-hidden="true" focusable="false">
      <g fill="none" stroke="#6b3412" strokeLinecap="round">
        <path d="M18 16 H122 M18 21 H118" strokeWidth="2" />
        <path d="M198 16 H302 M202 21 H302" strokeWidth="2" />
        <path d="M18 16 c-8 0 -12 -8 -6 -11 c4 -2 7 2 5 4" strokeWidth="2" />
        <path d="M302 16 c8 0 12 -8 6 -11 c-4 -2 -7 2 -5 4" strokeWidth="2" />
        <path d="M126 20 c10 -2 18 -10 30 -12 M194 20 c-10 -2 -18 -10 -30 -12" strokeWidth="2" />
      </g>
      <g fill="#6b3412">
        <path d="M160 3 c-4 5 -4 10 0 14 c4 -4 4 -9 0 -14z" />
        <path d="M150 7 c-1 6 2 10 9 11 c-1 -6 -4 -10 -9 -11z" />
        <path d="M170 7 c1 6 -2 10 -9 11 c1 -6 4 -10 9 -11z" />
        <circle cx="160" cy="21" r="3.2" fill="#c88b5c" stroke="#6b3412" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** "Rahul Heading": stacked marquee lettering with ornaments. */
export function RahulHeading({ lines, size = 39, ornaments = true, className = "" }: { lines: string[]; size?: number; ornaments?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      {ornaments ? <Flourish className="w-[85%] max-w-[260px]" /> : null}
      <span className="flex flex-col items-center">
        {lines.map((l) => (
          <span key={l} className="rahul-heading block" style={{ fontSize: `${size}px` }}>
            {l}
          </span>
        ))}
      </span>
      {ornaments ? <Flourish flip className="w-[85%] max-w-[260px]" /> : null}
    </span>
  );
}
