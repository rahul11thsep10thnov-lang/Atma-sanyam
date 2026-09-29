-- CreateTable
CREATE TABLE "content_view_events" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerHost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_view_events_contentType_contentId_idx" ON "content_view_events"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "content_view_events_createdAt_idx" ON "content_view_events"("createdAt");
