import {
  DEFAULT_DIAGNOSTIC_BAND,
  DIAGNOSTIC_BANDS,
  type DiagnosticBand,
  type DiagnosticBandConfig,
  parseDiagnosticBand,
} from "@/lib/diagnostics/bands-config";

export type { DiagnosticBand } from "@/lib/diagnostics/bands-config";
export type DiagnosticJobOption = DiagnosticBandConfig;

export function buildDiagnosticJobOptions(
  _report?: unknown,
): DiagnosticJobOption[] {
  return [...DIAGNOSTIC_BANDS];
}

export function getDefaultDiagnosticBand(
  options: DiagnosticJobOption[],
): DiagnosticBand | null {
  return (
    options.find((option) => option.id === DEFAULT_DIAGNOSTIC_BAND)?.id ??
    options[0]?.id ??
    null
  );
}

export function getDiagnosticJobOption(
  options: DiagnosticJobOption[],
  band: DiagnosticBand | null | undefined,
) {
  return options.find((option) => option.id === band) ?? options[0] ?? null;
}

export { parseDiagnosticBand };
