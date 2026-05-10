/*
  Warnings:

  - You are about to drop the column `prompt` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `promptVersion` on the `report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "report" DROP COLUMN "prompt",
DROP COLUMN "promptVersion",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);
