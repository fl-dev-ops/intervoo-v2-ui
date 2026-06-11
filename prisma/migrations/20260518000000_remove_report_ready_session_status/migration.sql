-- First drop the default values
ALTER TABLE "interview_session" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" DROP DEFAULT;

-- Convert columns to TEXT to avoid enum constraint issues
ALTER TABLE "interview_session" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- Now normalize legacy statuses
UPDATE "interview_session" SET "status" = 'COMPLETED' WHERE "status" = 'REPORT_READY';
UPDATE "diagnostic_round" SET "status" = 'COMPLETED' WHERE "status" = 'REPORT_READY';

-- Drop and recreate the enum
DROP TYPE "InterviewSessionStatus";
CREATE TYPE "InterviewSessionStatus" AS ENUM ('STARTED', 'COMPLETED');

-- Convert columns back to enum type
ALTER TABLE "interview_session" ALTER COLUMN "status" TYPE "InterviewSessionStatus" USING "status"::"InterviewSessionStatus";
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" TYPE "InterviewSessionStatus" USING "status"::"InterviewSessionStatus";

-- Set defaults
ALTER TABLE "interview_session" ALTER COLUMN "status" SET DEFAULT 'STARTED';
ALTER TABLE "diagnostic_round" ALTER COLUMN "status" SET DEFAULT 'STARTED';
