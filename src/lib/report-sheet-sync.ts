type SheetCell = string | number;
type SheetRow = SheetCell[];

export const REPORT_SHEET_COLUMN_COUNT = 35;

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
 * Layout (35 cols, no gaps):
 *   A–H  session metadata — populated ONLY on the first question's row
 *   I    Question ID
 *   J–N  Language levels (Fluency, Grammar, Coherence, Interaction, Range)
 *   O–R  Thinking levels (Relevance, Specificity, Reasoning, Job competency)
 *   S–V  Confidence levels (Pace, Pause, Volume, Latency)
 *   W–AA Language rationales (Fluency, Grammar, Coherence, Interaction, Range)
 *   AB–AE Thinking rationales (Relevance, Specificity, Reasoning, Job competency)
 *   AF–AI Confidence rationales (Pace, Pause, Volume, Latency)
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
      isFirst ? (ctx.videoUrl ?? "") : "",            // G  Video URL
      isFirst ? (ctx.round ?? "") : "",               // H  Round
      qr.question_id ?? "",                           // I  Question ID
      lang.Fluency ?? "",                             // J  Fluency
      lang.Grammar ?? "",                             // K  Grammar
      lang.Coherence ?? "",                           // L  Coherence
      lang.Interaction ?? "",                         // M  Interaction
      lang.Range ?? "",                               // N  Range
      think.Relevance ?? "",                          // O  Relevance
      think.Specificity ?? "",                        // P  Specificity
      think.Reasoning ?? "",                          // Q  Reasoning
      think.JobCompetency ?? "",                      // R  Job competency
      conf.Pace ?? "",                                // S  Pace
      conf.Pause ?? "",                               // T  Pause
      conf.Volume ?? "",                              // U  Volume
      conf.Latency ?? "",                             // V  Latency
      rLang.Fluency ?? "",                            // W  Fluency Rationale
      rLang.Grammar ?? "",                            // X  Grammar Rationale
      rLang.Coherence ?? "",                          // Y  Coherence Rationale
      rLang.Interaction ?? "",                        // Z  Interaction Rationale
      rLang.Range ?? "",                              // AA Range Rationale
      rThink.Relevance ?? "",                         // AB Relevance Rationale
      rThink.Specificity ?? "",                       // AC Specificity Rationale
      rThink.Reasoning ?? "",                         // AD Reasoning Rationale
      rThink.JobCompetency ?? "",                     // AE Job competency Rationale
      rConf.Pace ?? "",                               // AF Pace Rationale
      rConf.Pause ?? "",                              // AG Pause Rationale
      rConf.Volume ?? "",                             // AH Volume Rationale
      rConf.Latency ?? "",                            // AI Latency Rationale
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
