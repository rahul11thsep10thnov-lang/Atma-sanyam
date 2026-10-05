"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/users/session";
import { Modal, inputCls, labelCls, primaryBtn, secondaryBtn } from "@/components/ui/Modal";
import { sendOtpAction, signupAction, loginPasswordAction, loginOtpAction, resetPasswordAction, saveProfileAction, logoutAction, startMembershipCheckoutAction } from "@/app/(public)/account/actions";
import { runCheckout } from "@/lib/payments/checkoutClient";

const QUALIFICATIONS = ["8th pass", "10th pass", "12th pass", "ITI", "Diploma", "Graduate", "Post Graduate", "B.Tech / B.E.", "B.Ed", "LLB", "MBBS / Nursing", "PhD", "Other"];
const EXAMS = ["UPSC Civil Services", "SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD", "Railway NTPC", "Railway Group D", "IBPS PO", "IBPS Clerk", "SBI PO", "UP Police Constable", "UP Police SI", "UPSSSC PET", "State PSC", "CTET / TET", "NDA / CDS", "Agniveer", "Other"];

type Step = "login" | "loginOtp" | "signup" | "reset" | "profile" | "membership" | "done";

function Err({ msg }: { msg: string | null }) {
  return msg ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null;
}

export function AccountMenu({ initialUser, membershipPrice }: { initialUser: PublicUser | null; membershipPrice: number }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", age: "", qualification: "", exams: [] as string[], otherExam: "" });

  const close = useCallback(() => {
    setOpen(false);
    setErr(null);
    setInfo(null);
    router.refresh();
  }, [router]);

  const begin = (s: Step) => {
    setStep(s);
    setErr(null);
    setInfo(null);
    setOtpSent(false);
    setDevCode(null);
    setCode("");
    setPassword("");
    setPassword2("");
    setOpen(true);
    setMenu(false);
  };

  const afterAuth = (u: PublicUser) => {
    setUser(u);
    if (!u.profileComplete) setStep("profile");
    else if (!u.member) setStep("membership");
    else close();
  };

  const send = async (purpose: "SIGNUP" | "LOGIN" | "RESET") => {
    setBusy(true);
    setErr(null);
    const r = await sendOtpAction(mobile, purpose);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setOtpSent(true);
    setDevCode(r.devCode ?? null);
    setInfo("OTP sent to your mobile number.");
  };

  const run = async (fn: () => Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }>) => {
    setBusy(true);
    setErr(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    afterAuth(r.user);
  };

  const saveProfile = async () => {
    const exams = [...profile.exams.filter((e) => e !== "Other"), ...profile.otherExam.split(",").map((s) => s.trim()).filter(Boolean)];
    setBusy(true);
    setErr(null);
    const r = await saveProfileAction({ fullName: profile.fullName, age: profile.age, qualification: profile.qualification, examsAimed: exams });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setUser(r.user);
    setStep(r.user.member ? "done" : "membership");
  };

  const buyMembership = async () => {
    setBusy(true);
    setErr(null);
    const r = await startMembershipCheckoutAction();
    if (!r.ok) {
      setBusy(false);
      return setErr(r.error);
    }
    const out = await runCheckout(r.checkout, { name: "Naukri Chayan", description: `Membership — ₹${membershipPrice}/month`, prefill: { contact: r.prefillMobile, name: user?.fullName ?? undefined } });
    setBusy(false);
    if (out.status === "paid") {
      setUser((u) => (u ? { ...u, member: true } : u));
      setStep("done");
      setInfo("Membership active. No ads, and an SMS for every new job notification.");
    } else if (out.status === "failed") setErr(out.reason);
  };

  const mobileField = (
    <label className={labelCls}>
      Mobile number
      <div className="mt-1 flex">
        <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">+91</span>
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit mobile" className={`${inputCls} mt-0 rounded-l-none`} name="mobile" />
      </div>
    </label>
  );
  const otpField = (
    <label className={labelCls}>
      OTP
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className={inputCls} name="otp" />
      {devCode ? <span className="mt-1 block text-[11px] text-amber-700">Development (no SMS provider): your code is <b data-testid="dev-otp">{devCode}</b></span> : null}
    </label>
  );

  const title: Record<Step, string> = { login: "Log in", loginOtp: "Log in with OTP", signup: "Sign up", reset: "Reset password", profile: "Tell us about yourself", membership: "Become a member", done: "All set" };

  return (
    <>
      {user ? (
        <div className="relative">
          <button type="button" onClick={() => setMenu((m) => !m)} className="inline-flex items-center gap-2 rounded-full border border-[#e0823f] bg-white/90 px-3 py-2 text-sm font-semibold text-[#4a220a] shadow-sm hover:bg-orange-50" aria-expanded={menu}>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#6b3412] text-xs text-white">{(user.fullName ?? "U").slice(0, 1).toUpperCase()}</span>
            <span className="max-w-[9rem] truncate">{user.fullName ?? user.mobileMasked}</span>
            {user.member ? <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">Member</span> : null}
          </button>
          {menu ? (
            <div className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
              <p className="px-2 py-1 text-xs text-slate-500">{user.mobileMasked}</p>
              {user.member ? (
                <p className="px-2 py-1 text-xs text-emerald-700">Member till {user.membershipUntil ? new Date(user.membershipUntil).toLocaleDateString("en-IN") : ""}</p>
              ) : (
                <button className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-orange-50" onClick={() => begin("membership")}>Get membership — ₹{membershipPrice}/month</button>
              )}
              <button className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-orange-50" onClick={() => begin("profile")}>Edit profile</button>
              <button
                className="block w-full rounded-md px-2 py-1.5 text-left text-red-600 hover:bg-red-50"
                onClick={async () => {
                  await logoutAction();
                  setUser(null);
                  setMenu(false);
                  router.refresh();
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => begin("login")} className="rounded-lg border border-[#e0823f] bg-white/90 px-4 py-2 text-sm font-semibold text-[#4a220a] hover:bg-orange-50">Login</button>
          <button type="button" onClick={() => begin("signup")} className="rounded-lg bg-[#6b3412] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a220a]">Sign up</button>
        </div>
      )}

      <Modal open={open} onClose={close} title={title[step]}>
        <div className="flex flex-col gap-3">
          {info ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}
          <Err msg={err} />

          {step === "login" ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => (e.preventDefault(), run(() => loginPasswordAction(mobile, password)))}>
              {mobileField}
              <label className={labelCls}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} name="password" /></label>
              <button className={primaryBtn} disabled={busy}>{busy ? "Please wait…" : "Log in"}</button>
              <div className="flex justify-between text-xs">
                <button type="button" className="text-[#6b3412] underline" onClick={() => begin("loginOtp")}>Log in with OTP</button>
                <button type="button" className="text-[#6b3412] underline" onClick={() => begin("reset")}>Forgot password?</button>
              </div>
              <p className="text-center text-xs text-slate-500">New here? <button type="button" className="font-semibold text-[#6b3412] underline" onClick={() => begin("signup")}>Create an account</button></p>
            </form>
          ) : null}

          {step === "loginOtp" ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => (e.preventDefault(), otpSent ? run(() => loginOtpAction(mobile, code)) : send("LOGIN"))}>
              {mobileField}
              {otpSent ? otpField : null}
              <button className={primaryBtn} disabled={busy}>{busy ? "Please wait…" : otpSent ? "Verify & log in" : "Send OTP"}</button>
              {otpSent ? <button type="button" className="text-xs text-[#6b3412] underline" onClick={() => send("LOGIN")}>Resend OTP</button> : null}
            </form>
          ) : null}

          {step === "signup" || step === "reset" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!otpSent) return send(step === "signup" ? "SIGNUP" : "RESET");
                if (password !== password2) return setErr("Passwords do not match.");
                run(() => (step === "signup" ? signupAction(mobile, code, password) : resetPasswordAction(mobile, code, password)));
              }}
            >
              {mobileField}
              {otpSent ? (
                <>
                  {otpField}
                  <label className={labelCls}>{step === "signup" ? "Set a password" : "New password"}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputCls} name="password" /></label>
                  <label className={labelCls}>Confirm password<input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" className={inputCls} name="password2" /></label>
                  <p className="text-[11px] text-slate-500">At least 8 characters with a letter and a number.</p>
                </>
              ) : null}
              <button className={primaryBtn} disabled={busy}>{busy ? "Please wait…" : otpSent ? (step === "signup" ? "Verify & create account" : "Verify & reset") : "Send OTP"}</button>
              {otpSent ? <button type="button" className="text-xs text-[#6b3412] underline" onClick={() => send(step === "signup" ? "SIGNUP" : "RESET")}>Resend OTP</button> : null}
              {step === "signup" ? <p className="text-center text-xs text-slate-500">Already registered? <button type="button" className="font-semibold text-[#6b3412] underline" onClick={() => begin("login")}>Log in</button></p> : null}
            </form>
          ) : null}

          {step === "profile" ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => (e.preventDefault(), saveProfile())}>
              <p className="text-sm text-slate-600">This helps us show you the right notifications.</p>
              <label className={labelCls}>Full name<input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className={inputCls} name="fullName" autoComplete="name" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>Age<input value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" className={inputCls} name="age" /></label>
                <label className={labelCls}>Qualification
                  <select value={profile.qualification} onChange={(e) => setProfile({ ...profile, qualification: e.target.value })} className={inputCls} name="qualification">
                    <option value="">Choose…</option>
                    {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend className={labelCls}>Exams you are aiming for</legend>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {EXAMS.map((x) => (
                    <label key={x} className="flex items-center gap-2"><input type="checkbox" checked={profile.exams.includes(x)} onChange={(e) => setProfile({ ...profile, exams: e.target.checked ? [...profile.exams, x] : profile.exams.filter((y) => y !== x) })} /> {x}</label>
                  ))}
                </div>
                {profile.exams.includes("Other") ? <input value={profile.otherExam} onChange={(e) => setProfile({ ...profile, otherExam: e.target.value })} placeholder="Other exams, comma separated" className={inputCls} /> : null}
              </fieldset>
              <button className={primaryBtn} disabled={busy}>{busy ? "Saving…" : "Save & continue"}</button>
            </form>
          ) : null}

          {step === "membership" ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                <p className="text-3xl font-bold text-[#4a220a]">₹{membershipPrice}<span className="text-base font-medium">/month</span></p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>✓ No ads anywhere on the site</li>
                  <li>✓ SMS on every new job notification</li>
                  <li>✓ Supports an independent exam portal</li>
                </ul>
              </div>
              <button className={primaryBtn} disabled={busy} onClick={buyMembership}>{busy ? "Opening payment…" : `Pay ₹${membershipPrice} & become a member`}</button>
              <button className={secondaryBtn} onClick={close}>Maybe later</button>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-4xl">🎉</p>
              <p className="text-sm text-slate-700">You are signed in{user?.fullName ? `, ${user.fullName}` : ""}.</p>
              <button className={primaryBtn} onClick={close}>Continue</button>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
