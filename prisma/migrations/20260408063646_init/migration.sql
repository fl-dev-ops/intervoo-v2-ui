-- CreateEnum
CREATE TYPE "PreDiagnosticSessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'REPORT_READY');

-- CreateEnum
CREATE TYPE "PreDiagnosticSessionReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL DEFAULT '',
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "yearOfStudy" TEXT NOT NULL,
    "placementPreparation" TEXT NOT NULL DEFAULT '',
    "academySelection" TEXT NOT NULL DEFAULT '',
    "academyName" TEXT NOT NULL DEFAULT '',
    "nativeLanguage" TEXT NOT NULL DEFAULT '',
    "englishLevel" TEXT NOT NULL DEFAULT '',
    "speakingSpeed" TEXT NOT NULL DEFAULT '',
    "coach" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "pre_diagnostic_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PreDiagnosticSessionStatus" NOT NULL DEFAULT 'STARTED',
    "roomName" TEXT NOT NULL,
    "egressId" TEXT,
    "videoUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "transcript" JSONB,
    "sessionMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_diagnostic_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_diagnostic_session_report" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "PreDiagnosticSessionReportStatus" NOT NULL DEFAULT 'PENDING',
    "promptVersion" TEXT,
    "fileUri" TEXT,
    "reportJson" JSONB,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_diagnostic_session_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profile_userId_key" ON "profile"("userId");

-- CreateIndex
CREATE INDEX "profile_userId_idx" ON "profile"("userId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "pre_diagnostic_session_roomName_key" ON "pre_diagnostic_session"("roomName");

-- CreateIndex
CREATE INDEX "pre_diagnostic_session_userId_idx" ON "pre_diagnostic_session"("userId");

-- CreateIndex
CREATE INDEX "pre_diagnostic_session_status_idx" ON "pre_diagnostic_session"("status");

-- CreateIndex
CREATE INDEX "pre_diagnostic_session_startedAt_idx" ON "pre_diagnostic_session"("startedAt");

-- CreateIndex
CREATE INDEX "pre_diagnostic_session_egressId_idx" ON "pre_diagnostic_session"("egressId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_diagnostic_session_report_sessionId_key" ON "pre_diagnostic_session_report"("sessionId");

-- CreateIndex
CREATE INDEX "pre_diagnostic_session_report_status_idx" ON "pre_diagnostic_session_report"("status");

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_diagnostic_session" ADD CONSTRAINT "pre_diagnostic_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_diagnostic_session_report" ADD CONSTRAINT "pre_diagnostic_session_report_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pre_diagnostic_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
