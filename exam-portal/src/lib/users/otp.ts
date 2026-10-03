import { randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { OtpPurpose } from "@/generated/prisma/enums";
import { sendSms, getSmsSender } from "@/lib/sms";
import { sha256 } from "@/lib/security/crypto";
import { SITE_NAME } from "@/lib/siteConfig";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_GAP_MS = 45_000;
export const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_PER_IP_HOUR = 20;

const hashCode = (mobile: string, purpose: string, code: string) => sha256(`${mobile}|${purpose}|${code}|${process.env.NEXTAUTH_SECRET ?? ""}`);

export type IssueResult = { ok: true; devCode?: string } | { ok: false; error: string; retryAfterSec?: number };

export async function issueOtp(mobile: string, purpose: OtpPurpose, ip: string | null, now = new Date()): Promise<IssueResult> {
  const last = await prisma.otpCode.findFirst({ where: { mobile, purpose }, orderBy: { createdAt: "desc" } });
  if (last && now.getTime() - last.createdAt.getTime() < OTP_RESEND_GAP_MS) {
    return { ok: false, error: "Please wait before requesting another code.", retryAfterSec: Math.ceil((OTP_RESEND_GAP_MS - (now.getTime() - last.createdAt.getTime())) / 1000) };
  }
  const hourAgo = new Date(now.getTime() - 3_600_000);
  if ((await prisma.otpCode.count({ where: { mobile, createdAt: { gte: hourAgo } } })) >= OTP_MAX_PER_HOUR) return { ok: false, error: "Too many codes requested for this number. Try again in an hour." };
  if (ip && (await prisma.otpCode.count({ where: { ip, createdAt: { gte: hourAgo } } })) >= OTP_MAX_PER_IP_HOUR) return { ok: false, error: "Too many requests. Try again later." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.updateMany({ where: { mobile, purpose, consumedAt: null }, data: { consumedAt: now } }); // older codes die
  await prisma.otpCode.create({ data: { mobile, purpose, codeHash: hashCode(mobile, purpose, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS), ip } });
  const text = `${code} is your ${SITE_NAME} verification code. It expires in 5 minutes. Do not share it.`;
  const r = await sendSms({ to: mobile, kind: "otp", text, vars: { otp: code }, purpose: `otp:${purpose}` });
  if (r.ok) return { ok: true };
  // No provider: in development show the code so the flow can be completed locally.
  if (!getSmsSender() && process.env.NODE_ENV !== "production") return { ok: true, devCode: code };
  return { ok: false, error: "Could not send the SMS right now. Please try again." };
}

export async function verifyOtp(mobile: string, purpose: OtpPurpose, code: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code." };
  const row = await prisma.otpCode.findFirst({ where: { mobile, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt <= now) return { ok: false, error: "The code has expired. Request a new one." };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Request a new code." };
  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hashCode(mobile, purpose, code));
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code." };
  }
  // Single use: only the first concurrent verifier wins.
  const used = await prisma.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: now } });
  return used.count === 1 ? { ok: true } : { ok: false, error: "This code was already used." };
}
