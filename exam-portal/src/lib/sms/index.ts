import { prisma } from "@/lib/db/prisma";

/**
 * Outbound SMS. Providers (pick with SMS_PROVIDER):
 *  - "twilio": TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *  - "msg91":  MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID, MSG91_ALERT_TEMPLATE_ID
 *              (DLT-approved Flow templates; variables ##otp## / ##message##)
 * With no provider configured nothing is sent: the attempt is logged as
 * FAILED, and in development the OTP is shown on screen instead.
 */
export type SmsKind = "otp" | "alert";
export interface SmsSender {
  readonly name: string;
  send(to: string, kind: SmsKind, text: string, vars: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }>;
}

class TwilioSender implements SmsSender {
  readonly name = "twilio";
  constructor(private sid: string, private token: string, private from: string) {}
  async send(to: string, _kind: SmsKind, text: string) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
        method: "POST",
        headers: { authorization: "Basic " + Buffer.from(`${this.sid}:${this.token}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: this.from, Body: text }),
      });
      return res.ok ? { ok: true as const } : { ok: false as const, error: `Twilio HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

class Msg91Sender implements SmsSender {
  readonly name = "msg91";
  constructor(private authKey: string, private otpTemplate: string, private alertTemplate: string | undefined) {}
  async send(to: string, kind: SmsKind, _text: string, vars: Record<string, string>) {
    const template = kind === "otp" ? this.otpTemplate : this.alertTemplate;
    if (!template) return { ok: false as const, error: "MSG91 template for this message type is not configured." };
    try {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: this.authKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ template_id: template, short_url: "0", recipients: [{ mobiles: to.replace(/^\+/, ""), ...vars }] }),
      });
      return res.ok ? { ok: true as const } : { ok: false as const, error: `MSG91 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

let override: SmsSender | null | undefined;
export function setSmsSender(s: SmsSender | null | undefined) {
  override = s;
}

export function getSmsSender(): SmsSender | null {
  if (override !== undefined) return override;
  const p = process.env.SMS_PROVIDER;
  if (p === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
    return new TwilioSender(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_FROM);
  if (p === "msg91" && process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID)
    return new Msg91Sender(process.env.MSG91_AUTH_KEY, process.env.MSG91_OTP_TEMPLATE_ID, process.env.MSG91_ALERT_TEMPLATE_ID);
  return null;
}

export async function sendSms(input: { to: string; kind: SmsKind; text: string; vars?: Record<string, string>; purpose: string; userId?: string | null }) {
  const sender = getSmsSender();
  const r = sender ? await sender.send(input.to, input.kind, input.text, input.vars ?? {}) : { ok: false as const, error: "No SMS provider configured (set SMS_PROVIDER)." };
  await prisma.smsLog.create({ data: { userId: input.userId ?? null, mobile: input.to, purpose: input.purpose, status: r.ok ? "SENT" : "FAILED", error: r.ok ? null : r.error.slice(0, 500) } });
  return r;
}
