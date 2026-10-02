"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// "Logged in" on the website means: a Supabase session (Google / mobile OTP)
// or a guest profile created on the login page. The API has its own session
// (see liveApi.ensureSession); this flag only drives navigation such as
// "go to login first, then to the payment page".
const KEY = "pe_logged_in";

export function markLoggedIn() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

export function hasLocalLogin(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  if (hasLocalLogin()) return true;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Only same-site paths are accepted as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
