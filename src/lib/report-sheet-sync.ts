type SheetCell = string | number;
type SheetRow = SheetCell[];

export const REPORT_SHEET_COLUMN_COUNT = 37;

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
  reportUrl: string | null;
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
 * Layout (37 cols, no gaps):
 *   A–J   session metadata — populated ONLY on the first question's row
 *   K     Question ID
 *   L–P   Language levels (Fluency, Grammar, Coherence, Interaction, Range)
 *   Q–T   Thinking levels (Relevance, Specificity, Reasoning, Job competency)
 *   U–X   Confidence levels (Pace, Pause, Volume, Latency)
 *   Y–AC  Language rationales (Fluency, Grammar, Coherence, Interaction, Range)
 *   AD–AG Thinking rationales (Relevance, Specificity, Reasoning, Job competency)
 *   AH–AK Confidence rationales (Pace, Pause, Volume, Latency)
 */
export function buildDiagnosticSheetRows(
  ctx: DiagnosticSheetRowContext,
): SheetRow[] {
  const report = ctx.reportJson as {
    assessment_result?: { question_responses?: QuestionResponseShape[] };
  } | null;

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
      isFirst ? ctx.studentName : "", // A  Student name
      isFirst ? ctx.sessionId : "", // B  Session ID
      isFirst ? (ctx.band ?? "") : "", // C  Band
      isFirst ? ctx.addedAt : "", // D  Added At
      isFirst ? (ctx.salaryRange ?? "") : "", // E  Salary Range
      isFirst ? (ctx.audioUrl ?? "") : "", // F  Audio URL
      isFirst ? deriveTranscriptUrl(ctx.audioUrl) : "", // G  Transcript URL
      isFirst ? (ctx.videoUrl ?? "") : "", // H  Video URL
      isFirst ? (ctx.round ?? "") : "", // I  Round
      isFirst ? (ctx.reportUrl ?? "") : "", // J  Report URL
      qr.question_id ?? "", // K  Question ID
      lang.Fluency ?? "", // L  Fluency
      lang.Grammar ?? "", // M  Grammar
      lang.Coherence ?? "", // N  Coherence
      lang.Interaction ?? "", // O  Interaction
      lang.Range ?? "", // P  Range
      think.Relevance ?? "", // Q  Relevance
      think.Specificity ?? "", // R  Specificity
      think.Reasoning ?? "", // S  Reasoning
      think.JobCompetency ?? "", // T  Job competency
      conf.Pace ?? "", // U  Pace
      conf.Pause ?? "", // V  Pause
      conf.Volume ?? "", // W  Volume
      conf.Latency ?? "", // X  Latency
      rLang.Fluency ?? "", // Y  Fluency Rationale
      rLang.Grammar ?? "", // Z  Grammar Rationale
      rLang.Coherence ?? "", // AA Coherence Rationale
      rLang.Interaction ?? "", // AB Interaction Rationale
      rLang.Range ?? "", // AC Range Rationale
      rThink.Relevance ?? "", // AD Relevance Rationale
      rThink.Specificity ?? "", // AE Specificity Rationale
      rThink.Reasoning ?? "", // AF Reasoning Rationale
      rThink.JobCompetency ?? "", // AG Job competency Rationale
      rConf.Pace ?? "", // AH Pace Rationale
      rConf.Pause ?? "", // AI Pause Rationale
      rConf.Volume ?? "", // AJ Volume Rationale
      rConf.Latency ?? "", // AK Latency Rationale
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
