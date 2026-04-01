import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getPreScreeningSetup,
  hasCompletedPreScreeningSetup,
  savePreScreeningSetup,
  type PreScreeningSetup,
} from "#/lib/pre-screening-setup";

export type PreScreeningStep =
  | "nativeLanguage"
  | "englishLevel"
  | "speakingSpeed"
  | "intro"
  | "session"
  | "waitingForEvaluation"
  | "evaluationReady"
  | "evaluationFailed";

type PreScreeningFlowContextValue = {
  canStart: boolean;
  setup: PreScreeningSetup;
  step: PreScreeningStep;
  setStep: (step: PreScreeningStep) => void;
  updateSetup: (patch: Partial<PreScreeningSetup>) => void;
};

const PreScreeningFlowContext = createContext<PreScreeningFlowContextValue | null>(null);
const PRE_SCREENING_STEPS: PreScreeningStep[] = [
  "nativeLanguage",
  "englishLevel",
  "speakingSpeed",
  "intro",
  "session",
  "waitingForEvaluation",
  "evaluationReady",
  "evaluationFailed",
];

function getInitialStep(setup: PreScreeningSetup): PreScreeningStep {
  if (!setup.nativeLanguage) {
    return "nativeLanguage";
  }

  if (!setup.englishLevel) {
    return "englishLevel";
  }

  if (!setup.speakingSpeed) {
    return "speakingSpeed";
  }

  return "intro";
}

function getStepFromUrl(): PreScreeningStep | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawStep = new URLSearchParams(window.location.search).get("step");

  if (!rawStep) {
    return null;
  }

  return PRE_SCREENING_STEPS.includes(rawStep as PreScreeningStep)
    ? (rawStep as PreScreeningStep)
    : null;
}

function resolveStepFromUrl(setup: PreScreeningSetup): PreScreeningStep {
  const fallbackStep = getInitialStep(setup);
  const urlStep = getStepFromUrl();

  if (!urlStep) {
    return fallbackStep;
  }

  if (!setup.nativeLanguage) {
    return "nativeLanguage";
  }

  if (!setup.englishLevel) {
    return urlStep === "nativeLanguage" ? urlStep : "englishLevel";
  }

  if (!setup.speakingSpeed) {
    return urlStep === "nativeLanguage" || urlStep === "englishLevel" ? urlStep : "speakingSpeed";
  }

  return urlStep;
}

function replaceUrlStep(step: PreScreeningStep) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("step", step);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

export function PreScreeningFlowProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<PreScreeningSetup>(() => getPreScreeningSetup());
  const [step, setStep] = useState<PreScreeningStep>(() =>
    resolveStepFromUrl(getPreScreeningSetup()),
  );

  useEffect(() => {
    replaceUrlStep(step);
  }, [step]);

  const value = useMemo<PreScreeningFlowContextValue>(
    () => ({
      canStart: hasCompletedPreScreeningSetup(setup),
      setup,
      step,
      setStep,
      updateSetup: (patch) => {
        setSetup((current) => {
          const next = { ...current, ...patch };
          savePreScreeningSetup(next);
          return next;
        });
      },
    }),
    [setup, step],
  );

  return (
    <PreScreeningFlowContext.Provider value={value}>{children}</PreScreeningFlowContext.Provider>
  );
}

export function usePreScreeningFlow() {
  const value = useContext(PreScreeningFlowContext);

  if (!value) {
    throw new Error("usePreScreeningFlow must be used inside PreScreeningFlowProvider");
  }

  return value;
}
