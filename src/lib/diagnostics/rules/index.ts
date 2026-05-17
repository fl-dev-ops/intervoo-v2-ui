export const DIAGNOSTIC_TOTAL_ROUNDS = 4;
export const DIAGNOSTIC_SESSION_STUCK_MINUTES = 10;
export const DIAGNOSTIC_REPORT_STUCK_MINUTES = 15;

export const DIAGNOSTIC_COMPLETED_SESSION_STATUSES = ["COMPLETED"] as const;

export const DIAGNOSTIC_ACTIVE_REPORT_STATUSES = [
  "PENDING",
  "PROCESSING",
] as const;

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
  session?: {
    report?: {
      status?: ReportStatus;
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
  return rounds.some(
    (round) =>
      isDiagnosticSessionComplete(round.status) &&
      isDiagnosticReportReady(round.session?.report?.status),
  );
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

export function isDiagnosticReportActive(status: ReportStatus) {
  return DIAGNOSTIC_ACTIVE_REPORT_STATUSES.includes(
    status as (typeof DIAGNOSTIC_ACTIVE_REPORT_STATUSES)[number],
  );
}

export function countCompletedDiagnosticRounds<
  Round extends { status: RoundStatus },
>(rounds: Round[]) {
  return rounds.filter((round) => isDiagnosticSessionComplete(round.status))
    .length;
}

export function areAllDiagnosticRoundsComplete<
  Round extends { status: RoundStatus },
>(rounds: Round[], totalRounds = DIAGNOSTIC_TOTAL_ROUNDS) {
  return countCompletedDiagnosticRounds(rounds) === totalRounds;
}

export function isFinalDiagnosticReportReady<
  Round extends DiagnosticRoundWithReportInput,
>(rounds: Round[], totalRounds = DIAGNOSTIC_TOTAL_ROUNDS) {
  return (
    countCompletedDiagnosticRounds(rounds) === totalRounds &&
    rounds.every((round) =>
      isDiagnosticReportReady(round.session?.report?.status),
    )
  );
}

export function getActiveDiagnosticRoundNumber<
  Round extends { roundType: string; status: RoundStatus },
>(rounds: Round[], roundOrder: string[]) {
  const firstIncompleteIndex = roundOrder.findIndex((roundType) => {
    const round = rounds.find((item) => item.roundType === roundType);
    return !round || !isDiagnosticSessionComplete(round.status);
  });

  return firstIncompleteIndex === -1
    ? roundOrder.length
    : firstIncompleteIndex + 1;
}

export function canStartDiagnosticRound({
  completedRoundCount,
  requestedRoundNumber,
}: {
  completedRoundCount: number;
  requestedRoundNumber: number;
}) {
  return requestedRoundNumber === completedRoundCount + 1;
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

  const isReportStuck =
    isDiagnosticReportActive(round.reportStatus) &&
    Boolean(round.reportStartedAt) &&
    nowMs - new Date(round.reportStartedAt as string | Date).getTime() >
      DIAGNOSTIC_REPORT_STUCK_MINUTES * 60 * 1000;

  return {
    isRecoverable: isSessionStuck || isReportFailed || isReportStuck,
    isReportFailed,
    isReportStuck,
    isSessionStuck,
  };
}
