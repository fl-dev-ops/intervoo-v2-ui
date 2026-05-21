"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

const stepDetails = {
  coach: {
    description: "Choose your preferred agent and speak comfortably",
    title: "Pick your voice coach",
  },
  education: {
    description:
      "This helps us personalize interview prompts around your placement context.",
    title: "Education Background",
  },
  english: {
    description:
      "We’ll assess your level more accurately in a short interview.",
    title: "Your current English level?",
  },
  language: {
    description: "We’ll use this to personalize your experience.",
    title: "Your native language?",
  },
  profile: {
    description: "Tell us what to call you before your diagnostic starts.",
    title: "Build your profile",
  },
} as const satisfies Record<StepId, { description: string; title: string }>;

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
  { value: "training_academy", label: "Through a training academy" },
  { value: "self_preparing", label: "Preparing on my own" },
  { value: "not_preparing", label: "I'm not preparing currently" },
] as const;

const academyOptions = [
  { value: "DET", label: "Deshpande Educational Trust" },
  { value: "FSSA", label: "FSSA" },
  { value: "Others", label: "Others" },
] as const;

const languageOptions = [
  { value: "tamil", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "telugu", label: "Telugu", nativeLabel: "తెలుగు" },
  { value: "kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { value: "malayalam", label: "Malayalam", nativeLabel: "മലയാളം" },
  { value: "bengali", label: "Bengali", nativeLabel: "বাংলা" },
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
  const currentStepDetails = stepDetails[step];
  const isFinalStep = currentStepIndex === steps.length - 1;

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
      <main className="flex min-h-dvh items-center justify-center bg-white p-3 md:p-10">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-[#6548E4]" />
          <p className="text-sm text-slate-600">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col md:p-10">
      <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col pt-6 ">
        <OnboardingHeader
          currentStep={currentStepIndex + 1}
          title={currentStepDetails.title}
          totalSteps={steps.length}
        />

        <div className="mt-4 flex h-full flex-1 flex-col rounded-t-2xl md:rounded-2xl bg-white pt-3 p-6 md:pt-6">
          <div
            key={step}
            className="pt-2 px-1 pb-2 md:p-0 flex-1 animate-fade-in"
          >
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
            ) : (
              <CoachStep
                errors={validationErrors}
                form={form}
                onChange={updateForm}
              />
            )}
          </div>

          {isFinalStep ? (
            <OnboardingSubmitButton
              form={form}
              onBack={goBack}
              showBack={currentStepIndex > 0}
            />
          ) : (
            <OnboardingFooter
              nextLabel="Next"
              onBack={goBack}
              onNext={goNext}
              showBack={currentStepIndex > 0}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function OnboardingHeader(props: {
  currentStep: number;
  title: string;
  totalSteps: number;
}) {
  return (
    <header className="px-2 mt-2">
      <div
        className="mx-auto grid w-30 gap-2"
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
              "h-1.25 rounded-full transition-colors duration-500 ease-out",
              segment.isComplete ? "bg-[#6548E4]" : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          {props.title}
        </h2>
      </div>
    </header>
  );
}

function OnboardingFooter(props: {
  nextLabel: string;
  showBack: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <footer className="mt-auto flex items-center justify-between gap-3 pt-8">
      {props.showBack ? (
        <Button
          className="px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-[#6548E4]/20"
          type="button"
          variant="ghost"
          onClick={props.onBack}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
      <Button
        className="rounded-full min-w-32 bg-button text-white shadow-lg shadow-[#6548E4]/20 focus-visible:ring-[#6548E4]/20"
        size="lg"
        type="button"
        onClick={props.onNext}
      >
        {props.nextLabel}
        <ArrowRight className="size-4" />
      </Button>
    </footer>
  );
}

function ProfileStep(props: {
  errors: FieldErrors;
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent description={stepDetails.profile.description}>
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
    <StepContent description={stepDetails.education.description}>
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
          <FieldLabel className="font-normal leading-none text-[#6B6B6B]">
            How are you preparing for placements?
          </FieldLabel>
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
              className="h-auto w-full rounded-lg border-0 bg-[#F0EDF6] px-3 py-2 font-normal text-[#24232A] shadow-none focus-visible:border-0 focus-visible:ring-3 focus-visible:ring-[#6548E4]/20 data-placeholder:text-slate-400"
            >
              <SelectValue>
                {
                  placementOptions.find(
                    (o) => o.value === props.form.placementPreparation,
                  )?.label
                }
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
            <FieldLabel className="font-normal leading-none text-[#6B6B6B]">
              Select your academy
            </FieldLabel>
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
                className="h-auto w-full rounded-lg border-0 bg-[#F0EDF6] px-3 py-2 font-medium text-[#24232A] shadow-none focus-visible:border-0 focus-visible:ring-3 focus-visible:ring-[#6548E4]/20 data-placeholder:text-slate-400"
              >
                <SelectValue>
                  {
                    academyOptions.find(
                      (o) => o.value === props.form.academySelection,
                    )?.label
                  }
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
    <StepContent description={stepDetails.language.description}>
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
    <StepContent description={stepDetails.english.description}>
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
    <StepContent description={stepDetails.coach.description}>
      <div className="grid gap-3">
        {coachCards.map((coach) => (
          <button
            key={coach.value}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left text-slate-950 shadow-sm transition",
              props.form.coach === coach.value
                ? "border-[#6548E4] ring-2 ring-[#6548E4]/10"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            )}
            type="button"
            onClick={() => props.onChange({ coach: coach.value })}
          >
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="relative size-14 shrink-0 overflow-hidden rounded-full"
                style={{ backgroundColor: coach.tint }}
              >
                <Image
                  alt={coach.title}
                  className="object-cover"
                  fill
                  src={coach.imageSrc}
                />
              </div>
              <span>
                <span className="block text-sm font-medium leading-5">
                  {coach.title}
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">
                  Voice coach
                </span>
              </span>
            </div>
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
                props.form.coach === coach.value
                  ? "border-[#5E41CF] bg-[#5E41CF]"
                  : "border-slate-300",
              )}
            >
              {props.form.coach === coach.value ? (
                <Check className="size-3 text-white" />
              ) : null}
            </span>
          </button>
        ))}
        {props.errors.coach ? (
          <p className="text-sm text-destructive">{props.errors.coach}</p>
        ) : null}
      </div>
    </StepContent>
  );
}

function OnboardingSubmitButton(props: {
  form: OnboardingForm;
  showBack: boolean;
  onBack: () => void;
}) {
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
    <div className="mt-auto pt-8">
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <footer className="flex items-center justify-between gap-3">
        {props.showBack ? (
          <Button
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            disabled={isSubmitting}
            type="button"
            variant="ghost"
            onClick={props.onBack}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <Button
          className="rounded-full min-w-32 bg-button text-white shadow-lg shadow-[#6548E4]/20"
          size="lg"
          disabled={isSubmitting}
          type="button"
          onClick={handleStart}
        >
          {isSubmitting ? <Spinner className="size-4" /> : "Done"}
        </Button>
      </footer>
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

function StepContent(props: {
  children: React.ReactNode;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm mb-8 md:text-[17px] md:font-semibold leading-6">
        {props.description}
      </p>
      {props.children}
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
      <FieldLabel className="font-normal leading-none">
        {props.label}
      </FieldLabel>
      <Input
        aria-invalid={Boolean(props.error)}
        autoComplete={props.autoComplete}
        className="h-auto rounded-lg text-sm border-0 bg-[#F0EDF6] px-3 py-2 font-medium text-[#24232A] shadow-none placeholder:text-slate-400 focus-visible:border-0 focus-visible:ring-3 focus-visible:ring-[#6548E4]/20"
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
        "flex w-full items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left text-slate-950 shadow-sm transition",
        props.active
          ? "border-[#6548E4] ring-2 ring-[#6548E4]/10"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      )}
      type="button"
      onClick={props.onClick}
    >
      <span>
        <span className="block text-sm font-medium leading-5">
          {props.label}
        </span>
        <span className="mt-1 block text-sm font-semibold text-slate-500">
          {props.meta}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
          props.active ? "border-[#5E41CF] bg-[#5E41CF]" : "border-slate-300",
        )}
      >
        {props.active ? <Check className="size-3 text-white" /> : null}
      </span>
    </button>
  );
}
