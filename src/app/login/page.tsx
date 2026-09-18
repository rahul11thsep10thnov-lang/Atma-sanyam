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
    <div className="container-page py-10 max-w-sm">
      <div className="text-center mb-6">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white mb-3">
          <Shield size={24} />
        </span>
        <h1 className="text-xl font-extrabold text-gray-900">Login / Sign Up</h1>
        <p className="text-sm text-gray-500 mt-1">
          Apni progress save karein, bookmarks aur mistakes track karein.
        </p>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 mb-5">
          Demo mode: Supabase configure nahi hai, isliye Google/Mobile OTP
          abhi disabled hain. Neeche &quot;Guest ke roop me continue karein&quot;
          use karein — aapki progress isi browser me localStorage me save
          hogi.
        </div>
      )}

      <button onClick={handleGoogleLogin} className="btn-secondary bg-white w-full py-3 text-sm mb-3">
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-400">ya</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      {!otpSent ? (
        <div className="space-y-3">
          <div className="relative">
            <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91 Mobile Number"
              className="w-full rounded-lg border border-[var(--card-border)] py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-navy"
            />
          </div>
          <button onClick={handleSendOtp} disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
            OTP Bhejein
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            className="w-full rounded-lg border border-[var(--card-border)] py-3 px-3 text-sm outline-none focus:border-brand-navy"
          />
          <button onClick={handleVerifyOtp} disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
            OTP Verify Karein
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-400">Demo</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display Name (optional)"
          className="w-full rounded-lg border border-[var(--card-border)] py-3 px-3 text-sm outline-none focus:border-brand-navy"
        />
        <button onClick={handleGuestContinue} className="btn-gold w-full py-3 text-sm">
          Guest ke roop me continue karein
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
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
