// Transactional email. Resend's HTTP API keeps this dependency-free; swap the
// implementation for SMTP/SES/Postmark if you prefer — only `send` matters.
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export function createResendMailer(apiKey: string, from: string): Mailer {
  return {
    async send({ to, subject, text }) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
    },
  };
}

// Local development only: prints emails to the API log instead of sending.
export function createConsoleMailer(): Mailer {
  return {
    async send({ to, subject, text }) {
      console.log(`[dev-mail] to=${to} subject="${subject}"\n${text}`);
    },
  };
}
