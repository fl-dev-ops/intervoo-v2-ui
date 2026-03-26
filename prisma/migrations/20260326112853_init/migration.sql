-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PreScreenQuestionnaireDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "currentStep" TEXT NOT NULL DEFAULT 'intro',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "questionSetKey" TEXT NOT NULL DEFAULT 'pre-screen-v1',
    "answers" JSONB NOT NULL,
    "latestAgentContext" JSONB,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PreScreenSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "roomName" TEXT,
    "agentType" TEXT NOT NULL,
    "egressId" TEXT,
    "audioUrl" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "transcript" JSONB,
    "transcriptSummary" JSONB,
    "sessionMetadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreScreenSession_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PreScreenQuestionnaireDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
