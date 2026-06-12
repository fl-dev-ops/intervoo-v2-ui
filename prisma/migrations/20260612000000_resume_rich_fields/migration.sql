-- AlterTable
ALTER TABLE "resume" ADD COLUMN     "skillGlosses" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "projectKeywords" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "projectCapabilities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "workInitiatives" JSONB NOT NULL DEFAULT '[]';
