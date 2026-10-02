"use server";

import { alertSubscribeSchema } from "@/lib/validation/alert";
import { createSubscription } from "@/lib/alerts/subscriptions";
import { isEmailConfigured } from "@/lib/alerts/email";

export interface SubscribeState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Only in development without a mail provider, so the flow can be completed locally. */
  devVerifyUrl?: string;
}

export async function subscribeAction(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    recruitmentId: String(formData.get("recruitmentId") ?? ""),
    organizationId: String(formData.get("organizationId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    stateId: String(formData.get("stateId") ?? ""),
    keyword: String(formData.get("keyword") ?? ""),
    noticeTypes: formData.getAll("noticeTypes").map(String),
    minPriority: String(formData.get("minPriority") ?? "LOW"),
    locale: String(formData.get("locale") ?? "en"),
  };
  const parsed = alertSubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.path[0] === "email" ? (raw.locale === "hi" ? "कृपया सही ई-मेल पता लिखें।" : "Please enter a valid e-mail address.") : first?.message ?? "Invalid input." };
  }
  const hi = parsed.data.locale === "hi";
  try {
    const r = await createSubscription(parsed.data);
    if (r.alreadyVerified) return { ok: true, message: hi ? "आपके अलर्ट पहले से चालू हैं।" : "Your alerts are already switched on." };
    if (r.verificationSent) return { ok: true, message: hi ? "पुष्टि के लिए ई-मेल भेजा गया है — लिंक खोलकर अलर्ट चालू करें।" : "Check your e-mail and open the confirmation link to switch on alerts." };
    return {
      ok: true,
      message: hi ? "सदस्यता दर्ज हुई। ई-मेल सेवा कॉन्फ़िगर होने पर पुष्टि-लिंक भेजा जाएगा।" : "Subscription saved. A confirmation link will be e-mailed once the mail service is configured.",
      ...(!isEmailConfigured() && process.env.NODE_ENV !== "production" ? { devVerifyUrl: r.verifyUrl } : {}),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not subscribe." };
  }
}
