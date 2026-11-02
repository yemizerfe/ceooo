-- Inbound demo / call / email / chat requests captured by the public support pages.
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "companySize" TEXT,
    "subject" TEXT,
    "category" TEXT,
    "priority" TEXT,
    "message" TEXT,
    "meetingType" TEXT,
    "timezone" TEXT,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "source" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportRequest_reference_key" ON "SupportRequest"("reference");
CREATE INDEX "SupportRequest_type_idx" ON "SupportRequest"("type");
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");
CREATE INDEX "SupportRequest_email_idx" ON "SupportRequest"("email");
