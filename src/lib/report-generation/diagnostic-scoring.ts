import type {
  DiagnosticAssessmentResult,
  DiagnosticConfidenceLevel,
  DiagnosticLanguageLevel,
  DiagnosticQuestionResponse,
  DiagnosticThinkingLevel,
  SalaryBandLabel,
} from "./diagnostic-report.types";

// Normalize rubric labels to a 1-3 scale, then convert to percent for output.
const CEFR_SCORE_MAP: Record<DiagnosticLanguageLevel, number> = {
  "Pre-A1": 1,
  A1: 1,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 3,
  C2: 3,
};

const THINKING_SCORE_MAP: Record<DiagnosticThinkingLevel, number> = {
  TF1: 1,
  TF2: 1,
  TF3: 2,
  TF4: 3,
  TF5: 3,
};

const CONFIDENCE_SCORE_MAP: Record<DiagnosticConfidenceLevel, number> = {
  VCP1: 1,
  VCP2: 1,
  VCP3: 2,
  VCP4: 3,
};

const SALARY_CONFIG = {
  minLpa: 3.5,
  maxLpa: 67,
  bands: {
    low: "₹3.5-15 LPA" as SalaryBandLabel,
    mid: "₹15-35 LPA" as SalaryBandLabel,
    high: "₹35+ LPA" as SalaryBandLabel,
  },
} as const;

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function conservativeMode(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  const modes = Array.from(counts.entries())
    .filter(([, count]) => count === maxCount)
    .map(([value]) => value);

  return Math.min(...modes);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function score1To3AsPercent(score: number) {
  return (score / 3) * 100;
}

export function getSalaryBandForScore(totalScore: number): SalaryBandLabel {
  if (totalScore >= 80) {
    return SALARY_CONFIG.bands.high;
  }
  if (totalScore >= 50) {
    return SALARY_CONFIG.bands.mid;
  }
  return SALARY_CONFIG.bands.low;
}

export function scoreLanguageDimension(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return CEFR_SCORE_MAP[level as DiagnosticLanguageLevel] ?? 0;
}

export function scoreThinking(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return THINKING_SCORE_MAP[level as DiagnosticThinkingLevel] ?? 0;
}

export function scoreThinkingDimensions(
  thinkingLevels: DiagnosticQuestionResponse["thinking_levels"] | undefined,
) {
  if (!thinkingLevels) {
    return 0;
  }
  const scores = Object.values(thinkingLevels).map((level) =>
    scoreThinking(level),
  );
  return conservativeMode(scores);
}

export function scoreConfidence(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return CONFIDENCE_SCORE_MAP[level as DiagnosticConfidenceLevel] ?? 0;
}

export function scoreConfidenceDimensions(
  confidenceLevels: DiagnosticQuestionResponse["confidence_levels"] | undefined,
) {
  if (!confidenceLevels) {
    return 0;
  }
  const scores = Object.values(confidenceLevels).map((level) =>
    scoreConfidence(level),
  );
  return conservativeMode(scores);
}

export function scoreLanguage(
  languageLevels: DiagnosticQuestionResponse["language_levels"] | undefined,
) {
  if (!languageLevels) {
    return 0;
  }
  const scores = Object.values(languageLevels).map((level) =>
    scoreLanguageDimension(level),
  );
  return conservativeMode(scores);
}

export function scoreQuestion(response: DiagnosticQuestionResponse) {
  const scores = [
    scoreThinkingDimensions(response.thinking_levels),
    scoreConfidenceDimensions(response.confidence_levels),
    scoreLanguage(response.language_levels),
  ];

  return average(scores);
}

export function scoreAssessment(
  questionResponses: DiagnosticQuestionResponse[],
): DiagnosticAssessmentResult {
  if (!questionResponses.length) {
    return {
      total_score: 0,
      thinking_avg: 0,
      confidence_avg: 0,
      language_avg: 0,
      salary_lpa: SALARY_CONFIG.minLpa,
      salary_band: SALARY_CONFIG.bands.low,
      salary_percentile: 0,
      question_responses: [],
    };
  }

  const questionScores = questionResponses.map((response) =>
    scoreQuestion(response),
  );

  const thinkingScores = questionResponses.map((response) =>
    scoreThinkingDimensions(response.thinking_levels),
  );
  const confidenceScores = questionResponses.map((response) =>
    scoreConfidenceDimensions(response.confidence_levels),
  );
  const languageScores = questionResponses.map((response) =>
    scoreLanguage(response.language_levels),
  );

  const totalScore1To3 = average(questionScores);
  const thinkingAvg1To3 = average(thinkingScores);
  const confidenceAvg1To3 = average(confidenceScores);
  const languageAvg1To3 = average(languageScores);
  const totalScore = score1To3AsPercent(totalScore1To3);
  const thinkingAvg = score1To3AsPercent(thinkingAvg1To3);
  const confidenceAvg = score1To3AsPercent(confidenceAvg1To3);
  const languageAvg = score1To3AsPercent(languageAvg1To3);
  const salaryLpa =
    SALARY_CONFIG.minLpa +
    (totalScore / 100) * (SALARY_CONFIG.maxLpa - SALARY_CONFIG.minLpa);
  const salaryBand = getSalaryBandForScore(totalScore);
  const salaryPercentile = totalScore / 100;

  return {
    total_score: round(totalScore, 2),
    thinking_avg: round(thinkingAvg, 2),
    confidence_avg: round(confidenceAvg, 2),
    language_avg: round(languageAvg, 2),
    salary_lpa: round(salaryLpa, 2),
    salary_band: salaryBand,
    salary_percentile: round(salaryPercentile, 3),
    question_responses: questionResponses,
  };
}
