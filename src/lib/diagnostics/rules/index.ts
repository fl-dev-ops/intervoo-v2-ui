export const DIAGNOSTIC_TOTAL_ROUNDS = 4;
export const DIAGNOSTIC_COMPLETED_SESSION_STATUSES = ["COMPLETED"] as const;

export const DIAGNOSTIC_SESSION_STUCK_MINUTES = 15;

type RoundStatus = string | null | undefined;
type ReportStatus = string | null | undefined;

export type DiagnosticRoundStateInput = {
  roundType: string;
  status: RoundStatus;
  startedAt?: string | Date | null;
  reportStatus?: ReportStatus;
  reportStartedAt?: string | Date | null;
};

export type DiagnosticRoundWithReportInput = {
  status: RoundStatus;
  startedAt?: string | Date | null;
  reportStatus?: ReportStatus;
  reportStartedAt?: string | Date | null;
  reportJson?: unknown;
  metadata?: unknown;
  session?: {
    startedAt?: string | Date | null;
    report?: {
      status?: ReportStatus;
      startedAt?: string | Date | null;
      reportJson?: unknown;
      metadata?: unknown;
    } | null;
  } | null;
};

export function shouldShowDiagnosticBandSelection(
  diagnostic: { selectedBand?: string | null } | null | undefined,
) {
  return !diagnostic?.selectedBand;
}

export function shouldShowJobSelection(
  diagnostic: { selectedJob?: unknown } | null | undefined,
) {
  return !diagnostic?.selectedJob;
}

export function hasDiagnosticRoundReportRecord<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[]) {
  return rounds.length > 0;
}

export function hasCompletedDiagnosticRoundReport<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[]) {
  return hasDiagnosticRoundReportRecord(rounds);
}

export function isDiagnosticBandLocked<
  Diagnostic extends
    | {
        selectedBand?: string | null;
        rounds?: DiagnosticRoundWithReportInput[];
      }
    | null
    | undefined,
>(diagnostic: Diagnostic) {
  return Boolean(
    diagnostic?.selectedBand &&
      hasCompletedDiagnosticRoundReport(diagnostic.rounds ?? []),
  );
}

export function canChangeDiagnosticBand<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[]) {
  return !hasCompletedDiagnosticRoundReport(rounds);
}

export function isDiagnosticSessionComplete(status: RoundStatus) {
  return DIAGNOSTIC_COMPLETED_SESSION_STATUSES.includes(
    status as (typeof DIAGNOSTIC_COMPLETED_SESSION_STATUSES)[number],
  );
}

export function isDiagnosticReportReady(status: ReportStatus) {
  return status === "READY";
}

function getHydratedReportFromMetadata(metadata: unknown): unknown {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return (metadata as Record<string, unknown>).hydratedReport ?? null;
  }
  return null;
}

export function hasUsableDiagnosticReportJson(reportJson: unknown) {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return false;
  }
  const obj = reportJson as Record<string, unknown>;
  const assessment = obj.assessment_result as
    | Record<string, unknown>
    | undefined;
  if (!assessment) return false;

  // New website-style base report has question_responses
  if (Array.isArray(assessment.question_responses)) {
    return true;
  }

  // Old hydrated report has total_score (no backward compat needed, but kept for safety)
  if (typeof assessment.total_score === "number") {
    return true;
  }

  return false;
}

export function isDiagnosticRoundReadyForProgression<
  Round extends DiagnosticRoundWithReportInput,
>(round: Round | undefined) {
  if (!round) return false;

  const reportStatus = getRoundReportStatus(round);
  const reportJson = getRoundReportJson(round);
  const metadata = getRoundMetadata(round);
  const hydrated = getHydratedReportFromMetadata(metadata);

  return (
    isDiagnosticSessionComplete(round.status) &&
    isDiagnosticReportReady(reportStatus) &&
    (Boolean(hydrated) || hasUsableDiagnosticReportJson(reportJson))
  );
}

export function isDiagnosticRoundReportProcessing<
  Round extends DiagnosticRoundWithReportInput,
>(round: Round | undefined) {
  if (!round || !isDiagnosticSessionComplete(round.status)) return false;

  const reportStatus = getRoundReportStatus(round);

  return reportStatus === "PROCESSING";
}

export function countProgressableDiagnosticRounds<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[]) {
  return rounds.filter((round) => isDiagnosticRoundReadyForProgression(round))
    .length;
}

export function areAllDiagnosticRoundsComplete<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[], totalRounds = DIAGNOSTIC_TOTAL_ROUNDS) {
  return countProgressableDiagnosticRounds(rounds) === totalRounds;
}

export function isFinalDiagnosticReportReady<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[], totalRounds = DIAGNOSTIC_TOTAL_ROUNDS) {
  return (
    countProgressableDiagnosticRounds(rounds) === totalRounds &&
    rounds.every((round) => isDiagnosticRoundReadyForProgression(round))
  );
}

export function canStartDiagnosticRound(
  round: DiagnosticRoundStateInput | undefined,
  nowMs = Date.now(),
) {
  return !round || getDiagnosticRoundRecoveryState(round, nowMs).isRecoverable;
}

export function isDiagnosticRoundStuckOrFailed(
  round: DiagnosticRoundStateInput | undefined,
  nowMs = Date.now(),
) {
  const state = getDiagnosticRoundRecoveryState(round, nowMs);
  return state.isRecoverable;
}

export function getDiagnosticRoundRecoveryState(
  round: DiagnosticRoundStateInput | undefined,
  nowMs = Date.now(),
) {
  if (!round) {
    return {
      isRecoverable: false,
      isReportFailed: false,
      isReportStuck: false,
      isSessionStuck: false,
    };
  }

  const isSessionStuck =
    round.status === "STARTED" &&
    Boolean(round.startedAt) &&
    nowMs - new Date(round.startedAt as string | Date).getTime() >
      DIAGNOSTIC_SESSION_STUCK_MINUTES * 60 * 1000;

  const isReportFailed = round.reportStatus === "FAILED";
  const isReportMissing = !round.reportStatus || round.reportStatus === "PENDING";
  const isReportStuck =
    round.reportStatus === "PROCESSING" &&
    Boolean(round.reportStartedAt) &&
    nowMs - new Date(round.reportStartedAt as string | Date).getTime() >
      DIAGNOSTIC_SESSION_STUCK_MINUTES * 60 * 1000;

  return {
    isRecoverable:
      isSessionStuck || isReportFailed || isReportMissing || isReportStuck,
    isReportFailed,
    isReportStuck,
    isSessionStuck,
  };
}

function getRoundReportStatus(round: DiagnosticRoundWithReportInput) {
  return round.reportStatus ?? round.session?.report?.status ?? null;
}

function getRoundReportJson(round: DiagnosticRoundWithReportInput) {
  return round.reportJson ?? round.session?.report?.reportJson ?? null;
}

function getRoundMetadata(round: DiagnosticRoundWithReportInput) {
  return round.metadata ?? round.session?.report?.metadata ?? null;
}
