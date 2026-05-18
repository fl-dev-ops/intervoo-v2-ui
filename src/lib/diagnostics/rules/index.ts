export const DIAGNOSTIC_TOTAL_ROUNDS = 4;
export const DIAGNOSTIC_SESSION_STUCK_MINUTES = 15;

export const DIAGNOSTIC_COMPLETED_SESSION_STATUSES = ["COMPLETED"] as const;

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
  session?: {
    startedAt?: string | Date | null;
    report?: {
      status?: ReportStatus;
      startedAt?: string | Date | null;
    } | null;
  } | null;
};

export function shouldShowDiagnosticBandSelection(
  diagnostic: { selectedBand?: string | null } | null | undefined,
) {
  return !diagnostic?.selectedBand;
}

export function hasCompletedDiagnosticRoundReport<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[]) {
  return rounds.some((round) => isDiagnosticRoundReadyForProgression(round));
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

export function isDiagnosticRoundReadyForProgression<
  Round extends DiagnosticRoundWithReportInput,
>(round: Round | undefined) {
  if (!round) return false;

  return (
    isDiagnosticSessionComplete(round.status) &&
    isDiagnosticReportReady(getRoundReportStatus(round))
  );
}

export function isDiagnosticRoundReportProcessing<
  Round extends DiagnosticRoundWithReportInput,
>(round: Round | undefined) {
  if (!round || !isDiagnosticSessionComplete(round.status)) return false;

  const reportStatus = getRoundReportStatus(round);

  return !isDiagnosticReportReady(reportStatus) && reportStatus !== "FAILED";
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

export function getActiveDiagnosticRoundNumber<
  Round extends DiagnosticRoundWithReportInput & { roundType: string },
>(rounds: Round[], roundOrder: string[]) {
  const firstIncompleteIndex = roundOrder.findIndex((roundType) => {
    const round = rounds.find((item) => item.roundType === roundType);
    return !round || !isDiagnosticRoundReadyForProgression(round);
  });

  return firstIncompleteIndex === -1
    ? roundOrder.length
    : firstIncompleteIndex + 1;
}

export function canStartDiagnosticRound({
  progressableRoundCount,
  requestedRoundNumber,
}: {
  progressableRoundCount: number;
  requestedRoundNumber: number;
}) {
  return requestedRoundNumber === progressableRoundCount + 1;
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

  return {
    isRecoverable: isSessionStuck || isReportFailed,
    isReportFailed,
    isReportStuck: false,
    isSessionStuck,
  };
}

function getRoundReportStatus(round: DiagnosticRoundWithReportInput) {
  return round.reportStatus ?? round.session?.report?.status ?? null;
}
