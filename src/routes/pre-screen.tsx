import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { getPreScreenQuestionConfig } from "#/diagnostic/config";
import {
  PreScreenCompletePanel,
  PreScreenIntroPanel,
  PreScreenPageShell,
  PreScreenPermissionsPanel,
  PreScreenQuestionCard,
  PreScreenReviewPanel,
  PreScreenSessionPanel,
  PreScreenStageRail,
  PreScreenStatusBanner,
} from "#/diagnostic/components";
import {
  PRE_SCREEN_FLOW_SECTIONS,
  getNextPreScreenStep,
  getPreScreenQuestionProgress,
  getPreScreenStageIndex,
  getPreviousPreScreenStep,
  isPreScreenQuestionStep,
} from "#/diagnostic/flow";
import type {
  CompletePreScreenSessionRequestDto,
  PreScreenQuestionnaireDraftDto,
  StartPreScreenSessionResponseDto,
} from "#/diagnostic/dto";
import {
  PRE_SCREEN_QUESTION_IDS,
  PRE_SCREEN_STEP_IDS,
  type PreScreenStepId,
} from "#/diagnostic/question-types";

const preScreenSearchSchema = z.object({
  draft: z.string().optional(),
  step: z.enum(PRE_SCREEN_STEP_IDS).optional(),
});

export const Route = createFileRoute("/pre-screen")({
  validateSearch: (search) => preScreenSearchSchema.parse(search),
  component: PreScreenPage,
});

type StepDirection = "forward" | "backward";
type PreScreenSessionCompletionPayload = Pick<
  CompletePreScreenSessionRequestDto,
  "transcript" | "transcriptSummary" | "sessionMetadata"
>;

function PreScreenPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/pre-screen" });

  const [draft, setDraft] = useState<PreScreenQuestionnaireDraftDto | null>(null);
  const [livekit, setLivekit] = useState<StartPreScreenSessionResponseDto["livekit"] | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<StepDirection>("forward");

  const currentStep = search.step ?? draft?.currentStep ?? "intro";
  const currentQuestion = isPreScreenQuestionStep(currentStep)
    ? getPreScreenQuestionConfig(currentStep)
    : null;
  const questionProgress = getPreScreenQuestionProgress(currentStep);
  const stageIndex = getPreScreenStageIndex(currentStep);
  const progressPercent = useMemo(() => {
    if (currentStep === "intro") return 0;
    if (currentStep === "review") return 88;
    if (currentStep === "permissions") return 94;
    if (currentStep === "session") return 97;
    if (currentStep === "complete") return 100;
    return Math.round((questionProgress / PRE_SCREEN_QUESTION_IDS.length) * 100);
  }, [currentStep, questionProgress]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      setIsBooting(true);
      setPageError(null);

      try {
        let nextDraft = (
          await trpcClient.preScreen.getOrCreateDraft.mutate({
            draftId: search.draft,
          })
        ).draft;

        let resolvedStep = search.step ?? nextDraft.currentStep ?? "intro";

        if (resolvedStep === "session" && !livekit) {
          nextDraft = (
            await trpcClient.preScreen.saveStep.mutate({
              draftId: nextDraft.id,
              stepId: "permissions",
            })
          ).draft;
          resolvedStep = "permissions";
        }

        if (ignore) return;

        setDraft(nextDraft);
        if (resolvedStep !== "session") {
          setLivekit(null);
        }

        if (search.draft !== nextDraft.id || search.step !== resolvedStep) {
          await navigate({
            to: "/pre-screen",
            search: {
              draft: nextDraft.id,
              step: resolvedStep,
            },
            replace: true,
          });
        }
      } catch (error) {
        if (ignore) return;
        setPageError(getErrorMessage(error, "Failed to load the pre-screen draft."));
      } finally {
        if (!ignore) {
          setIsBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      ignore = true;
    };
  }, [livekit, navigate, search.draft, search.step]);

  useEffect(() => {
    if (!currentQuestion || !draft) {
      setFieldValue("");
      return;
    }

    const answer = draft.answers[currentQuestion.id];
    setFieldValue(getAnswerAsInputValue(answer));
  }, [currentQuestion, draft]);

  async function syncUrlStep(step: PreScreenStepId, replace = false) {
    if (!draft) return;

    await navigate({
      to: "/pre-screen",
      search: {
        draft: draft.id,
        step,
      },
      replace,
    });
  }

  async function persistCurrentQuestion(targetStep: PreScreenStepId, requireValue: boolean) {
    if (!draft || !currentQuestion) {
      return null;
    }

    const value = fieldValue.trim();
    const existing = getAnswerAsInputValue(draft.answers[currentQuestion.id]).trim();

    if (!value && requireValue) {
      setPageError("Please answer the question before continuing.");
      return null;
    }

    if (!value && !existing) {
      const response = await trpcClient.preScreen.saveStep.mutate({
        draftId: draft.id,
        stepId: targetStep,
      });
      setDraft(response.draft);
      return response.draft;
    }

    if (value === existing && currentStep !== targetStep) {
      const response = await trpcClient.preScreen.saveStep.mutate({
        draftId: draft.id,
        stepId: targetStep,
      });
      setDraft(response.draft);
      return response.draft;
    }

    const response = await trpcClient.preScreen.saveAnswer.mutate({
      draftId: draft.id,
      stepId: targetStep,
      questionId: currentQuestion.id,
      value,
    });
    setDraft(response.draft);
    return response.draft;
  }

  async function goToStep(step: PreScreenStepId, nextDirection: StepDirection, replace = false) {
    if (!draft) return;

    setDirection(nextDirection);
    setPageError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (isPreScreenQuestionStep(currentStep)) {
        await persistCurrentQuestion(step, false);
      } else {
        const response = await trpcClient.preScreen.saveStep.mutate({
          draftId: draft.id,
          stepId: step,
        });
        setDraft(response.draft);
      }

      await syncUrlStep(step, replace);
    } catch (error) {
      setPageError(getErrorMessage(error, "Failed to update the current step."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStart() {
    const firstStep = PRE_SCREEN_QUESTION_IDS[0];
    await goToStep(firstStep, "forward");
  }

  async function handleBack() {
    const previousStep = getPreviousPreScreenStep(currentStep);
    if (!previousStep || isSubmitting) {
      return;
    }

    await goToStep(previousStep, "backward");
  }

  async function handleNext() {
    if (!draft || isSubmitting) return;

    setPageError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (isPreScreenQuestionStep(currentStep)) {
        const nextStep = getNextPreScreenStep(currentStep);
        if (!nextStep) return;

        const updatedDraft = await persistCurrentQuestion(nextStep, true);
        if (!updatedDraft) return;

        setDirection("forward");
        await syncUrlStep(nextStep);
        return;
      }

      if (currentStep === "intro") {
        await handleStart();
        return;
      }

      if (currentStep === "review") {
        const response = await trpcClient.preScreen.saveStep.mutate({
          draftId: draft.id,
          stepId: "permissions",
        });
        setDraft(response.draft);
        setDirection("forward");
        await syncUrlStep("permissions");
        return;
      }

      if (currentStep === "permissions") {
        const response = await trpcClient.preScreen.startSession.mutate({
          draftId: draft.id,
        });
        setDraft(response.draft);
        setLivekit(response.livekit);
        setNotice("Your pre-screen is ready and recording has started.");
        setDirection("forward");
        await syncUrlStep("session");
        return;
      }

      if (currentStep === "session") {
        await completeCurrentSession();
        return;
      }

      if (currentStep === "complete") {
        const refreshed = await trpcClient.preScreen.getOrCreateDraft.mutate({
          draftId: draft.id,
        });
        setDraft(refreshed.draft);
        setNotice(
          refreshed.draft.session?.audioUrl
            ? "Your recording is now available."
            : "Your recording is still being processed.",
        );
      }
    } catch (error) {
      setPageError(getErrorMessage(error, "Something went wrong while saving this step."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeCurrentSession(payload: PreScreenSessionCompletionPayload = {}) {
    if (!draft?.session) {
      throw new Error("Pre-screen session has not been created yet.");
    }

    setPageError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await trpcClient.preScreen.completeSession.mutate({
        draftId: draft.id,
        sessionId: draft.session.id,
        ...payload,
      });
      setDraft(response.draft);
      setNotice("Your pre-screen has been marked as complete.");
      setDirection("forward");
      await syncUrlStep("complete");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to finish the pre-screen.");
      setPageError(message);
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestartSession() {
    if (!draft || isSubmitting) return;

    setPageError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await trpcClient.preScreen.startSession.mutate({
        draftId: draft.id,
      });
      setDraft(response.draft);
      setLivekit(response.livekit);
      setNotice("Pre-screen setup has been restarted and a new recording has begun.");
      setDirection("forward");
      await syncUrlStep("session");
    } catch (error) {
      setPageError(getErrorMessage(error, "Failed to restart the pre-screen."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefreshDraft() {
    if (!draft || isSubmitting) return;

    setPageError(null);
    setIsSubmitting(true);

    try {
      const response = await trpcClient.preScreen.getOrCreateDraft.mutate({
        draftId: draft.id,
      });
      setDraft(response.draft);
      setNotice("Your progress has been refreshed.");
    } catch (error) {
      setPageError(getErrorMessage(error, "Failed to refresh your progress."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveForLater() {
    if (!draft || isSubmitting) return;

    setPageError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (isPreScreenQuestionStep(currentStep)) {
        const updatedDraft = await persistCurrentQuestion(currentStep, false);
        if (updatedDraft) {
          setNotice("Your progress has been saved.");
        }
      } else {
        const response = await trpcClient.preScreen.saveStep.mutate({
          draftId: draft.id,
          stepId: currentStep,
        });
        setDraft(response.draft);
        setNotice("Your progress has been saved.");
      }
    } catch (error) {
      setPageError(getErrorMessage(error, "Failed to save your progress."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isBooting || !draft) {
    return (
      <PreScreenPageShell
        title="Loading your pre-screen"
        description="Preparing your questions and picking up where you left off."
      >
        <div className="rounded-[30px] border border-slate-200 bg-white p-10 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          {pageError ? (
            <PreScreenStatusBanner tone="error">{pageError}</PreScreenStatusBanner>
          ) : (
            <div className="space-y-4">
              <div className="h-4 w-48 rounded-full bg-slate-200" />
              <div className="h-14 rounded-3xl bg-slate-100" />
              <div className="h-40 rounded-[28px] bg-slate-100" />
            </div>
          )}
        </div>
      </PreScreenPageShell>
    );
  }

  const hasBack = currentStep !== "intro";

  return (
    <PreScreenPageShell
      title="Interview readiness pre-screen"
      description="Answer a few questions, review your responses, and then begin your guided practice interview."
    >
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <div className="hidden space-y-4 lg:block lg:space-y-6">
          <PreScreenStageRail
            sections={PRE_SCREEN_FLOW_SECTIONS.map((section) => ({
              id: section.id,
              label: section.label,
              stepCount: section.stepIds.length,
            }))}
            activeIndex={stageIndex}
          />

          <div className="rounded-[28px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Your progress</span>
              <button
                type="button"
                onClick={handleRefreshDraft}
                disabled={isSubmitting}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium tracking-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
            <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
              Your answers are saved as you go, so you can continue this pre-screen later.
            </p>

            <div className="mt-5 rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-slate-900 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4 md:space-y-5">
          {pageError ? (
            <PreScreenStatusBanner tone="error">{pageError}</PreScreenStatusBanner>
          ) : null}
          {notice ? <PreScreenStatusBanner tone="success">{notice}</PreScreenStatusBanner> : null}

          <div className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-6 lg:min-h-[calc(100vh-7.5rem)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current step
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
                  {getStepDisplayLabel(currentStep)}
                </span>
              </div>

              {isPreScreenQuestionStep(currentStep) ? (
                <span className="text-sm font-medium text-slate-500">
                  Question {questionProgress} / {PRE_SCREEN_QUESTION_IDS.length}
                </span>
              ) : null}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 lg:hidden">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{PRE_SCREEN_FLOW_SECTIONS[stageIndex]?.label ?? "Pre-screen"}</span>
                <span>{progressPercent}% complete</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-slate-900 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div
              key={currentStep}
              className={`pre-screen-step-card mt-4 min-h-[280px] flex-1 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 md:mt-5 md:min-h-[320px] md:p-6 ${
                direction === "forward"
                  ? "pre-screen-step-card-forward"
                  : "pre-screen-step-card-backward"
              } ${currentStep === "review" ? "min-h-0 overflow-hidden" : ""}`}
            >
              {currentStep === "intro" ? (
                <PreScreenIntroPanel onStart={handleStart} pending={isSubmitting} />
              ) : null}

              {currentQuestion ? (
                <PreScreenQuestionCard
                  question={currentQuestion}
                  value={fieldValue}
                  pending={isSubmitting}
                  onChange={setFieldValue}
                />
              ) : null}

              {currentStep === "review" ? (
                <PreScreenReviewPanel draft={draft} onEdit={(step) => goToStep(step, "backward")} />
              ) : null}

              {currentStep === "permissions" ? (
                <PreScreenPermissionsPanel draft={draft} pending={isSubmitting} />
              ) : null}

              {currentStep === "session" ? (
                <PreScreenSessionPanel
                  draft={draft}
                  livekit={livekit}
                  pending={isSubmitting}
                  onComplete={completeCurrentSession}
                  onRestart={handleRestartSession}
                />
              ) : null}

              {currentStep === "complete" ? (
                <PreScreenCompletePanel draft={draft} pending={isSubmitting} />
              ) : null}
            </div>

            {currentStep !== "session" ? (
              <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 pt-4 pb-1 backdrop-blur md:-mx-6 md:mt-5 md:px-6 sm:flex sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={!hasBack || isSubmitting}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Back
                </button>

                <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSaveForLater}
                    disabled={isSubmitting}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting ? "Saving..." : "Save progress"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {getPrimaryActionLabel(currentStep, isSubmitting)}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </PreScreenPageShell>
  );
}

function getPrimaryActionLabel(step: PreScreenStepId, isSubmitting: boolean) {
  if (isSubmitting) return "Working...";
  if (step === "intro") return "Start";
  if (step === "review") return "Continue to set up";
  if (step === "permissions") return "Start pre-screen";
  if (step === "session") return "Finish pre-screen";
  if (step === "complete") return "Check recording status";
  return "Next";
}

function getStepDisplayLabel(step: PreScreenStepId) {
  if (step === "intro") return "Welcome";
  if (step === "review") return "Review";
  if (step === "permissions") return "Setup";
  if (step === "session") return "Pre-screen";
  if (step === "complete") return "Completed";
  return "Question";
}

function getAnswerAsInputValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return "";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
