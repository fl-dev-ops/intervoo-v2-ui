type SheetCell = string | number;
type SheetRow = SheetCell[];

export const REPORT_SHEET_COLUMN_COUNT = 36;

function deriveTranscriptUrl(audioUrl: string | null): string {
  if (!audioUrl) return "";
  return audioUrl.replace(/audio\.mp3$/i, "transcript.json");
}

interface DiagnosticSheetRowContext {
  studentName: string;
  sessionId: string;
  band: string | null;
  addedAt: string;
  salaryRange: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  round: number | null;
  reportJson: unknown;
}

type LevelMap = Record<string, string | undefined>;
type ReasoningGroup = Record<string, string | undefined>;

interface QuestionResponseShape {
  question_id?: string;
  language_levels?: LevelMap;
  thinking_levels?: LevelMap;
  confidence_levels?: LevelMap;
  reasoning?: {
    language?: ReasoningGroup;
    thinking?: ReasoningGroup;
    confidence?: ReasoningGroup;
  };
}

/**
 * Flattens a diagnostic report's question_responses into sheet rows.
 *
 * Layout (36 cols, no gaps):
 *   A–I   session metadata — populated ONLY on the first question's row
 *   J     Question ID
 *   K–O   Language levels (Fluency, Grammar, Coherence, Interaction, Range)
 *   P–S   Thinking levels (Relevance, Specificity, Reasoning, Job competency)
 *   T–W   Confidence levels (Pace, Pause, Volume, Latency)
 *   X–AB  Language rationales (Fluency, Grammar, Coherence, Interaction, Range)
 *   AC–AF Thinking rationales (Relevance, Specificity, Reasoning, Job competency)
 *   AG–AJ Confidence rationales (Pace, Pause, Volume, Latency)
 */
export function buildDiagnosticSheetRows(
  ctx: DiagnosticSheetRowContext,
): SheetRow[] {
  const report = ctx.reportJson as
    | { assessment_result?: { question_responses?: QuestionResponseShape[] } }
    | null;

  const responses = report?.assessment_result?.question_responses ?? [];
  if (!responses.length) return [];

  return responses.map((qr, index) => {
    const isFirst = index === 0;
    const lang = qr.language_levels ?? {};
    const think = qr.thinking_levels ?? {};
    const conf = qr.confidence_levels ?? {};
    const rLang = qr.reasoning?.language ?? {};
    const rThink = qr.reasoning?.thinking ?? {};
    const rConf = qr.reasoning?.confidence ?? {};

    return [
      isFirst ? ctx.studentName : "",                 // A  Student name
      isFirst ? ctx.sessionId : "",                   // B  Session ID
      isFirst ? (ctx.band ?? "") : "",                // C  Band
      isFirst ? ctx.addedAt : "",                     // D  Added At
      isFirst ? (ctx.salaryRange ?? "") : "",         // E  Salary Range
      isFirst ? (ctx.audioUrl ?? "") : "",            // F  Audio URL
      isFirst ? deriveTranscriptUrl(ctx.audioUrl) : "", // G  Transcript URL
      isFirst ? (ctx.videoUrl ?? "") : "",            // H  Video URL
      isFirst ? (ctx.round ?? "") : "",               // I  Round
      qr.question_id ?? "",                           // J  Question ID
      lang.Fluency ?? "",                             // K  Fluency
      lang.Grammar ?? "",                             // L  Grammar
      lang.Coherence ?? "",                           // M  Coherence
      lang.Interaction ?? "",                         // N  Interaction
      lang.Range ?? "",                               // O  Range
      think.Relevance ?? "",                          // P  Relevance
      think.Specificity ?? "",                        // Q  Specificity
      think.Reasoning ?? "",                          // R  Reasoning
      think.JobCompetency ?? "",                      // S  Job competency
      conf.Pace ?? "",                                // T  Pace
      conf.Pause ?? "",                               // U  Pause
      conf.Volume ?? "",                              // V  Volume
      conf.Latency ?? "",                             // W  Latency
      rLang.Fluency ?? "",                            // X  Fluency Rationale
      rLang.Grammar ?? "",                            // Y  Grammar Rationale
      rLang.Coherence ?? "",                          // Z  Coherence Rationale
      rLang.Interaction ?? "",                        // AA Interaction Rationale
      rLang.Range ?? "",                              // AB Range Rationale
      rThink.Relevance ?? "",                         // AC Relevance Rationale
      rThink.Specificity ?? "",                       // AD Specificity Rationale
      rThink.Reasoning ?? "",                         // AE Reasoning Rationale
      rThink.JobCompetency ?? "",                     // AF Job competency Rationale
      rConf.Pace ?? "",                               // AG Pace Rationale
      rConf.Pause ?? "",                              // AH Pause Rationale
      rConf.Volume ?? "",                             // AI Volume Rationale
      rConf.Latency ?? "",                            // AJ Latency Rationale
    ];
  });
}

export async function postRowsToReportSheet(rows: SheetRow[]): Promise<void> {
  const url = process.env.REPORT_SYNC_WEBHOOK_URL;
  if (!url) {
    console.info("[report-sync] REPORT_SYNC_WEBHOOK_URL not set; skipping");
    return;
  }
  if (!rows.length) return;

  const token = process.env.REPORT_SYNC_WEBHOOK_TOKEN ?? "";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, rows }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Sheet webhook responded ${response.status}: ${body.slice(0, 500)}`,
    );
  }
}
