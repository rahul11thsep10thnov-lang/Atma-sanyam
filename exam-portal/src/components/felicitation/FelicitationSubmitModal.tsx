"use client";

import { useEffect, useState } from "react";
import { Modal, inputCls, labelCls, primaryBtn, secondaryBtn } from "@/components/ui/Modal";
import { sendOtpAction } from "@/app/(public)/account/actions";
import { submitFelicitationAction, examOptionsAction } from "@/app/(public)/felicitation-actions";
import { runCheckout } from "@/lib/payments/checkoutClient";

const STATES = ["Uttar Pradesh", "Bihar", "Madhya Pradesh", "Rajasthan", "Delhi", "Haryana", "Uttarakhand", "Jharkhand", "Punjab", "Gujarat", "Maharashtra", "West Bengal", "Odisha", "Chhattisgarh", "Himachal Pradesh", "Jammu and Kashmir", "Karnataka", "Kerala", "Tamil Nadu", "Telangana", "Andhra Pradesh", "Assam", "Goa", "Other"];

export function FelicitationSubmitModal({ open, onClose, priceRupees, referencePriceRupees }: { open: boolean; onClose: () => void; priceRupees: number; referencePriceRupees: number }) {
  const [f, setF] = useState({ candidateName: "", examName: "", examId: "", mobile: "", otp: "", locality: "", city: "", state: "Uttar Pradesh", aadhaarLast4: "", consent: false });
  const [options, setOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => setOptions(await examOptionsAction(f.examName)), 250);
    return () => clearTimeout(t);
  }, [f.examName, open]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const onExam = (v: string) => {
    const match = options.find((o) => o.title.toLowerCase() === v.trim().toLowerCase());
    setF((p) => ({ ...p, examName: v, examId: match?.id ?? "" }));
  };

  const sendOtp = async () => {
    setBusy(true);
    setErr(null);
    const r = await sendOtpAction(f.mobile, "FELICITATION");
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setOtpSent(true);
    setDevCode(r.devCode ?? null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!otpSent) return setErr("Please verify your mobile number with the OTP first.");
    setBusy(true);
    const r = await submitFelicitationAction({ ...f, examId: f.examId || null });
    if (!r.ok) {
      setBusy(false);
      return setErr(r.error);
    }
    const out = await runCheckout(r.checkout, { name: "SarkariChayan", description: "24-Hour Felicitation Listing", prefill: { name: r.prefillName, contact: r.prefillMobile } });
    setBusy(false);
    if (out.status === "paid") setDone(r.refCode);
    else if (out.status === "failed") setErr(`${out.reason} Your details are saved — you can try paying again.`);
  };

  const reset = () => {
    onClose();
    setTimeout(() => {
      setDone(null);
      setErr(null);
      setOtpSent(false);
      setDevCode(null);
      setF({ candidateName: "", examName: "", examId: "", mobile: "", otp: "", locality: "", city: "", state: "Uttar Pradesh", aadhaarLast4: "", consent: false });
    }, 200);
  };

  return (
    <Modal open={open} onClose={reset} title={done ? "🎉 Submission Received!" : "Get Your Achievement Featured"} wide>
      {done ? (
        <div className="flex flex-col gap-4 text-center" role="status">
          <p className="text-sm text-slate-700">Your felicitation entry has been submitted for verification. It will appear on the Felicitation Board after approval.</p>
          <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">Reference ID: <b className="font-mono text-base" data-testid="fb-ref">{done}</b></p>
          <p className="text-xs text-slate-500">Keep this ID for any query. Once approved, your entry is shown for 24 hours.</p>
          <button className={primaryBtn} onClick={reset}>Close</button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <p className="-mt-2 text-sm text-slate-600">Celebrate your success on our Felicitation Board for 24 hours.</p>
          {err ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelCls}>Candidate name *<input required value={f.candidateName} onChange={(e) => set("candidateName", e.target.value)} className={inputCls} name="candidateName" maxLength={80} /></label>
            <label className={labelCls}>Exam qualified *
              <input required list="fb-exams" value={f.examName} onChange={(e) => onExam(e.target.value)} className={inputCls} name="examName" maxLength={120} placeholder="Start typing, e.g. UP Police SI" />
              <datalist id="fb-exams">{options.map((o) => <option key={o.id} value={o.title} />)}</datalist>
            </label>
            <label className={labelCls}>Mohalla / locality *<input required value={f.locality} onChange={(e) => set("locality", e.target.value)} className={inputCls} name="locality" maxLength={80} /></label>
            <label className={labelCls}>City *<input required value={f.city} onChange={(e) => set("city", e.target.value)} className={inputCls} name="city" maxLength={60} /></label>
            <label className={labelCls}>State *
              <select value={f.state} onChange={(e) => set("state", e.target.value)} className={inputCls} name="state">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <div>
              <label className={labelCls}>Mobile number *
                <div className="mt-1 flex gap-2">
                  <input required value={f.mobile} onChange={(e) => { set("mobile", e.target.value); setOtpSent(false); }} inputMode="numeric" className={`${inputCls} mt-0`} name="mobile" placeholder="10-digit mobile" maxLength={14} />
                  <button type="button" onClick={sendOtp} disabled={busy} className="shrink-0 rounded-lg border border-[#e0823f] px-3 text-xs font-semibold text-[#6b3412] hover:bg-orange-50">{otpSent ? "Resend" : "Send OTP"}</button>
                </div>
              </label>
            </div>
            {otpSent ? (
              <label className={labelCls}>OTP *<input value={f.otp} onChange={(e) => set("otp", e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className={inputCls} name="otp" autoComplete="one-time-code" />
                {devCode ? <span className="mt-1 block text-[11px] text-amber-700">Development (no SMS provider): code <b data-testid="fb-dev-otp">{devCode}</b></span> : null}
              </label>
            ) : null}
            <label className={labelCls}>Aadhaar — last 4 digits only *<input value={f.aadhaarLast4} onChange={(e) => set("aadhaarLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className={inputCls} name="aadhaarLast4" autoComplete="off" placeholder="XXXX" /></label>
          </div>
          <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5" name="consent" />
            <span>
              I confirm these details are true and consent to SarkariChayan using them to verify my achievement. Only the last 4 digits of my Aadhaar are taken; they are stored encrypted, seen only by the site administrator for verification, never shown publicly, and deleted 30 days after my listing ends. Publicly the board shows only my name, mohalla/locality, city and exam. My mobile number is used for verification and is never displayed.
            </span>
          </label>
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">24-Hour Felicitation Listing</span>
            <span className="text-right">
              {referencePriceRupees > priceRupees ? <s className="mr-2 text-sm text-slate-400">₹{referencePriceRupees}</s> : null}
              <b className="text-xl text-[#4a220a]">₹{priceRupees}</b>
            </span>
          </div>
          <button className={primaryBtn} disabled={busy}>{busy ? "Please wait…" : `Pay ₹${priceRupees} & Submit`}</button>
          <button type="button" className={secondaryBtn} onClick={reset}>Cancel</button>
          <p className="text-center text-[11px] text-slate-500">Entries appear only after payment is verified and an administrator approves them.</p>
        </form>
      )}
    </Modal>
  );
}
