CREATE TYPE "PreScreenSessionReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "PreScreenSessionReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "PreScreenSessionReportStatus" NOT NULL DEFAULT 'PENDING',
    "promptVersion" TEXT,
    "fileUri" TEXT,
    "reportJson" JSONB,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreScreenSessionReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreScreenSessionReport_sessionId_key" ON "PreScreenSessionReport"("sessionId");
CREATE INDEX "PreScreenSessionReport_status_idx" ON "PreScreenSessionReport"("status");

ALTER TABLE "PreScreenSessionReport"
ADD CONSTRAINT "PreScreenSessionReport_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "PreScreenSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
