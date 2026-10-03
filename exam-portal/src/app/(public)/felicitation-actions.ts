"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizeIndianMobile } from "@/lib/phone";
import { verifyOtp } from "@/lib/users/otp";
import { getCurrentUser } from "@/lib/users/session";
import { encryptField } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "@/lib/security/request";
import { createDraftEntry } from "@/lib/felicitation/service";
import { getFelicitationSettings } from "@/lib/felicitation/settings";
import { createCheckout, PaymentsNotConfigured, type CheckoutInfo } from "@/lib/payments/service";

const text = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`).regex(/^[\p{L}\p{M}\p{N} .,'()&/-]+$/u, `${label} contains characters that are not allowed.`);

const submissionSchema = z.object({
  candidateName: text(2, 80, "Candidate name"),
  examName: text(2, 120, "Exam qualified"),
  examId: z.string().max(40).optional().nullable(),
  mobile: z.string(),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP."),
  locality: text(2, 80, "Mohalla / locality"),
  city: text(2, 60, "City"),
  state: text(2, 60, "State"),
  aadhaarLast4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of your Aadhaar."),
  consent: z.literal(true, { error: "Please accept the consent to continue." }),
});

export type FelicitationSubmitResult = { ok: true; refCode: string; checkout: CheckoutInfo; prefillName: string; prefillMobile: string } | { ok: false; error: string };

export async function submitFelicitationAction(input: unknown): Promise<FelicitationSubmitResult> {
  const ip = await clientIp();
  if (!rateLimit(`felicitation:${ip ?? "?"}`, 6, 10 * 60_000).ok) return { ok: false, error: "Too many submissions. Please try again later." };
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const mobile = normalizeIndianMobile(d.mobile);
  if (!mobile) return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
  const settings = await getFelicitationSettings();
  if (!settings.enabled) return { ok: false, error: "The Felicitation Board is not accepting entries right now." };
  const otp = await verifyOtp(mobile, "FELICITATION", d.otp);
  if (!otp.ok) return otp;
  const exam = d.examId ? await prisma.exam.findUnique({ where: { id: d.examId }, select: { id: true } }) : null;
  const user = await getCurrentUser();
  const entry = await createDraftEntry({
    candidateName: d.candidateName,
    examName: d.examName,
    examId: exam?.id ?? null,
    mobile,
    locality: d.locality,
    city: d.city,
    state: d.state,
    identityLast4Enc: encryptField(d.aadhaarLast4),
    userId: user?.id ?? null,
  });
  try {
    const checkout = await createCheckout({ purpose: "FELICITATION", amountRupees: settings.priceRupees, felicitationEntryId: entry.id, userId: user?.id ?? null, receipt: entry.refCode });
    return { ok: true, refCode: entry.refCode, checkout, prefillName: d.candidateName, prefillMobile: mobile };
  } catch (e) {
    return { ok: false, error: e instanceof PaymentsNotConfigured ? "Online payment is not available yet. Please try again later." : e instanceof Error ? e.message : "Could not start the payment." };
  }
}

export async function examOptionsAction(q: string): Promise<Array<{ id: string; title: string }>> {
  const term = String(q ?? "").trim().slice(0, 60);
  return prisma.exam.findMany({ where: { status: "PUBLISHED", ...(term ? { title: { contains: term, mode: "insensitive" } } : {}) }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 20 });
}
