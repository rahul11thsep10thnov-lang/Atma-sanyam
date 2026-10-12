// Sending one-time codes by SMS. Two real providers over their HTTP APIs
// (MSG91 for India, Twilio elsewhere), chosen by SMS_PROVIDER, and a console
// sender for local development. Only `send` matters: add another provider
// by implementing it. Codes are never written to the log by the real senders.
export interface SmsMessage {
  to: string; // E.164
  text: string;
  /** The one-time code inside `text`, for providers that take it as a template variable. */
  code?: string;
}

export interface SmsSender {
  readonly name: string;
  send(message: SmsMessage): Promise<void>;
}

// https://www.twilio.com/docs/messaging/api/message-resource
export function createTwilioSmsSender(accountSid: string, authToken: string, from: string): SmsSender {
  return {
    name: 'twilio',
    async send({ to, text }) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: text }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`SMS provider responded ${res.status}`);
    },
  };
}

// https://docs.msg91.com/reference/send-otp — the DLT-approved template holds
// the wording; MSG91 fills {#var#}/##OTP## with the code we pass.
export function createMsg91SmsSender(authKey: string, templateId: string): SmsSender {
  return {
    name: 'msg91',
    async send({ to, code }) {
      if (!code) throw new Error('MSG91 sender needs the code as a template variable');
      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: { authkey: authKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, mobile: to.replace(/^\+/, ''), otp: code, otp_length: code.length }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`SMS provider responded ${res.status}`);
      const body = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
      if (body?.type === 'error') throw new Error(`SMS provider refused: ${body.message ?? 'unknown'}`);
    },
  };
}

// Local development only: prints the SMS (code included) to the API log.
export function createConsoleSmsSender(): SmsSender {
  return {
    name: 'console',
    async send({ to, text }) {
      console.log(`[dev-sms] to=${to}\n${text}`);
    },
  };
}
