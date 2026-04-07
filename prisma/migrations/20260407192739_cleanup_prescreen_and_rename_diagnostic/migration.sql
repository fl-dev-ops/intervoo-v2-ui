/*
  Warnings:

  - You are about to drop the `PreScreenQuestionnaireDraft` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PreScreenSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PreScreenSessionReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PreScreenSession" DROP CONSTRAINT "PreScreenSession_draftId_fkey";

-- DropForeignKey
ALTER TABLE "PreScreenSessionReport" DROP CONSTRAINT "PreScreenSessionReport_sessionId_fkey";

-- AlterTable
ALTER TABLE "pre_diagnostic_session" RENAME CONSTRAINT "DiagnosticSession_pkey" TO "pre_diagnostic_session_pkey";

-- AlterTable
ALTER TABLE "pre_diagnostic_session_report" RENAME CONSTRAINT "DiagnosticSessionReport_pkey" TO "pre_diagnostic_session_report_pkey";

-- DropTable
DROP TABLE "PreScreenQuestionnaireDraft";

-- DropTable
DROP TABLE "PreScreenSession";

-- DropTable
DROP TABLE "PreScreenSessionReport";

-- RenameForeignKey
ALTER TABLE "pre_diagnostic_session" RENAME CONSTRAINT "DiagnosticSession_userId_fkey" TO "pre_diagnostic_session_userId_fkey";

-- RenameForeignKey
ALTER TABLE "pre_diagnostic_session_report" RENAME CONSTRAINT "DiagnosticSessionReport_sessionId_fkey" TO "pre_diagnostic_session_report_sessionId_fkey";

-- RenameIndex
ALTER INDEX "DiagnosticSession_egressId_idx" RENAME TO "pre_diagnostic_session_egressId_idx";

-- RenameIndex
ALTER INDEX "DiagnosticSession_roomName_key" RENAME TO "pre_diagnostic_session_roomName_key";

-- RenameIndex
ALTER INDEX "DiagnosticSession_startedAt_idx" RENAME TO "pre_diagnostic_session_startedAt_idx";

-- RenameIndex
ALTER INDEX "DiagnosticSession_status_idx" RENAME TO "pre_diagnostic_session_status_idx";

-- RenameIndex
ALTER INDEX "DiagnosticSession_userId_idx" RENAME TO "pre_diagnostic_session_userId_idx";

-- RenameIndex
ALTER INDEX "DiagnosticSessionReport_sessionId_key" RENAME TO "pre_diagnostic_session_report_sessionId_key";

-- RenameIndex
ALTER INDEX "DiagnosticSessionReport_status_idx" RENAME TO "pre_diagnostic_session_report_status_idx";
