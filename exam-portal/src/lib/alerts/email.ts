/**
 * E-mail sending for alerts. The only provider wired up is Resend's HTTP
 * API (no SDK needed); without RESEND_API_KEY every alert is recorded as
 * FAILED with an honest reason, never silently dropped or faked.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  readonly name: string;
  send(message: EmailMessage): Promise<{ ok: true; id?: string } | { ok: false; error: string }>;
}

export class ResendSender implements EmailSender {
  readonly name = "resend";
  constructor(private readonly apiKey: string, private readonly from: string, private readonly fetchImpl: typeof fetch = fetch) {}
  async send(message: EmailMessage) {
    try {
      const res = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      });
      if (!res.ok) return { ok: false as const, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true as const, id: data.id };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

let override: EmailSender | null | undefined;

/** Tests inject a fake sender; `null` forces the unconfigured path. */
export function setEmailSender(sender: EmailSender | null | undefined) {
  override = sender;
}

export function getEmailSender(): EmailSender | null {
  if (override !== undefined) return override;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;
  if (!key || !from) return null;
  return new ResendSender(key, from);
}

export function isEmailConfigured(): boolean {
  return getEmailSender() !== null;
}
