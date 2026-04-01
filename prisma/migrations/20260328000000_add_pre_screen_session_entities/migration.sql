-- CreateEnum
CREATE TYPE "PreScreenSessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'REPORT_READY');

-- CreateTable
CREATE TABLE "PreScreenQuestionnaireDraft" (
    "id" TEXT NOT NULL,
    "status" "PreScreenSessionStatus" NOT NULL DEFAULT 'STARTED',
    "currentStep" TEXT NOT NULL DEFAULT 'intro',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "questionSetKey" TEXT NOT NULL DEFAULT 'pre-screen-v1',
    "answers" JSONB NOT NULL,
    "latestAgentContext" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreScreenQuestionnaireDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreScreenSession" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "status" "PreScreenSessionStatus" NOT NULL DEFAULT 'STARTED',
    "roomName" TEXT,
    "agentType" TEXT NOT NULL,
    "egressId" TEXT,
    "audioUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "transcript" JSONB,
    "transcriptSummary" JSONB,
    "sessionMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreScreenSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreScreenQuestionnaireDraft_status_idx" ON "PreScreenQuestionnaireDraft"("status");

-- CreateIndex
CREATE INDEX "PreScreenQuestionnaireDraft_updatedAt_idx" ON "PreScreenQuestionnaireDraft"("updatedAt");

-- CreateIndex
CREATE INDEX "PreScreenQuestionnaireDraft_questionSetKey_schemaVersion_idx" ON "PreScreenQuestionnaireDraft"("questionSetKey", "schemaVersion");

-- CreateIndex
CREATE UNIQUE INDEX "PreScreenSession_draftId_key" ON "PreScreenSession"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "PreScreenSession_roomName_key" ON "PreScreenSession"("roomName");

-- CreateIndex
CREATE INDEX "PreScreenSession_status_idx" ON "PreScreenSession"("status");

-- CreateIndex
CREATE INDEX "PreScreenSession_startedAt_idx" ON "PreScreenSession"("startedAt");

-- CreateIndex
CREATE INDEX "PreScreenSession_egressId_idx" ON "PreScreenSession"("egressId");

-- AddForeignKey
ALTER TABLE "PreScreenSession" ADD CONSTRAINT "PreScreenSession_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PreScreenQuestionnaireDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
