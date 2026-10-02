"use client";

import { getAttempts } from "@/lib/localStore";
import { getMockTest } from "@/data/mockTests";
import { liveApi, liveApiEnabled, type Entitlement } from "@/lib/liveApi";
import { DEFAULT_SITE, loadSiteSettings } from "@/lib/site";

// Free quota (2 full + 2 subject-wise tests per user) and the yearly plan.
// With the API configured the server decides (POST /start answers 402); in
// demo mode the same rule runs on the device so the experience matches.

export const ENROLL_EVENT = "pe:enroll";
const SUB_KEY = "pe_subscription";
const STARTED_KEY = "pe_started_tests";

export type MockKind = "full" | "subject";

export function kindOfDemoTest(mockId: string): MockKind {
  return getMockTest(mockId)?.type === "full" ? "full" : "subject";
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/** Demo mode only: remember which built-in tests were started. */
export function recordDemoTestStart(mockId: string) {
  const started = read<string[]>(STARTED_KEY, []);
  if (!started.includes(mockId)) write(STARTED_KEY, [...started, mockId]);
}

function demoStartedIds(): Set<string> {
  const ids = new Set(read<string[]>(STARTED_KEY, []));
  for (const a of getAttempts()) if (!a.id.startsWith("live-")) ids.add(a.mockId);
  return ids;
}

export function demoSubscriptionActive(): boolean {
  const sub = read<{ expiresAt: string } | null>(SUB_KEY, null);
  return !!sub && Date.parse(sub.expiresAt) > Date.now();
}

export function activateDemoSubscription(days: number) {
  write(SUB_KEY, { expiresAt: new Date(Date.now() + days * 86_400_000).toISOString() });
}

export async function demoEntitlement(): Promise<Entitlement> {
  const site = await loadSiteSettings().catch(() => DEFAULT_SITE);
  const started = demoStartedIds();
  const used = { full: 0, subject: 0 };
  for (const id of started) used[kindOfDemoTest(id)]++;
  const q = (kind: MockKind) => ({ used: used[kind], limit: site.freeQuota[kind], remaining: Math.max(0, site.freeQuota[kind] - used[kind]) });
  const sub = read<{ expiresAt: string } | null>(SUB_KEY, null);
  return {
    subscribed: demoSubscriptionActive(),
    expiresAt: sub?.expiresAt ?? null,
    plan: site.plan,
    freeQuota: { full: q("full"), subject: q("subject") },
  };
}

/** Demo mode: may this built-in test be started for free? */
export async function demoCanStart(mockId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (demoSubscriptionActive() || demoStartedIds().has(mockId)) return { ok: true };
  const e = await demoEntitlement();
  const kind = kindOfDemoTest(mockId);
  if (e.freeQuota[kind].remaining > 0) return { ok: true };
  return {
    ok: false,
    message: `Aapke ${e.freeQuota[kind].limit} free ${kind === "full" ? "full" : "subject-wise"} mock tests ho chuke hain. ₹${e.plan.priceInr} mein poore saal ke liye enrol karein.`,
  };
}

/** Current entitlement from the API when configured, else from this device. */
export async function getEntitlement(): Promise<Entitlement> {
  if (liveApiEnabled) {
    try {
      return (await liveApi.me()).entitlement;
    } catch {
      // fall through to the local view so the page still renders
    }
  }
  return demoEntitlement();
}

/** Opens the enrolment popup from anywhere (e.g. when a paid test is attempted). */
export function openEnrollPopup(reason?: string) {
  window.dispatchEvent(new CustomEvent(ENROLL_EVENT, { detail: { reason } }));
}
