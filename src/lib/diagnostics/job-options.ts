import type { PrediagnosticsReportStatusResponse } from "#/lib/prediagnostics/report";

export type DiagnosticBand = "dream" | "target" | "backup";

export type DiagnosticJobOption = {
  band: DiagnosticBand;
  label: string;
  title: string;
  salary: string;
  description: string;
  companies: string[];
};

type PrediagnosticsReport = NonNullable<
  NonNullable<PrediagnosticsReportStatusResponse["report"]>["reportJson"]
>;

const FALLBACK_COMPANIES: Record<DiagnosticBand, string[]> = {
  dream: ["Google", "Microsoft", "DE Shaw", "NVIDIA", "Stripe", "Atlassian"],
  target: ["Adobe", "Zomato", "Flipkart", "JP Morgan Tech", "Qualcomm"],
  backup: ["TCS Digital", "Infosys", "Wipro", "IBM", "HCL"],
};

const FALLBACK_DESCRIPTIONS: Record<DiagnosticBand, string> = {
  dream:
    "Expect deeper technical discussion, system thinking, sustained follow-ups, and communication assessed across every answer.",
  target:
    "Expect coding, HR behavioural, role clarity, and structured STAR answers with clear English explanation.",
  backup:
    "Expect aptitude, basic coding, communication, and baseline role readiness checks for entry-level hiring.",
};

const FALLBACK_SALARIES: Record<DiagnosticBand, string> = {
  dream: "₹20-40 LPA",
  target: "₹10-20 LPA",
  backup: "₹6-10 LPA",
};

const LABELS: Record<DiagnosticBand, string> = {
  dream: "Dream Job",
  target: "Target Job",
  backup: "Backup Job",
};

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getCompanies(report: PrediagnosticsReport, band: DiagnosticBand) {
  if (band !== "target" || report.companies_mentioned.length === 0) {
    return FALLBACK_COMPANIES[band];
  }

  return report.companies_mentioned.slice(0, 6);
}

export function buildDiagnosticJobOptions(
  reportStatus: PrediagnosticsReportStatusResponse,
): DiagnosticJobOption[] {
  const report = reportStatus.report?.reportJson;

  if (!report) {
    return [];
  }

  const source: Record<DiagnosticBand, string | null | undefined> = {
    dream: report.dream_job,
    target: report.aiming_for,
    backup: report.backup,
  };

  return (["dream", "target", "backup"] as const).flatMap((band) => {
    const title = cleanText(source[band]);

    if (!title) {
      return [];
    }

    return [
      {
        band,
        label: LABELS[band],
        title,
        salary:
          band === "target" && cleanText(report.salary_expectation)
            ? cleanText(report.salary_expectation)!
            : FALLBACK_SALARIES[band],
        description: FALLBACK_DESCRIPTIONS[band],
        companies: getCompanies(report, band),
      },
    ];
  });
}

export function getDefaultDiagnosticBand(options: DiagnosticJobOption[]): DiagnosticBand | null {
  return options.find((option) => option.band === "target")?.band ?? options[0]?.band ?? null;
}

export function getDiagnosticJobOption(
  options: DiagnosticJobOption[],
  band: DiagnosticBand | null | undefined,
) {
  return options.find((option) => option.band === band) ?? options[0] ?? null;
}

export function parseDiagnosticBand(value: unknown): DiagnosticBand | null {
  return value === "dream" || value === "target" || value === "backup" ? value : null;
}
