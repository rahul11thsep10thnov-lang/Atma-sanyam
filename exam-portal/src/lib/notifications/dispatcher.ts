import type { NotificationChannel } from "@/generated/prisma/enums";

export interface DispatchResult {
  status: "SENT" | "FAILED";
  error?: string;
}

export interface ChannelDispatcher {
  send(input: { title: string; body: string }): Promise<DispatchResult>;
}

/// The website feed IS the Notification row — there's nothing external
/// to call, so it's always immediately "sent".
class WebsiteDispatcher implements ChannelDispatcher {
  async send(): Promise<DispatchResult> {
    return { status: "SENT" };
  }
}

/// EMAIL/PUSH/TELEGRAM/WHATSAPP/ANDROID all need a real provider (SMTP
/// credentials, an FCM/APNs key, a bot token…) that this environment
/// doesn't have configured. Rather than silently no-op or fake success,
/// every delivery on these channels is recorded as FAILED with an
/// honest reason, so the fan-out table never lies about what actually
/// went out. Swap in a real dispatcher per channel (e.g. one using
/// `@aws-sdk/client-sesv2` or Resend for EMAIL) by adding a case below
/// — nothing else in the notification pipeline needs to change.
class UnconfiguredDispatcher implements ChannelDispatcher {
  constructor(private readonly channel: NotificationChannel) {}
  async send(): Promise<DispatchResult> {
    return { status: "FAILED", error: `${this.channel} channel has no provider configured.` };
  }
}

export function getChannelDispatcher(channel: NotificationChannel): ChannelDispatcher {
  if (channel === "WEBSITE") return new WebsiteDispatcher();
  return new UnconfiguredDispatcher(channel);
}
