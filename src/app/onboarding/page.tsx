"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

const steps = [
  { id: "profile", label: "Profile" },
  { id: "education", label: "Education" },
  { id: "language", label: "Language" },
  { id: "english", label: "English" },
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
};

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
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("profile");
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const currentStepIndex = steps.findIndex((item) => item.id === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/onboarding/me");
        if (response.ok) {
          const data = (await response.json()) as Partial<OnboardingForm> & {
            stage?: string;
          };

          if (data) {
            // if (data.stage === "PREDIAGNOSTICS") {
            //   router.replace("/prediagnostics");
            //   return;
            // }
            // if (data.stage === "DIAGNOSTICS") {
            //   router.replace("/diagnostics");
            //   return;
            // }
            // if (data.stage === "COMPLETED") {
            //   router.replace("/");
            //   return;
            // }

            setForm((prev) => ({
              ...prev,
              ...data,
              // Ensure optional fields are undefined if empty
              nativeLanguage:
                data.nativeLanguage || prev.nativeLanguage || undefined,
              englishLevel: data.englishLevel || prev.englishLevel || undefined,
            }));
          }
        }
      } catch {
        // Ignore fetch errors, user starts with empty form
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, []);

  function updateForm(patch: Partial<OnboardingForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function goNext() {
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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <OnboardingHeader
          currentStep={currentStepIndex + 1}
          onBack={goBack}
          progress={progress}
          showBack={currentStepIndex > 0}
          totalSteps={steps.length}
        />

        <div key={step} className="mt-8 flex-1 animate-fade-in">
          {step === "profile" ? (
            <ProfileStep form={form} onChange={updateForm} />
          ) : step === "education" ? (
            <EducationStep form={form} onChange={updateForm} />
          ) : step === "language" ? (
            <LanguageStep form={form} onChange={updateForm} />
          ) : step === "english" ? (
            <EnglishStep form={form} onChange={updateForm} />
          ) : (
            <ReadyStepContent form={form} />
          )}
        </div>

        {step !== "ready" ? (
          <div className="mt-8">
            <Button className="w-full" type="button" onClick={goNext}>
              Next
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <ReadyStepButton form={form} />
        )}
      </section>
    </main>
  );
}

function OnboardingHeader(props: {
  currentStep: number;
  totalSteps: number;
  progress: number;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <header>
      <div className="flex items-center gap-2 text-sm">
        {props.showBack && (
          <button
            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            type="button"
            onClick={props.onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <span className="font-medium text-foreground">Onboarding</span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {props.currentStep} / {props.totalSteps}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${props.progress}%` }}
        />
      </div>
    </header>
  );
}

function ProfileStep(props: {
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <StepContent
      description="Tell us what to call you before your diagnostic starts."
      title="Your basics"
    >
      <FieldGroup className="gap-6">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            autoComplete="given-name"
            label="First name"
            required={true}
            value={props.form.firstName}
            onChange={(value) => props.onChange({ firstName: value })}
          />
          <TextField
            autoComplete="family-name"
            label="Last name"
            value={props.form.lastName}
            onChange={(value) => props.onChange({ lastName: value })}
          />
        </div>
        <TextField
          label="How should we call you?"
          required={true}
          value={props.form.preferredName}
          onChange={(value) => props.onChange({ preferredName: value })}
        />
        <TextField
          autoComplete="email"
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
  form: OnboardingForm;
  onChange: (patch: Partial<OnboardingForm>) => void;
}) {
  const isTrainingAcademy =
    props.form.placementPreparation === "training_academy";
  const isOtherAcademy = props.form.academySelection === "Others";

  return (
    <StepContent
      description="This helps us personalize interview prompts around your placement context."
      title="Education and prep"
    >
      <FieldGroup className="gap-6">
        <TextField
          label="Highest qualification"
          required={true}
          value={props.form.degree}
          onChange={(value) => props.onChange({ degree: value })}
        />
        <TextField
          label="Stream / Branch"
          required={true}
          value={props.form.stream}
          onChange={(value) => props.onChange({ stream: value })}
        />
        <TextField
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
            <SelectTrigger className="w-full">
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
          <FieldDescription>
            Required for better interview personalization.
          </FieldDescription>
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
              <SelectTrigger className="w-full">
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
          </Field>
        ) : null}
        {isTrainingAcademy && isOtherAcademy ? (
          <TextField
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
      </div>
    </StepContent>
  );
}

function EnglishStep(props: {
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
      </div>
    </StepContent>
  );
}

function ReadyStepContent(props: { form: OnboardingForm }) {
  const name =
    props.form.preferredName.trim() || props.form.firstName.trim() || "there";

  return (
    <StepContent
      description="Your profile is complete and ready for the diagnostic session."
      title="You're all set to begin"
    >
      <div className="flex flex-col gap-6">
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

  async function handleStart() {
    setIsSubmitting(true);

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
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <Button
        className="w-full"
        disabled={isSubmitting}
        type="button"
        onClick={handleStart}
      >
        {isSubmitting ? <Spinner className="size-4" /> : "Finish"}
      </Button>
    </div>
  );
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
        `rounded-md border bg-input/30 px-4 py-3 text-sm shadow-sm leading-relaxed`,
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
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
  required?: boolean;
  type?: string;
}) {
  return (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <Input
        autoComplete={props.autoComplete}
        required={props.required}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
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
        "flex w-full items-center justify-between gap-4 rounded-lg border bg-input/30 p-4 text-left transition",
        props.active
          ? "border-foreground"
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
            ? "border-foreground bg-foreground"
            : "border-muted-foreground",
        )}
      >
        {props.active ? <Check className="size-3 text-background" /> : null}
      </span>
    </button>
  );
}
