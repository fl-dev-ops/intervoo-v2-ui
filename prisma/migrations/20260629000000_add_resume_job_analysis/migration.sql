-- CreateTable
CREATE TABLE "resume_job_analysis" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_job_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_job_analysis_resumeId_jobId_inputHash_key" ON "resume_job_analysis"("resumeId", "jobId", "inputHash");

-- AddForeignKey
ALTER TABLE "resume_job_analysis" ADD CONSTRAINT "resume_job_analysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
