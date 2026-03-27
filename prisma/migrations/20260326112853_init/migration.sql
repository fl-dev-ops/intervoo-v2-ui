-- CreateEnum
CREATE TYPE "PreScreenSessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'REPORT_READY');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

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
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreScreenSession" ADD CONSTRAINT "PreScreenSession_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PreScreenQuestionnaireDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
