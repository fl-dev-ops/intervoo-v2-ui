-- DropPreScreen tables (order matters due to foreign keys)
DROP TABLE IF EXISTS "pre_screen_session_report" CASCADE;
DROP TABLE IF EXISTS "pre_screen_session" CASCADE;
DROP TABLE IF EXISTS "pre_screen_questionnaire_draft" CASCADE;

-- Drop PreScreen enums
DROP TYPE IF EXISTS "PreScreenSessionStatus" CASCADE;
DROP TYPE IF EXISTS "PreScreenSessionReportStatus" CASCADE;

-- Rename Diagnostic tables to PreDiagnostic
ALTER TABLE "DiagnosticSession" RENAME TO "pre_diagnostic_session";
ALTER TABLE "DiagnosticSessionReport" RENAME TO "pre_diagnostic_session_report";

-- Rename Diagnostic enums to PreDiagnostic
ALTER TYPE "DiagnosticSessionStatus" RENAME TO "PreDiagnosticSessionStatus";
ALTER TYPE "DiagnosticSessionReportStatus" RENAME TO "PreDiagnosticSessionReportStatus";
