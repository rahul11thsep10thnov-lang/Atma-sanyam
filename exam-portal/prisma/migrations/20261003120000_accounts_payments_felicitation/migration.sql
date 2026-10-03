-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'RESET', 'FELICITATION');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('MEMBERSHIP', 'FELICITATION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "FelicitationStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID_PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'BROADCASTING', 'PAUSED', 'EXPIRED');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "examPatternUrl" TEXT,
ADD COLUMN     "importantDates" JSONB,
ADD COLUMN     "posts" JSONB,
ADD COLUMN     "syllabusUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "examsAimed" TEXT[],
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "membershipUntil" TIMESTAMP(3),
ADD COLUMN     "mobile" TEXT NOT NULL,
ADD COLUMN     "mobileVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "profileCompletedAt" TIMESTAMP(3),
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "smsAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "failureReason" TEXT,
    "userId" TEXT,
    "felicitationEntryId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "mobile" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "felicitation_entries" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "examName" TEXT NOT NULL,
    "examId" TEXT,
    "mobile" TEXT NOT NULL,
    "userId" TEXT,
    "identityLast4Enc" TEXT,
    "identityConsentAt" TIMESTAMP(3) NOT NULL,
    "identityPurgedAt" TIMESTAMP(3),
    "status" "FelicitationStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus",
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedReason" TEXT,
    "startAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedRemainingMs" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "felicitation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "felicitation_admin_actions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "FelicitationStatus",
    "toStatus" "FelicitationStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "felicitation_admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_codes_mobile_purpose_createdAt_idx" ON "otp_codes"("mobile", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "otp_codes_ip_createdAt_idx" ON "otp_codes"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentId_key" ON "payments"("paymentId");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_felicitationEntryId_idx" ON "payments"("felicitationEntryId");

-- CreateIndex
CREATE INDEX "sms_logs_createdAt_idx" ON "sms_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "felicitation_entries_refCode_key" ON "felicitation_entries"("refCode");

-- CreateIndex
CREATE INDEX "felicitation_entries_status_startAt_expiresAt_idx" ON "felicitation_entries"("status", "startAt", "expiresAt");

-- CreateIndex
CREATE INDEX "felicitation_entries_mobile_idx" ON "felicitation_entries"("mobile");

-- CreateIndex
CREATE INDEX "felicitation_entries_createdAt_idx" ON "felicitation_entries"("createdAt");

-- CreateIndex
CREATE INDEX "felicitation_admin_actions_entryId_createdAt_idx" ON "felicitation_admin_actions"("entryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "users_membershipUntil_idx" ON "users"("membershipUntil");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_felicitationEntryId_fkey" FOREIGN KEY ("felicitationEntryId") REFERENCES "felicitation_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "felicitation_entries" ADD CONSTRAINT "felicitation_entries_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "felicitation_entries" ADD CONSTRAINT "felicitation_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "felicitation_admin_actions" ADD CONSTRAINT "felicitation_admin_actions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "felicitation_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

