-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('JOB_NOTIFICATION', 'RESULT', 'ADMIT_CARD', 'ANSWER_KEY', 'SYLLABUS', 'ADMISSION', 'SCHOLARSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'EXTRACTED', 'CLASSIFIED', 'AI_PROCESSING', 'VALIDATION_FAILED', 'READY_FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'APPROVE', 'REJECT', 'UPLOAD', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_JOB', 'NEW_RESULT', 'NEW_ADMIT_CARD', 'NEW_ANSWER_KEY', 'NEW_EXAM_NOTIFICATION', 'ANSWER_KEY_RELEASED', 'EXAM_DATE_CHANGED', 'DEADLINE_UPDATE', 'APPLICATION_DEADLINE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WEBSITE', 'EMAIL', 'PUSH', 'TELEGRAM', 'WHATSAPP', 'ANDROID');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stateId" TEXT,
    "examDate" TIMESTAMP(3),
    "applicationStartDate" TIMESTAMP(3),
    "applicationEndDate" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_tags" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "exam_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "advertisementNumber" TEXT,
    "vacancies" INTEGER,
    "qualification" TEXT,
    "ageLimitMin" INTEGER,
    "ageLimitMax" INTEGER,
    "applicationFee" DECIMAL(10,2),
    "applicationFeeByCategory" JSONB,
    "notificationDocumentId" TEXT,
    "officialWebsite" TEXT,
    "applyUrl" TEXT,
    "eligibility" TEXT,
    "selectionProcess" JSONB,
    "examPattern" JSONB,
    "salary" TEXT,
    "applicationEndDate" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[],

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "resultDate" TIMESTAMP(3),
    "resultUrl" TEXT,
    "officialWebsite" TEXT,
    "relatedAdmitCardId" TEXT,
    "relatedAnswerKeyId" TEXT,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admit_cards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "examDate" TIMESTAMP(3),
    "downloadUrl" TEXT,
    "officialWebsite" TEXT,
    "instructions" TEXT,

    CONSTRAINT "admit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_keys" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "answerKeyDate" TIMESTAMP(3),
    "answerKeyUrl" TEXT,
    "objectionDeadline" TIMESTAMP(3),
    "objectionInfo" TEXT,

    CONSTRAINT "answer_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabi" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "examId" TEXT NOT NULL,

    CONSTRAINT "syllabi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_papers" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "syllabus_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_subjects" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "syllabus_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_topics" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtopics" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "syllabus_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "organizationId" TEXT,
    "categoryId" TEXT,
    "stateId" TEXT,
    "applicationStartDate" TIMESTAMP(3),
    "applicationEndDate" TIMESTAMP(3),
    "eligibility" TEXT,
    "officialWebsite" TEXT,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "organizationId" TEXT,
    "stateId" TEXT,
    "applicationEndDate" TIMESTAMP(3),
    "eligibility" TEXT,
    "amount" TEXT,
    "officialWebsite" TEXT,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "coverImageUrl" TEXT,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "important_links" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "examId" TEXT,
    "jobId" TEXT,

    CONSTRAINT "important_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "related_content" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "contentType" TEXT,
    "contentId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "examId" TEXT,
    "organizationId" TEXT,
    "storageUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "checksum" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_jobs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'UPLOADED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "aiModel" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_results" (
    "id" TEXT NOT NULL,
    "extractionJobId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "value" JSONB,
    "sourcePage" INTEGER,
    "confidence" DOUBLE PRECISION,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "conflictsWith" JSONB,

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_overrides" (
    "id" TEXT NOT NULL,
    "extractionResultId" TEXT NOT NULL,
    "aiValue" JSONB,
    "humanValue" JSONB NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeSummary" TEXT,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_slug_key" ON "states"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");

-- CreateIndex
CREATE INDEX "exams_organizationId_idx" ON "exams"("organizationId");

-- CreateIndex
CREATE INDEX "exams_categoryId_idx" ON "exams"("categoryId");

-- CreateIndex
CREATE INDEX "exams_stateId_idx" ON "exams"("stateId");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE INDEX "exams_publishedAt_idx" ON "exams"("publishedAt");

-- CreateIndex
CREATE INDEX "exams_applicationEndDate_idx" ON "exams"("applicationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "exam_tags_examId_tagId_key" ON "exam_tags"("examId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_examId_idx" ON "jobs"("examId");

-- CreateIndex
CREATE INDEX "jobs_organizationId_idx" ON "jobs"("organizationId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_publishedAt_idx" ON "jobs"("publishedAt");

-- CreateIndex
CREATE INDEX "jobs_applicationEndDate_idx" ON "jobs"("applicationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "results_slug_key" ON "results"("slug");

-- CreateIndex
CREATE INDEX "results_examId_idx" ON "results"("examId");

-- CreateIndex
CREATE INDEX "results_status_idx" ON "results"("status");

-- CreateIndex
CREATE INDEX "results_publishedAt_idx" ON "results"("publishedAt");

-- CreateIndex
CREATE INDEX "results_resultDate_idx" ON "results"("resultDate");

-- CreateIndex
CREATE UNIQUE INDEX "admit_cards_slug_key" ON "admit_cards"("slug");

-- CreateIndex
CREATE INDEX "admit_cards_examId_idx" ON "admit_cards"("examId");

-- CreateIndex
CREATE INDEX "admit_cards_status_idx" ON "admit_cards"("status");

-- CreateIndex
CREATE INDEX "admit_cards_publishedAt_idx" ON "admit_cards"("publishedAt");

-- CreateIndex
CREATE INDEX "admit_cards_examDate_idx" ON "admit_cards"("examDate");

-- CreateIndex
CREATE UNIQUE INDEX "answer_keys_slug_key" ON "answer_keys"("slug");

-- CreateIndex
CREATE INDEX "answer_keys_examId_idx" ON "answer_keys"("examId");

-- CreateIndex
CREATE INDEX "answer_keys_status_idx" ON "answer_keys"("status");

-- CreateIndex
CREATE INDEX "answer_keys_publishedAt_idx" ON "answer_keys"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "syllabi_slug_key" ON "syllabi"("slug");

-- CreateIndex
CREATE INDEX "syllabi_examId_idx" ON "syllabi"("examId");

-- CreateIndex
CREATE INDEX "syllabi_status_idx" ON "syllabi"("status");

-- CreateIndex
CREATE INDEX "syllabi_publishedAt_idx" ON "syllabi"("publishedAt");

-- CreateIndex
CREATE INDEX "syllabus_papers_syllabusId_idx" ON "syllabus_papers"("syllabusId");

-- CreateIndex
CREATE INDEX "syllabus_subjects_paperId_idx" ON "syllabus_subjects"("paperId");

-- CreateIndex
CREATE INDEX "syllabus_topics_subjectId_idx" ON "syllabus_topics"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_slug_key" ON "admissions"("slug");

-- CreateIndex
CREATE INDEX "admissions_organizationId_idx" ON "admissions"("organizationId");

-- CreateIndex
CREATE INDEX "admissions_categoryId_idx" ON "admissions"("categoryId");

-- CreateIndex
CREATE INDEX "admissions_stateId_idx" ON "admissions"("stateId");

-- CreateIndex
CREATE INDEX "admissions_status_idx" ON "admissions"("status");

-- CreateIndex
CREATE INDEX "admissions_publishedAt_idx" ON "admissions"("publishedAt");

-- CreateIndex
CREATE INDEX "admissions_applicationEndDate_idx" ON "admissions"("applicationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_slug_key" ON "scholarships"("slug");

-- CreateIndex
CREATE INDEX "scholarships_organizationId_idx" ON "scholarships"("organizationId");

-- CreateIndex
CREATE INDEX "scholarships_stateId_idx" ON "scholarships"("stateId");

-- CreateIndex
CREATE INDEX "scholarships_status_idx" ON "scholarships"("status");

-- CreateIndex
CREATE INDEX "scholarships_publishedAt_idx" ON "scholarships"("publishedAt");

-- CreateIndex
CREATE INDEX "scholarships_applicationEndDate_idx" ON "scholarships"("applicationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_publishedAt_idx" ON "articles"("publishedAt");

-- CreateIndex
CREATE INDEX "important_links_examId_idx" ON "important_links"("examId");

-- CreateIndex
CREATE INDEX "important_links_jobId_idx" ON "important_links"("jobId");

-- CreateIndex
CREATE INDEX "related_content_sourceType_sourceId_idx" ON "related_content"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "related_content_sourceType_sourceId_targetType_targetId_key" ON "related_content"("sourceType", "sourceId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_status_idx" ON "notification_deliveries"("channel", "status");

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "audit_logs_contentType_contentId_idx" ON "audit_logs"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "documents_examId_idx" ON "documents"("examId");

-- CreateIndex
CREATE INDEX "documents_organizationId_idx" ON "documents"("organizationId");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "extraction_jobs_status_idx" ON "extraction_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_jobs_documentId_attempt_key" ON "extraction_jobs"("documentId", "attempt");

-- CreateIndex
CREATE INDEX "extraction_results_extractionJobId_idx" ON "extraction_results"("extractionJobId");

-- CreateIndex
CREATE INDEX "field_overrides_extractionResultId_idx" ON "field_overrides"("extractionResultId");

-- CreateIndex
CREATE INDEX "content_versions_contentType_contentId_idx" ON "content_versions"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_contentType_contentId_versionNumber_key" ON "content_versions"("contentType", "contentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tags" ADD CONSTRAINT "exam_tags_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tags" ADD CONSTRAINT "exam_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_notificationDocumentId_fkey" FOREIGN KEY ("notificationDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_relatedAdmitCardId_fkey" FOREIGN KEY ("relatedAdmitCardId") REFERENCES "admit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_relatedAnswerKeyId_fkey" FOREIGN KEY ("relatedAnswerKeyId") REFERENCES "answer_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admit_cards" ADD CONSTRAINT "admit_cards_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_keys" ADD CONSTRAINT "answer_keys_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_papers" ADD CONSTRAINT "syllabus_papers_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "syllabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_subjects" ADD CONSTRAINT "syllabus_subjects_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "syllabus_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "syllabus_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "important_links" ADD CONSTRAINT "important_links_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "important_links" ADD CONSTRAINT "important_links_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_extractionJobId_fkey" FOREIGN KEY ("extractionJobId") REFERENCES "extraction_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_overrides" ADD CONSTRAINT "field_overrides_extractionResultId_fkey" FOREIGN KEY ("extractionResultId") REFERENCES "extraction_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
