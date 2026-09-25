import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logo({ inverted = false, small = false }: { inverted?: boolean; small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex items-center justify-center rounded-full text-white",
          small ? "h-8 w-8" : "h-10 w-10"
        )}
        style={{
          background: "radial-gradient(circle at 35% 30%, #ffb070, #ff6a00 70%)",
          boxShadow: "0 4px 14px -4px rgba(255,106,0,0.6)",
        }}
      >
        <Shield size={small ? 16 : 20} strokeWidth={2.4} fill="rgba(255,255,255,0.25)" />
      </span>
      <span className={cn("font-display font-extrabold tracking-tight", small ? "text-lg" : "text-[1.55rem]")}>
        <span className={inverted ? "text-white" : "text-brand-dark"}>Police</span>
        <span className="text-brand-orange">Exams</span>
      </span>
    </span>
  );
}
