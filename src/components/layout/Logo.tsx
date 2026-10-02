import Image from "next/image";
import { cn } from "@/lib/utils";
import SiteQuote from "@/components/layout/SiteQuote";

/** Logo mark + "PoliceExams" wordmark, with the admin-editable quotation
 * directly under the name (hidden in the small/footer variants). */
export default function Logo({
  inverted = false,
  small = false,
  withQuote = false,
}: {
  inverted?: boolean;
  small?: boolean;
  withQuote?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/brand/logo-256.png"
        alt=""
        width={small ? 36 : 52}
        height={small ? 29 : 42}
        priority={!small}
        className={cn("shrink-0 object-contain", small ? "h-9 w-9" : "h-[52px] w-[52px]")}
      />
      <span className="flex min-w-0 flex-col">
        <span className={cn("brand-wordmark whitespace-nowrap", small ? "text-[1.25rem]" : "text-[1.7rem] sm:text-[2.05rem]")}>
          <span className={inverted ? "text-white" : "text-brand-dark"}>Police</span>
          <span className="heading-grad brand-wordmark">Exams</span>
        </span>
        {withQuote && <SiteQuote />}
      </span>
    </span>
  );
}
