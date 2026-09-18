import { AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

export default function DisclaimerBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
