import { prisma } from "@/lib/db/client";
import { getChannelDispatcher } from "@/lib/notifications/dispatcher";
import type { NotificationChannel, NotificationType } from "@/generated/prisma/enums";

const PAGE_SIZE = 30;

// Every channel a notification fans out to by default. Only WEBSITE
// currently has a real dispatcher (see dispatcher.ts); the others are
// recorded as FAILED deliveries with an honest reason rather than
// silently skipped, so the fan-out table always reflects what a real
// provider would need to send once configured.
const ALL_CHANNELS: NotificationChannel[] = [
  "WEBSITE",
  "EMAIL",
  "PUSH",
  "TELEGRAM",
  "WHATSAPP",
  "ANDROID",
];

/**
 * Creates a Notification and fans it out to every channel (Section 28).
 * Called from each content type's publish transition — never from
 * arbitrary admin code — so "a notification exists" always means "some
 * content was actually published."
 */
export async function dispatchNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  targetType: string;
  targetId: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body,
      targetType: input.targetType,
      targetId: input.targetId,
    },
  });

  await Promise.all(
    ALL_CHANNELS.map(async (channel) => {
      const dispatcher = getChannelDispatcher(channel);
      const result = await dispatcher.send({ title: input.title, body: input.body });
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel,
          status: result.status,
          error: result.error,
          sentAt: result.status === "SENT" ? new Date() : null,
        },
      });
    }),
  );

  await prisma.notification.update({ where: { id: notification.id }, data: { sentAt: new Date() } });

  return notification;
}

export async function listNotificationsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { deliveries: true },
    }),
    prisma.notification.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

/** Public website notification feed (Section 28) — newest first, no PII. */
export async function listWebsiteNotifications(limit = 20) {
  return prisma.notification.findMany({
    where: { sentAt: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
