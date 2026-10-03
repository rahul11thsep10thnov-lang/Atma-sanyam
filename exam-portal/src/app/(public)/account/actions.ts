"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizeIndianMobile, maskMobile } from "@/lib/phone";
import { issueOtp, verifyOtp } from "@/lib/users/otp";
import { createUserSession, destroyUserSession, getCurrentUser, isMember, type PublicUser } from "@/lib/users/session";
import { hashPassword, verifyPassword, burnPasswordCheck } from "@/lib/auth/password";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "@/lib/security/request";
import { createCheckout, confirmPayment, failPayment, mockCheckoutResult, MEMBERSHIP_PRICE_RUPEES, PaymentsNotConfigured, type CheckoutInfo } from "@/lib/payments/service";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function toPublic(u: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): PublicUser {
  return { id: u.id, mobileMasked: maskMobile(u.mobile), fullName: u.fullName, profileComplete: !!u.profileCompletedAt, member: isMember(u), membershipUntil: u.membershipUntil?.toISOString() ?? null };
}

export async function getMeAction(): Promise<PublicUser | null> {
  const u = await getCurrentUser();
  return u ? toPublic(u) : null;
}

export async function sendOtpAction(mobileRaw: string, purpose: "SIGNUP" | "LOGIN" | "RESET" | "FELICITATION"): Promise<R<{ devCode?: string }>> {
  const mobile = normalizeIndianMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
  if (!["SIGNUP", "LOGIN", "RESET", "FELICITATION"].includes(purpose)) return { ok: false, error: "Invalid request." };
  const ip = await clientIp();
  if (!rateLimit(`otp:${ip ?? "?"}`, 10, 10 * 60_000).ok) return { ok: false, error: "Too many requests. Try again later." };
  const existing = await prisma.user.findUnique({ where: { mobile }, select: { passwordHash: true } });
  if (purpose === "SIGNUP" && existing?.passwordHash) return { ok: false, error: "This number is already registered. Please log in." };
  if ((purpose === "LOGIN" || purpose === "RESET") && !existing) return { ok: false, error: "No account with this number. Please sign up first." };
  const r = await issueOtp(mobile, purpose, ip);
  return r.ok ? { ok: true, devCode: r.devCode } : { ok: false, error: r.error + (r.retryAfterSec ? ` (${r.retryAfterSec}s)` : "") };
}

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(72).regex(/[A-Za-z]/, "Use at least one letter.").regex(/\d/, "Use at least one number.");

export async function signupAction(mobileRaw: string, code: string, password: string): Promise<R<{ user: PublicUser }>> {
  const mobile = normalizeIndianMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "Enter a valid mobile number." };
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
  const v = await verifyOtp(mobile, "SIGNUP", code.trim());
  if (!v.ok) return v;
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { mobile } });
  if (existing?.passwordHash) return { ok: false, error: "This number is already registered. Please log in." };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, mobileVerifiedAt: new Date() } })
    : await prisma.user.create({ data: { mobile, passwordHash, mobileVerifiedAt: new Date() } });
  await createUserSession(user.id);
  return { ok: true, user: toPublic(user) };
}

export async function loginPasswordAction(mobileRaw: string, password: string): Promise<R<{ user: PublicUser }>> {
  const mobile = normalizeIndianMobile(mobileRaw);
  const ip = await clientIp();
  if (!rateLimit(`login:${ip ?? "?"}`, 20, 15 * 60_000).ok || (mobile && !rateLimit(`login:${mobile}`, 8, 15 * 60_000).ok)) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  const user = mobile ? await prisma.user.findUnique({ where: { mobile } }) : null;
  if (!user?.passwordHash) {
    await burnPasswordCheck();
    return { ok: false, error: "Wrong mobile number or password." };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { ok: false, error: "Wrong mobile number or password." };
  await createUserSession(user.id);
  return { ok: true, user: toPublic(user) };
}

export async function loginOtpAction(mobileRaw: string, code: string): Promise<R<{ user: PublicUser }>> {
  const mobile = normalizeIndianMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "Enter a valid mobile number." };
  const v = await verifyOtp(mobile, "LOGIN", code.trim());
  if (!v.ok) return v;
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) return { ok: false, error: "No account with this number." };
  await createUserSession(user.id);
  return { ok: true, user: toPublic(user) };
}

export async function resetPasswordAction(mobileRaw: string, code: string, password: string): Promise<R<{ user: PublicUser }>> {
  const mobile = normalizeIndianMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "Enter a valid mobile number." };
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
  const v = await verifyOtp(mobile, "RESET", code.trim());
  if (!v.ok) return v;
  const user = await prisma.user.update({ where: { mobile }, data: { passwordHash: await hashPassword(password) } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  await createUserSession(user.id);
  return { ok: true, user: toPublic(user) };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100).regex(/^[\p{L} .'-]+$/u, "Name can contain letters, spaces, dots and hyphens only."),
  age: z.coerce.number().int().min(14, "Age must be at least 14.").max(70, "Age must be at most 70."),
  qualification: z.string().trim().min(2).max(80),
  examsAimed: z.array(z.string().trim().min(2).max(80)).min(1, "Choose at least one exam.").max(15),
});

export async function saveProfileAction(input: { fullName: string; age: string | number; qualification: string; examsAimed: string[] }): Promise<R<{ user: PublicUser }>> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "Please log in again." };
  const p = profileSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const user = await prisma.user.update({ where: { id: u.id }, data: { ...p.data, profileCompletedAt: u.profileCompletedAt ?? new Date() } });
  return { ok: true, user: toPublic(user) };
}

export async function logoutAction(): Promise<{ ok: true }> {
  await destroyUserSession();
  return { ok: true };
}

export async function startMembershipCheckoutAction(): Promise<R<{ checkout: CheckoutInfo; prefillMobile: string }>> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "Please log in first." };
  try {
    const checkout = await createCheckout({ purpose: "MEMBERSHIP", amountRupees: MEMBERSHIP_PRICE_RUPEES, userId: u.id, receipt: `mem_${u.id}` });
    return { ok: true, checkout, prefillMobile: u.mobile };
  } catch (e) {
    return { ok: false, error: e instanceof PaymentsNotConfigured ? "Online payment is not available yet. Please try again later." : "Could not start the payment." };
  }
}

export async function verifyCheckoutAction(input: { orderId: string; paymentId: string; signature: string }): Promise<R<{ purpose: string }>> {
  if (!input?.orderId || !input?.paymentId || !input?.signature) return { ok: false, error: "Incomplete payment response." };
  const r = await confirmPayment({ orderId: String(input.orderId), paymentId: String(input.paymentId), signature: String(input.signature) });
  return r.ok ? { ok: true, purpose: r.purpose } : r;
}

export async function reportCheckoutFailureAction(orderId: string, reason: string): Promise<{ ok: true }> {
  // The browser may report a failure, but can never report a success.
  await failPayment(String(orderId), `checkout: ${String(reason).slice(0, 200)}`);
  return { ok: true };
}

/** Development only (PAYMENT_PROVIDER=mock): returns a signed mock result. */
export async function mockCheckoutAction(orderId: string): Promise<R<{ orderId: string; paymentId: string; signature: string }>> {
  try {
    return { ok: true, ...mockCheckoutResult(String(orderId)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mock disabled" };
  }
}
