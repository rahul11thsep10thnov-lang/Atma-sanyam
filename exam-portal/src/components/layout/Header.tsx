import Link from "next/link";
import { RahulHeading } from "@/components/brand/RahulHeading";
import { AccountMenu } from "@/components/account/AccountMenu";
import { FelicitationBoard } from "@/components/felicitation/FelicitationBoard";
import { getCurrentUser, isMember } from "@/lib/users/session";
import { maskMobile } from "@/lib/phone";
import { getBoardState } from "@/lib/felicitation/service";
import { MEMBERSHIP_PRICE_RUPEES } from "@/lib/payments/service";

/** Full-width header: Felicitation Board (left), the stacked Rahul
 * Heading wordmark with the hero tagline (centre, 1.5× the old 26px size → 39px), and the
 * account controls (right). On phones the wordmark comes first and the
 * board becomes a compact card under it. */
export async function Header() {
  const [user, board] = await Promise.all([getCurrentUser(), getBoardState()]);
  const publicUser = user ? { id: user.id, mobileMasked: maskMobile(user.mobile), fullName: user.fullName, profileComplete: !!user.profileCompletedAt, member: isMember(user), membershipUntil: user.membershipUntil?.toISOString() ?? null } : null;
  return (
    <header className="relative w-full overflow-x-clip border-b border-orange-200/70 bg-white/55 backdrop-blur-[2px]">
      <div className="grid w-full grid-cols-1 items-start gap-4 px-4 py-4 sm:px-8 lg:grid-cols-[26rem_1fr_16rem] lg:px-12">
        <div className="order-3 lg:order-1">{board.enabled ? <FelicitationBoard initial={board} /> : null}</div>
        <div className="order-1 flex flex-col items-center gap-2 lg:order-2 lg:pt-2">
          <Link href="/" aria-label="Naukri Chayan — home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-[#e0823f]">
            <RahulHeading lines={["Naukri", "Chayan"]} size={39} />
          </Link>
          <p lang="hi" className="hero-tagline text-center">|| अंततः आपकी तपस्या ही आपका वरदान होगी  ||</p>
        </div>
        <div className="order-2 flex items-center justify-center gap-2 lg:order-3 lg:justify-end lg:pt-3">
          <AccountMenu initialUser={publicUser} membershipPrice={MEMBERSHIP_PRICE_RUPEES} />
        </div>
      </div>
    </header>
  );
}
