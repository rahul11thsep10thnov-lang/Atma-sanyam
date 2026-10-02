"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { ENROLL_EVENT, getEntitlement } from "@/lib/enroll";
import { isLoggedIn } from "@/lib/session";
import { useSiteSettings } from "@/lib/site";

const SEEN_KEY = "pe_enroll_popup_seen";

/**
 * Hindi welcome popup: shown once per browser session on the first page
 * open (`auto`), and again whenever a paid test is attempted
 * (`openEnrollPopup`). "हमसे जुड़िये" goes to login first when needed, then
 * to the enrolment (payment) page.
 */
export default function EnrollPopup({ auto }: { auto: boolean }) {
  const site = useSiteSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  // Manual opens (quota exhausted) from anywhere on the site.
  useEffect(() => {
    function onOpen(e: Event) {
      setReason((e as CustomEvent<{ reason?: string }>).detail?.reason ?? null);
      setOpen(true);
    }
    window.addEventListener(ENROLL_EVENT, onOpen);
    return () => window.removeEventListener(ENROLL_EVENT, onOpen);
  }, []);

  // First page open of the session.
  useEffect(() => {
    if (!auto || !site.popup.enabled) return;
    if (pathname === "/enroll" || pathname.startsWith("/login") || pathname.startsWith("/admin")) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // ignore
    }
    if (seen) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const e = await getEntitlement().catch(() => null);
      if (cancelled) return;
      if (e?.subscribed) {
        setSubscribed(true);
        return;
      }
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
      setReason(null);
      setOpen(true);
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Run once per mount on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, site.popup.enabled]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function join() {
    setOpen(false);
    const logged = await isLoggedIn();
    router.push(logged ? "/enroll" : `/login?next=${encodeURIComponent("/enroll")}`);
  }

  if (!open || subscribed) return null;
  const { plan, popup } = site;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="enroll-title">
      <button aria-label="Close" onClick={close} className="absolute inset-0 h-full w-full cursor-default" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#e8fbf1] via-white to-[#ffece9] px-5 pt-6 pb-4">
          <button onClick={close} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white">
            <X size={18} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe9d2] bg-white px-3 py-1 font-display text-[12px] font-bold uppercase tracking-wider text-[#0b8a4e]">
            <Sparkles size={13} /> {plan.name}
          </span>
          <h2 id="enroll-title" lang="hi" className="brand-quote mt-3 text-[1.6rem] leading-tight">
            {popup.title}
          </h2>
        </div>
        <div className="px-5 py-4">
          <p lang="hi" className="text-[1.05rem] leading-relaxed text-slate-700">
            {popup.body}
          </p>
          {reason && <p className="mt-3 rounded-xl bg-[#fff4ea] px-3 py-2 text-[14px] font-medium text-[#9a3412]">{reason}</p>}

          <div className="mt-4 flex items-end gap-3 rounded-2xl border border-[var(--card-border)] bg-[#fafbfd] p-4">
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-slate-500">Sabhi mock tests · poore 1 saal</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[1.1rem] font-semibold text-slate-400 line-through decoration-2">₹{plan.listPriceInr}</span>
                <span className="heading-grad text-[2.2rem] font-extrabold leading-none">₹{plan.priceInr}</span>
                <span className="font-display text-sm font-semibold text-slate-500">/ saal</span>
              </p>
            </div>
            <span className="rounded-full bg-[#e8f8ef] px-2.5 py-1 font-display text-[12px] font-bold text-[#0b8a4e]">
              {Math.round(100 - (plan.priceInr / plan.listPriceInr) * 100)}% OFF
            </span>
          </div>

          <button onClick={join} lang="hi" className="btn-cta mt-4 w-full py-3.5 text-[1.2rem]">
            {popup.cta} →
          </button>
          <p className="mt-2 text-center text-[13px] text-slate-500">
            Enrol se pehle login — phir seedha payment. {site.freeQuota.full} full + {site.freeQuota.subject} subject-wise mock tests free.
          </p>
        </div>
      </div>
    </div>
  );
}
