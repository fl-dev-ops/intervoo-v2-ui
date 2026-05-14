"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { type CoachOption, coachCards } from "@/lib/coaches";
import { cn } from "@/lib/utils";

const steps = [
  { id: "profile", label: "Profile" },
  { id: "education", label: "Education" },
  { id: "language", label: "Language" },
  { id: "english", label: "English" },
  { id: "coach", label: "Coach" },
  { id: "ready", label: "Ready" },
] as const;

type StepId = (typeof steps)[number]["id"];
type NativeLanguage =
  | "tamil"
  | "hindi"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "bengali";
type EnglishLevel = "beginner" | "intermediate" | "advanced" | "native";

type OnboardingForm = {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  institution: string;
  degree: string;
  stream: string;
  placementPreparation: string;
  academySelection: string;
  academyName: string;
  nativeLanguage?: NativeLanguage;
  englishLevel?: EnglishLevel;
  coach?: CoachOption;
};

type FieldErrors = Partial<Record<keyof OnboardingForm, string>>;

const placementOptions = [
  { value: "through_college", label: "Through my college" },
  { value: "self_preparing", label: "Preparing on my own" },
  { value: "not_preparing", label: "I'm not preparing currently" },
  { value: "training_academy", label: "Through a training academy" },
] as const;

const academyOptions = [
  { value: "DET", label: "Deshpande Educational Trust" },
  { value: "FSSA", label: "FSSA" },
  { value: "Others", label: "Others" },
] as const;

const languageOptions = [
  { value: "tamil", label: "Tamil", nativeLabel: "Tamil" },
  { value: "hindi", label: "Hindi", nativeLabel: "Hindi" },
  { value: "telugu", label: "Telugu", nativeLabel: "Telugu" },
  { value: "kannada", label: "Kannada", nativeLabel: "Kannada" },
  { value: "malayalam", label: "Malayalam", nativeLabel: "Malayalam" },
  { value: "bengali", label: "Bengali", nativeLabel: "Bengali" },
] as const satisfies Array<{
  value: NativeLanguage;
  label: string;
  nativeLabel: string;
}>;

const englishOptions = [
  {
    value: "native",
    label: "Native / Near-native",
    description: "Fully comfortable speaking English.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent in most situations with minor gaps.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold a basic conversation but make mistakes.",
  },
  {
    value: "beginner",
    label: "Beginner",
    description: "I struggle to speak in English. Basic words only.",
  },
] as const satisfies Array<{
  value: EnglishLevel;
  label: string;
  description: string;
}>;

const initialForm: OnboardingForm = {
  firstName: "",
  lastName: "",
  preferredName: "",
  email: "",
  institution: "",
  degree: "",
  stream: "",
  placementPreparation: "",
  academySelection: "",
  academyName: "",
  nativeLanguage: undefined,
  englishLevel: undefined,
  coach: undefined,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("profile");
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({});
  const currentStepIndex = steps.findIndex((item) => item.id === step);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/onboarding/me");
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.ok) {
          const data = (await response.json()) as { stage?: string };

          if (data.stage === "PREDIAGNOSTICS") {
            router.replace("/prediagnostics");
            return;
          }
          if (data.stage === "DIAGNOSTICS") {
            router.replace("/diagnostics");
            return;
          }
          if (data.stage === "COMPLETED") {
            router.replace("/diagnostics/final-report");
            return;
          }
        }
      } catch {
        // Ignore fetch errors, user starts with empty form
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  function updateForm(patch: Partial<OnboardingForm>) {
    setValidationErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof OnboardingForm>) {
        delete next[key];
      }
      return next;
    });
    setForm((current) => ({ ...current, ...patch }));
  }

  function goNext() {
    const errors = validateStep(step, form);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const nextStep = steps[currentStepIndex + 1];

    if (nextStep) {
      setStep(nextStep.id);
    }
  }

  function goBack() {
    const previousStep = steps[currentStepIndex - 1];

    if (previousStep) {
      setStep(previousStep.id);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-3 md:p-10">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-white" />
          <p className="text-sm text-white">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen h-screen flex-col text-white p-3 md:p-10">
      <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col ">
        <OnboardingHeader
          currentStep={currentStepIndex + 1}
          onBack={goBack}
          showBack={currentStepIndex > 0}
          totalSteps={steps.length}
        />

        <div className="h-full flex-1 p-2 mt-4 md:mt-8">
          <div key={step} className="pt-2 px-1 md:p-0 flex-1 animate-fade-in">
            {step === "profile" ? (
              <ProfileStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            ) : step === "education" ? (
              <EducationStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            ) : step === "language" ? (
              <LanguageStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            ) : step === "english" ? (
              <EnglishStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            ) : step === "coach" ? (
              <CoachStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            ) : (
              <ReadyStepContent form={form} />
            )}
          </div>

          {step !== "ready" ? (
            <div className="mt-8">
              <Button
                className="w-full bg-button"
                size={"lg"}
                type="button"
                onClick={goNext}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <ReadyStepButton form={form} />
          )}
        </div>
      </section>
    </main>
  );
}

function OnboardingHeader(props: {
  currentStep: number;
  totalSteps: number;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <header className="text-white px-2 mt-2">
      <div className="flex items-center gap-2 text-sm">
        {props.showBack && (
          <button
            className="inline-flex items-center justify-center rounded-md p-1 text-muted transition hover:bg-accent hover:text-foreground"
            type="button"
            onClick={props.onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <span className="font-medium">Onboarding</span>
        <span className="ml-auto tabular-nums text-muted">
          {props.currentStep} / {props.totalSteps}
        </span>
      </div>
      <div
        className="mt-3 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${props.totalSteps}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: props.totalSteps }, (_, index) => ({
          id: `onboarding-step-${index + 1}`,
          isComplete: index < props.currentStep,
        })).map((segment) => (
          <span
            key={segment.id}
            className={cn(
              "h-2 rounded-full transition-colors duration-500 ease-out",
              segment.isComplete ? "bg-white" : "bg-white/25",
            )}
          />
        ))}
      </div>
    </header>
  );
}

function ProfileStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent
      description="Tell us what to call you before your diagnostic starts."
      title="Basic Details"
    >
      <FieldGroup className="gap-6">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            autoComplete="given-name"
            error={props.errors.firstName}
            label="First name"
            required={true}
            value={props.form.firstName}
            onChange={(value) => props.onChange({ firstName: value })}
          />
          <TextField
            autoComplete="family-name"
            error={props.errors.lastName}
            label="Last name"
            required={true}
            value={props.form.lastName}
            onChange={(value) => props.onChange({ lastName: value })}
          />
        </div>
        <TextField
          error={props.errors.preferredName}
          label="How should we call you?"
          required={true}
          value={props.form.preferredName}
          onChange={(value) => props.onChange({ preferredName: value })}
        />
        <TextField
          autoComplete="email"
          error={props.errors.email}
          label="Email address"
          required={true}
          type="email"
          value={props.form.email}
          onChange={(value) => props.onChange({ email: value })}
        />
      </FieldGroup>
    </StepContent>
  );
}

function EducationStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  const isTrainingAcademy =
    props.form.placementPreparation === "training_academy";
  const isOtherAcademy = props.form.academySelection === "Others";

  return (
    <StepContent
      description="This helps us personalize interview prompts around your placement context."
      title="Education Background"
    >
      <FieldGroup className="gap-6">
        <TextField
          error={props.errors.degree}
          label="Highest qualification"
          required={true}
          value={props.form.degree}
          onChange={(value) => props.onChange({ degree: value })}
        />
        <TextField
          error={props.errors.stream}
          label="Stream / Branch"
          required={true}
          value={props.form.stream}
          onChange={(value) => props.onChange({ stream: value })}
        />
        <TextField
          error={props.errors.institution}
          label="College name"
          required={true}
          value={props.form.institution}
          onChange={(value) => props.onChange({ institution: value })}
        />
        <Field>
          <FieldLabel>How are you preparing for placements?</FieldLabel>
          <Select
            value={props.form.placementPreparation}
            onValueChange={(value) =>
              props.onChange({
                placementPreparation: value ?? "",
                academySelection:
                  value === "training_academy"
                    ? props.form.academySelection
                    : "",
                academyName:
                  value === "training_academy" ? props.form.academyName : "",
              })
            }
          >
            <SelectTrigger
              aria-invalid={Boolean(props.errors.placementPreparation)}
              aria-required="true"
              className="w-full"
            >
              <SelectValue placeholder="Select preparation mode">
                {placementOptions.find(
                  (o) => o.value === props.form.placementPreparation,
                )?.label ?? "Select preparation mode"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {placementOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {props.errors.placementPreparation ? (
            <FieldDescription className="text-destructive">
              {props.errors.placementPreparation}
            </FieldDescription>
          ) : (
            <FieldDescription>
              Required for better interview personalization.
            </FieldDescription>
          )}
        </Field>
        {isTrainingAcademy ? (
          <Field>
            <FieldLabel>Select your academy</FieldLabel>
            <Select
              value={props.form.academySelection}
              onValueChange={(value) =>
                props.onChange({
                  academySelection: value ?? "",
                  academyName: value === "Others" ? props.form.academyName : "",
                })
              }
            >
              <SelectTrigger
                aria-invalid={Boolean(props.errors.academySelection)}
                aria-required="true"
                className="w-full"
              >
                <SelectValue placeholder="Select academy">
                  {academyOptions.find(
                    (o) => o.value === props.form.academySelection,
                  )?.label ?? "Select academy"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {academyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {props.errors.academySelection ? (
              <FieldDescription className="text-destructive">
                {props.errors.academySelection}
              </FieldDescription>
            ) : null}
          </Field>
        ) : null}
        {isTrainingAcademy && isOtherAcademy ? (
          <TextField
            error={props.errors.academyName}
            label="Academy name"
            required={true}
            value={props.form.academyName}
            onChange={(value) => props.onChange({ academyName: value })}
          />
        ) : null}
      </FieldGroup>
    </StepContent>
  );
}

function LanguageStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent
      description="Choose the language you are most comfortable speaking alongside English."
      title="Comfort language"
    >
      <div className="grid gap-3">
        {languageOptions.map((option) => (
          <OptionButton
            key={option.value}
            active={props.form.nativeLanguage === option.value}
            label={option.label}
            meta={option.nativeLabel}
            onClick={() => props.onChange({ nativeLanguage: option.value })}
          />
        ))}
        {props.errors.nativeLanguage ? (
          <p className="text-sm text-destructive">
            {props.errors.nativeLanguage}
          </p>
        ) : null}
      </div>
    </StepContent>
  );
}

function EnglishStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent
      description="Pick the option that feels closest to your current speaking comfort."
      title="English fluency"
    >
      <div className="grid gap-3">
        {englishOptions.map((option) => (
          <OptionButton
            key={option.value}
            active={props.form.englishLevel === option.value}
            label={option.description}
            meta={option.label}
            onClick={() => props.onChange({ englishLevel: option.value })}
          />
        ))}
        {props.errors.englishLevel ? (
          <p className="text-sm text-destructive">
            {props.errors.englishLevel}
          </p>
        ) : null}
      </div>
    </StepContent>
  );
}

function CoachStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent
      description="Choose the coach voice that will guide your practice sessions."
      title="Pick your coach"
    >
      <div className="grid grid-cols-2 gap-3">
        {coachCards.map((coach) => (
          <button
            key={coach.value}
            className={cn(
              "overflow-hidden rounded-xl bg-input/30 text-left shadow-sm transition border-4",
              props.form.coach === coach.value
                ? "border-white "
                : "border-transparent hover:border-foreground/30",
            )}
            type="button"
            onClick={() => props.onChange({ coach: coach.value })}
          >
            <div
              className="relative aspect-[1.15] overflow-hidden"
              style={{ backgroundColor: coach.tint }}
            >
              <Image
                alt={coach.title}
                className="object-cover"
                fill
                src={coach.imageSrc}
              />
            </div>
            <div className="p-3 text-center text-sm font-medium">
              {coach.title}
            </div>
          </button>
        ))}
        {props.errors.coach ? (
          <p className="col-span-2 text-sm text-destructive">
            {props.errors.coach}
          </p>
        ) : null}
      </div>
    </StepContent>
  );
}

function ReadyStepContent(props: { form: OnboardingForm }) {
  const name =
    props.form.preferredName.trim() || props.form.firstName.trim() || "there";
  const selectedCoach = coachCards.find(
    (coach) => coach.value === props.form.coach,
  );

  return (
    <StepContent
      description="Your profile is complete and ready for the diagnostic session."
      title="You're all set to begin"
    >
      <div className="-mt-2 flex flex-col gap-3">
        {selectedCoach ? (
          <div
            className="w-full aspect-square relative overflow-hidden rounded-xl"
            style={{ backgroundColor: selectedCoach.tint }}
          >
            <Image
              alt={selectedCoach.title}
              className="object-cover"
              fill
              src={selectedCoach.imageSrc}
            />
          </div>
        ) : null}
        <div className="space-y-3">
          <MessageBubble>
            Hi {name}, welcome to your personalized interview preparation.
          </MessageBubble>
          <MessageBubble>
            Let&apos;s have a quick chat about the jobs you&apos;re targeting.
            I&apos;ll use this to create your personalized diagnostic interview.
          </MessageBubble>
        </div>
      </div>
    </StepContent>
  );
}

function ReadyStepButton(props: { form: OnboardingForm }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    const validationError = validateOnboardingForm(props.form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props.form),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      router.push("/prediagnostics");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to complete onboarding.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        className="w-full bg-button"
        size="lg"
        disabled={isSubmitting}
        type="button"
        onClick={handleStart}
      >
        {isSubmitting ? <Spinner className="size-4" /> : "Finish"}
      </Button>
    </div>
  );
}

function validateStep(step: StepId, form: OnboardingForm) {
  const errors: FieldErrors = {};

  if (step === "profile") {
    if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
    if (!form.lastName.trim()) errors.lastName = "Enter your last name.";
    if (!form.preferredName.trim()) {
      errors.preferredName = "Enter what we should call you.";
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = form.email.trim()
        ? "Enter a valid email address."
        : "Enter your email address.";
    }
  }

  if (step === "education") {
    if (!form.degree.trim()) {
      errors.degree = "Enter your highest qualification.";
    }
    if (!form.stream.trim()) errors.stream = "Enter your stream or branch.";
    if (!form.institution.trim())
      errors.institution = "Enter your college name.";
    if (!form.placementPreparation) {
      errors.placementPreparation =
        "Select how you are preparing for placements.";
    }
    if (
      form.placementPreparation === "training_academy" &&
      !form.academySelection
    ) {
      errors.academySelection = "Select your academy.";
    }
    if (
      form.placementPreparation === "training_academy" &&
      form.academySelection === "Others" &&
      !form.academyName.trim()
    ) {
      errors.academyName = "Enter your academy name.";
    }
  }

  if (step === "language" && !form.nativeLanguage) {
    errors.nativeLanguage = "Select your comfort language.";
  }

  if (step === "english" && !form.englishLevel) {
    errors.englishLevel = "Select your English fluency level.";
  }

  if (step === "coach" && !form.coach) {
    errors.coach = "Select your coach.";
  }

  return errors;
}

function validateOnboardingForm(form: OnboardingForm) {
  for (const item of steps) {
    const errors = validateStep(item.id, form);
    const firstError = Object.values(errors)[0];
    if (firstError) return firstError;
  }

  return "";
}

function MessageBubble({
  children,
  delayMs,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        ` border text-black bg-lavender opacity-85 px-4 py-3 text-sm shadow-sm leading-relaxed rounded-4xl rounded-bl-sm`,
        className ?? "",
      )}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function StepContent(props: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{props.title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">
        {props.description}
      </p>
      <div className="mt-6">{props.children}</div>
    </div>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <Input
        aria-invalid={Boolean(props.error)}
        autoComplete={props.autoComplete}
        required={props.required}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.error ? (
        <FieldDescription className="text-destructive">
          {props.error}
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function OptionButton(props: {
  active: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-lg border bg-lavender opacity-85 p-4 text-left transition text-black",
        props.active
          ? "border-white"
          : "border-border hover:border-foreground/30",
      )}
      type="button"
      onClick={props.onClick}
    >
      <span>
        <span className="block text-sm font-medium leading-5">
          {props.label}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {props.meta}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
          props.active
            ? "border-[#5E41CF] bg-[#5E41CF]"
            : "border-muted-foreground",
        )}
      >
        {props.active ? <Check className="size-3 text-[background]" /> : null}
      </span>
    </button>
  );
}
