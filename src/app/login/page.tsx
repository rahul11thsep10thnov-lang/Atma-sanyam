"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setDisplayName } from "@/lib/localStore";
import { Shield, Smartphone } from "lucide-react";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"google" | "otp">("google");

  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Google login abhi demo mode me available nahi hai — neeche Guest mode try karein.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSendOtp() {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Mobile OTP abhi demo mode me available nahi hai — neeche Guest mode try karein.");
      return;
    }
    if (!/^\+?[0-9]{10,13}$/.test(mobile)) {
      setError("Valid mobile number daalein (with country code, e.g. +91...)");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: mobile });
    setLoading(false);
    if (err) setError(err.message);
    else setOtpSent(true);
  }

  async function handleVerifyOtp() {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone: mobile, token: otp, type: "sms" });
    setLoading(false);
    if (err) setError(err.message);
    else router.push("/dashboard");
  }

  function handleGuestContinue() {
    if (name.trim()) setDisplayName(name.trim());
    router.push("/dashboard");
  }

  return (
    <div className="container-page max-w-md py-6">
      <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-white shadow-sm">
        {/* Sheet header */}
        <div className="bg-gradient-to-br from-[#fff4ea] via-white to-white px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6a00] to-[#ff9a4d] text-white shadow-md shadow-orange-300/50">
              <Shield size={22} />
            </span>
            <span className="font-display text-lg font-bold text-brand-dark">PoliceExams</span>
          </div>
          <h1 className="mt-4 font-display text-[1.75rem] font-bold text-brand-dark">Login to continue 👋</h1>
          <p className="mt-1 text-[16px] text-slate-500">
            Free account banayein — aapke scores, bookmarks aur mistakes save rahenge.
          </p>
        </div>

        <div className="border-t border-[var(--card-border)] px-5 py-5">
          {/* Method switch */}
          <div className="flex rounded-2xl bg-[#eef1f6] p-1" role="tablist" aria-label="Login method">
            {(["google", "otp"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={method === m}
                onClick={() => {
                  setMethod(m);
                  setError(null);
                }}
                className={
                  method === m
                    ? "flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 font-display text-[16px] font-semibold text-brand-dark shadow-sm"
                    : "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-display text-[16px] font-semibold text-slate-500"
                }
              >
                {m === "google" ? <GoogleDot /> : <Smartphone size={17} />}
                {m === "google" ? "Google" : "Mobile OTP"}
              </button>
            ))}
          </div>

          {method === "google" ? (
            <div className="mt-5">
              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-[1.5px] border-[var(--card-border)] bg-white py-3.5 font-display text-[17px] font-semibold text-brand-dark hover:bg-slate-50"
              >
                <GoogleG /> Continue with Google
              </button>
              <p className="mt-3 text-center text-[14px] text-slate-400">Google account se sign in · Free &amp; instant</p>
            </div>
          ) : !otpSent ? (
            <div className="mt-5 space-y-3">
              <div className="relative">
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  aria-label="Mobile number"
                  placeholder="+91 Mobile Number"
                  className="w-full rounded-2xl border-[1.5px] border-[var(--card-border)] py-3.5 pl-11 pr-3 text-[17px] outline-none focus:border-brand-orange"
                />
              </div>
              <button onClick={handleSendOtp} disabled={loading} className="btn-cta w-full py-3.5 text-[17px] disabled:opacity-50">
                OTP Bhejein
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="OTP"
                placeholder="6-digit OTP"
                className="w-full rounded-2xl border-[1.5px] border-[var(--card-border)] px-4 py-3.5 text-center text-[20px] tracking-[0.4em] outline-none focus:border-brand-orange"
              />
              <button onClick={handleVerifyOtp} disabled={loading} className="btn-cta w-full py-3.5 text-[17px] disabled:opacity-50">
                OTP Verify Karein
              </button>
            </div>
          )}

          {error && <p className="mt-3 rounded-xl bg-brand-red-light px-3 py-2 text-[14px] text-brand-red">{error}</p>}

          <p className="mt-5 text-center text-[13px] text-slate-400">
            Google aur Mobile OTP alag accounts hain — wahi method use karein jisse sign up kiya tha.
          </p>
        </div>

        {/* Demo / guest */}
        <div className="border-t border-dashed border-[var(--card-border)] bg-[#fafbfd] px-5 py-5">
          {!SUPABASE_CONFIGURED && (
            <p className="mb-3 rounded-xl border border-[#f5dd9a] bg-[#fffaeb] px-3 py-2 text-[13px] text-[#8a5a00]">
              Demo mode: login server abhi configure nahi hai. Guest ke roop me continue karein — progress isi
              browser me save hogi.
            </p>
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Display name"
            placeholder="Display Name (optional)"
            className="w-full rounded-2xl border-[1.5px] border-[var(--card-border)] bg-white px-4 py-3 text-[16px] outline-none focus:border-brand-orange"
          />
          <button onClick={handleGuestContinue} className="btn-dark mt-3 w-full py-3.5 text-[16px]">
            Guest ke roop me continue karein
          </button>
        </div>
      </div>

      <p className="mt-5 text-center text-[13px] text-slate-400">
        Login karke aap hamari{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        aur{" "}
        <Link href="/privacy-policy" className="underline">
          Privacy Policy
        </Link>{" "}
        se sehmat hote hain.
      </p>
    </div>
  );
}

function GoogleDot() {
  return <span className="h-4 w-4 rounded-full bg-gradient-to-br from-[#4285f4] to-[#1a73e8]" aria-hidden />;
}

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
