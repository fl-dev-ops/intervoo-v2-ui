-- AlterTable
ALTER TABLE "report" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "report_shareToken_key" ON "report"("shareToken");

-- AlterTable
ALTER TABLE "diagnostic" ADD COLUMN     "finalReportShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_finalReportShareToken_key" ON "diagnostic"("finalReportShareToken");
