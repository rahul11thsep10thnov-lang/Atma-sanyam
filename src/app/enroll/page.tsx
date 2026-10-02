"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles, BadgeCheck } from "lucide-react";
import { activateDemoSubscription, getEntitlement } from "@/lib/enroll";
import { liveApi, liveApiEnabled, LiveApiError, type EnrollOrder, type Entitlement } from "@/lib/liveApi";
import { isLoggedIn } from "@/lib/session";
import { useSiteSettings } from "@/lib/site";

type Phase = "checking" | "ready" | "paying" | "done" | "error";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Enrolment (payment) page for the yearly Mock Test Pass. Login first;
 * the API creates the order and verifies the payment — the browser never
 * sees a secret or decides that a plan is active. */
export default function EnrollPage() {
  const site = useSiteSettings();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await isLoggedIn())) {
        router.replace(`/login?next=${encodeURIComponent("/enroll")}`);
        return;
      }
      const e = await getEntitlement().catch(() => null);
      if (cancelled) return;
      setEntitlement(e);
      setPhase(e?.subscribed ? "done" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function pay() {
    setError(null);
    setPhase("paying");
    if (!liveApiEnabled) {
      // Demo mode: no payment gateway. Activate on this device only and say so.
      activateDemoSubscription(site.plan.durationDays);
      setEntitlement(await getEntitlement());
      setPhase("done");
      return;
    }
    let order: EnrollOrder;
    try {
      order = await liveApi.enrollOrder();
    } catch (e) {
      setError(e instanceof LiveApiError ? e.message : "Order create nahi ho paaya. Thodi der baad try karein.");
      setPhase("ready");
      return;
    }
    if (order.provider === "dev") {
      try {
        const r = await liveApi.enrollConfirm({ orderId: order.orderId });
        setEntitlement(r.entitlement);
        setPhase("done");
      } catch (e) {
        setError(e instanceof LiveApiError ? e.message : "Activation fail ho gaya.");
        setPhase("ready");
      }
      return;
    }
    if (!(await loadRazorpay()) || !window.Razorpay) {
      setError("Payment window load nahi ho paayi. Internet check karke dobara try karein.");
      setPhase("ready");
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amountInr * 100,
      currency: order.currency,
      name: "PoliceExams",
      description: `${order.planName} · ${order.durationDays} din`,
      order_id: order.providerOrderId,
      theme: { color: "#ff6a5a" },
      modal: { ondismiss: () => setPhase("ready") },
      handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const r = await liveApi.enrollConfirm({ orderId: order.orderId, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
          setEntitlement(r.entitlement);
          setPhase("done");
        } catch (e) {
          setError(e instanceof LiveApiError ? e.message : "Payment verify nahi ho paaya. Support se sampark karein.");
          setPhase("ready");
        }
      },
    });
    rzp.on("payment.failed", () => {
      setError("Payment poora nahi hua. Koi paisa kata ho to wapas aa jaayega.");
      setPhase("ready");
    });
    rzp.open();
  }

  const { plan } = site;
  const off = Math.round(100 - (plan.priceInr / plan.listPriceInr) * 100);

  return (
    <div className="container-page container-narrow py-6">
      <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#e8fbf1] via-white to-[#ffece9] px-5 pt-6 pb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe9d2] bg-white px-3 py-1 font-display text-[12px] font-bold uppercase tracking-wider text-[#0b8a4e]">
            <Sparkles size={13} /> {plan.name}
          </span>
          <h1 className="mt-3 font-display text-[1.9rem] font-extrabold leading-tight">Poore saal ke sabhi mock tests</h1>
          <p lang="hi" className="brand-quote mt-2 text-[1.15rem] text-[#7a4a2a]">
            {site.popup.title}
          </p>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-end justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[#fafbfd] p-4">
            <div>
              <p className="font-display text-sm font-semibold text-slate-500">Enrolment se {plan.durationDays} din tak</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[1.2rem] font-semibold text-slate-400 line-through decoration-2">₹{plan.listPriceInr}</span>
                <span className="heading-grad text-[2.6rem] font-extrabold leading-none">₹{plan.priceInr}</span>
              </p>
            </div>
            <span className="rounded-full bg-[#e8f8ef] px-3 py-1 font-display text-[13px] font-bold text-[#0b8a4e]">{off}% OFF</span>
          </div>

          <ul className="mt-4 space-y-2.5 text-[16px] text-slate-700">
            {[
              "Sabhi states ke Constable & SI full-length mock tests",
              "Subject-wise tests — unlimited attempts",
              "Real timer, question palette aur detailed solutions",
              "Naye tests jaise hi publish hon, turant available",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#10a760]" /> {t}
              </li>
            ))}
          </ul>

          {entitlement && !entitlement.subscribed && (
            <p className="mt-4 rounded-xl bg-[#eef1f6] px-3 py-2 text-[14px] text-slate-600">
              Free tests used: {entitlement.freeQuota.full.used}/{entitlement.freeQuota.full.limit} full ·{" "}
              {entitlement.freeQuota.subject.used}/{entitlement.freeQuota.subject.limit} subject-wise
            </p>
          )}

          {error && <p className="mt-4 rounded-xl bg-brand-red-light px-3 py-2 text-[14px] text-brand-red">{error}</p>}

          {phase === "checking" && <p className="mt-5 text-center text-[15px] text-slate-500">Checking your account…</p>}

          {(phase === "ready" || phase === "paying") && (
            <>
              <button onClick={pay} disabled={phase === "paying"} className="btn-cta mt-5 w-full py-4 text-[1.2rem] disabled:opacity-60">
                {phase === "paying" ? "Please wait…" : `₹${plan.priceInr} Pay karein aur enrol ho jaayein`}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-slate-500">
                <ShieldCheck size={15} /> Secure payment · Plan server par activate hota hai
              </p>
              {!liveApiEnabled && (
                <p className="mt-3 rounded-xl border border-[#f5dd9a] bg-[#fffaeb] px-3 py-2 text-[13px] text-[#8a5a00]">
                  Demo mode: payment gateway configure nahi hai. Button dabane par plan sirf is browser mein activate hoga.
                </p>
              )}
            </>
          )}

          {phase === "done" && (
            <div className="mt-5 rounded-2xl border border-[#bfe9d2] bg-brand-green-light p-4 text-center">
              <BadgeCheck size={34} className="mx-auto text-[#0b8a4e]" />
              <p className="mt-2 font-display text-[1.2rem] font-bold text-[#0b8a4e]">Aap enrol ho gaye! 🎉</p>
              {entitlement?.expiresAt && (
                <p className="mt-1 text-[14px] text-slate-600">
                  Valid till {new Date(entitlement.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              <Link href="/mock-test" className="btn-cta mt-4 inline-block px-6 py-3 text-[16px]">
                Mock Tests shuru karein →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
