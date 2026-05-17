-- Normalize legacy session/round statuses before removing REPORT_READY from the enum.
UPDATE "interview_session" SET "status" = 'COMPLETED' WHERE "status" = 'REPORT_READY';
UPDATE "diagnostic_round" SET "status" = 'COMPLETED' WHERE "status" = 'REPORT_READY';

ALTER TABLE "interview_session" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "interview_session" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

DROP TYPE "InterviewSessionStatus";
CREATE TYPE "InterviewSessionStatus" AS ENUM ('STARTED', 'COMPLETED');

ALTER TABLE "interview_session" ALTER COLUMN "status" TYPE "InterviewSessionStatus" USING "status"::"InterviewSessionStatus";
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" TYPE "InterviewSessionStatus" USING "status"::"InterviewSessionStatus";

ALTER TABLE "interview_session" ALTER COLUMN "status" SET DEFAULT 'STARTED';
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" SET DEFAULT 'STARTED';
