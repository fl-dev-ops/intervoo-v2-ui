import type {
  DiagnosticAssessmentResult,
  DiagnosticConfidenceLevel,
  DiagnosticLanguageLevel,
  DiagnosticQuestionResponse,
  DiagnosticThinkingLevel,
  SalaryBandLabel,
} from "./diagnostic-report.types";
import type { DiagnosticQuestionType } from "./diagnostic-activity";

export type QuestionTypeMap = Map<string, DiagnosticQuestionType[]>;

// Normalize rubric labels to a 1-5 scale first, then convert to percent for output.
const CEFR_SCORE_MAP: Record<DiagnosticLanguageLevel, number> = {
  "Pre-A1": 1,
  A1: 1,
  A2: 2,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};

const THINKING_SCORE_MAP: Record<DiagnosticThinkingLevel, number> = {
  TF1: 1,
  TF2: 2,
  TF3: 3,
  TF4: 4,
  TF5: 5,
};

const CONFIDENCE_SCORE_MAP: Record<DiagnosticConfidenceLevel, number> = {
  VCP1: 1,
  VCP2: 2.33,
  VCP3: 3.67,
  VCP4: 5,
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

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function score1To5AsPercent(score: number) {
  return (score / 5) * 100;
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

export function scoreConfidence(level: string | undefined | null) {
  if (!level) {
    return 0;
  }
  return CONFIDENCE_SCORE_MAP[level as DiagnosticConfidenceLevel] ?? 0;
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
  return average(scores);
}

export function scoreQuestion(
  response: DiagnosticQuestionResponse,
  questionTypeMap: QuestionTypeMap,
) {
  const questionTypes = questionTypeMap.get(response.question_id) ?? [];
  const applicableScores: number[] = [];

  if (questionTypes.includes("Thinking")) {
    applicableScores.push(scoreThinking(response.thinking_level));
  }
  if (questionTypes.includes("Confidence")) {
    applicableScores.push(scoreConfidence(response.confidence_level));
  }
  if (questionTypes.includes("Language")) {
    applicableScores.push(scoreLanguage(response.language_levels));
  }

  return average(applicableScores);
}

export function scoreAssessment(
  questionResponses: DiagnosticQuestionResponse[],
  questionTypeMap: QuestionTypeMap,
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
    scoreQuestion(response, questionTypeMap),
  );

  const getResponsesForType = (type: DiagnosticQuestionType) =>
    questionResponses.filter((response) =>
      (questionTypeMap.get(response.question_id) ?? []).includes(type),
    );

  const thinkingScores = getResponsesForType("Thinking").map((response) =>
    scoreThinking(response.thinking_level),
  );
  const confidenceScores = getResponsesForType("Confidence").map((response) =>
    scoreConfidence(response.confidence_level),
  );
  const languageScores = getResponsesForType("Language").map((response) =>
    scoreLanguage(response.language_levels),
  );

  const totalScore1To5 = average(questionScores);
  const thinkingAvg1To5 = average(thinkingScores);
  const confidenceAvg1To5 = average(confidenceScores);
  const languageAvg1To5 = average(languageScores);
  const totalScore = score1To5AsPercent(totalScore1To5);
  const thinkingAvg = score1To5AsPercent(thinkingAvg1To5);
  const confidenceAvg = score1To5AsPercent(confidenceAvg1To5);
  const languageAvg = score1To5AsPercent(languageAvg1To5);
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
