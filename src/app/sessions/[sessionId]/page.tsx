import { redirect } from "next/navigation";
import { ProctoredDiagnosticsSession } from "@/components/diagnostics/proctored-diagnostics-session";
import { prisma } from "@/lib/db";
import { DEFAULT_PROCTORING_CONFIG } from "@/lib/proctor/default-config";
import type { ProctorConfig } from "@/lib/proctor/types";
import { requirePageStage } from "@/lib/stage-guards";

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    room_name?: string;
    round_id?: string;
    job_id?: string;
    job_title?: string;
    companies?: string;
    salary?: string;
    coach?: string;
  }>;
};

export default async function SessionPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const {
    round_id: roundId,
    job_id: jobId,
    job_title: jobTitle,
    companies,
    coach,
  } = await searchParams;

  const { user } = await requirePageStage(["DIAGNOSTICS", "COMPLETED"]);

  const interviewSession = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { metadata: true, userId: true },
  });

  if (!interviewSession || interviewSession.userId !== user.id) {
    redirect("/jobs");
  }

  const proctorConfig = getProctorConfig(interviewSession.metadata);

  return (
    <ProctoredDiagnosticsSession
      coach={coach}
      companies={companies?.split(",") ?? []}
      config={proctorConfig}
      jobId={jobId}
      jobTitle={jobTitle}
      roundId={roundId}
      sessionId={sessionId}
      userName={user.name ?? null}
    />
  );
}

function getProctorConfig(metadata: unknown): ProctorConfig {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return DEFAULT_PROCTORING_CONFIG;
  }

  const proctoring = (metadata as Record<string, unknown>).proctoring;
  if (
    !proctoring ||
    typeof proctoring !== "object" ||
    Array.isArray(proctoring)
  ) {
    return DEFAULT_PROCTORING_CONFIG;
  }

  const config = (proctoring as Record<string, unknown>).config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return DEFAULT_PROCTORING_CONFIG;
  }

  return config as ProctorConfig;
}
