-- CreateTable
CREATE TABLE "alert_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recruitmentId" TEXT,
    "organizationId" TEXT,
    "categoryId" TEXT,
    "stateId" TEXT,
    "keyword" TEXT,
    "noticeTypes" "NoticeType"[],
    "minPriority" "NoticePriority" NOT NULL DEFAULT 'LOW',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "verifiedAt" TIMESTAMP(3),
    "verifyToken" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "notificationId" TEXT,
    "recruitmentNoticeId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "alert_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_verifyToken_key" ON "alert_subscriptions"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_unsubscribeToken_key" ON "alert_subscriptions"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "alert_subscriptions_email_idx" ON "alert_subscriptions"("email");

-- CreateIndex
CREATE INDEX "alert_subscriptions_active_verifiedAt_idx" ON "alert_subscriptions"("active", "verifiedAt");

-- CreateIndex
CREATE INDEX "alert_subscriptions_recruitmentId_idx" ON "alert_subscriptions"("recruitmentId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_organizationId_idx" ON "alert_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_categoryId_idx" ON "alert_subscriptions"("categoryId");

-- CreateIndex
CREATE INDEX "alert_deliveries_status_createdAt_idx" ON "alert_deliveries"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "alert_deliveries_subscriptionId_recruitmentNoticeId_key" ON "alert_deliveries"("subscriptionId", "recruitmentNoticeId");

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "recruitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "alert_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_recruitmentNoticeId_fkey" FOREIGN KEY ("recruitmentNoticeId") REFERENCES "recruitment_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
