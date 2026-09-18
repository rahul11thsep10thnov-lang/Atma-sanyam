"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client. Returns null when env vars aren't configured yet
 * (e.g. during local/demo use before a Supabase project is provisioned) so
 * callers can fall back to the static seed data / localStorage instead of
 * crashing.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
