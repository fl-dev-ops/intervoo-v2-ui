import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicDiagnosticReport } from "@/components/diagnostics/public-diagnostic-report";
import { prisma } from "@/lib/db";
import { getDiagnosticBandConfig } from "@/lib/diagnostics/bands-config";
import { DIAGNOSTIC_ROUNDS } from "@/lib/diagnostics/rounds-config";
import { toHydratedDiagnosticReport } from "@/lib/report-generation/diagnostic";
import { auth } from "@/lib/auth";

export default async function PublicDiagnosticReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const seedReport = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      session: {
        include: {
          diagnosticRound: {
            include: {
              diagnostic: {
                include: {
                  user: { include: { profile: true } },
                  rounds: {
                    orderBy: { roundNumber: "asc" },
                    include: {
                      session: {
                        include: { report: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!seedReport) {
    notFound();
  }

  const diagnostic = seedReport.session.diagnosticRound?.diagnostic;
  if (!diagnostic) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isOwner = session?.user?.id === diagnostic.userId;

  const bandConfig = getDiagnosticBandConfig(diagnostic.selectedBand);
  const preferredName = diagnostic.user.profile?.preferredName ?? null;

  // Build round data for all 4 configured rounds
  const rounds = DIAGNOSTIC_ROUNDS.map((config, index) => {
    const roundNumber = index + 1;
    const dbRound = diagnostic.rounds.find(
      (r) => r.roundNumber === roundNumber,
    );
    const report = dbRound?.session?.report ?? null;

    if (report?.status === "READY" && report.reportJson) {
      const hydrated = toHydratedDiagnosticReport(report.reportJson);
      if (hydrated) {
        return {
          roundNumber,
          roundType: config.id,
          roundTitle: config.title,
          hasReport: true as const,
          shareToken: report.shareToken ?? null,
          report: hydrated,
        };
      }
    }

    return {
      roundNumber,
      roundType: config.id,
      roundTitle: config.title,
      hasReport: false as const,
      shareToken: report?.shareToken ?? null,
      report: null,
    };
  });

  const readyRounds = rounds.filter((r) => r.hasReport);
  const allReady = readyRounds.length === 4;

  const overallScore = allReady
    ? Math.round(
        readyRounds.reduce(
          (sum, r) => sum + r.report.assessment_result.total_score,
          0,
        ) / 4,
      )
    : null;

  // Determine which round to focus on load: the one matching the URL token,
  // or the first available round.
  const focusedRoundNumber =
    rounds.find((r) => r.shareToken === token)?.roundNumber ??
    readyRounds[0]?.roundNumber ??
    1;

  return (
    <PublicDiagnosticReport
      bandConfig={bandConfig}
      currentRound={diagnostic.currentRound}
      focusedRoundNumber={focusedRoundNumber}
      isOwner={isOwner}
      overallScore={overallScore}
      preferredName={preferredName}
      rounds={rounds}
      user={
        session?.user
          ? {
              email: session.user.email ?? null,
              name: session.user.name ?? null,
            }
          : undefined
      }
    />
  );
}
