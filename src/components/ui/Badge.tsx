import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Tone = "navy" | "gold" | "green" | "red" | "gray";

const TONE_CLASSES: Record<Tone, string> = {
  navy: "bg-blue-50 text-brand-navy border-blue-100",
  gold: "bg-brand-gold-light text-[#8a5a00] border-amber-200",
  green: "bg-green-50 text-brand-green border-green-100",
  red: "bg-red-50 text-brand-red border-red-100",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
