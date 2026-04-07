export type NativeLanguage = "tamil" | "hindi" | "telugu" | "kannada" | "malayalam" | "bengali";
export type EnglishLevel = "beginner" | "intermediate" | "advanced" | "native";
export type SpeakingSpeed = "normal" | "relaxed" | "slow";

export type PreScreeningSetup = {
  nativeLanguage?: NativeLanguage;
  englishLevel?: EnglishLevel;
  speakingSpeed?: SpeakingSpeed;
};

export const DEFAULT_NATIVE_LANGUAGE: NativeLanguage = "hindi";

const STORAGE_KEY = "pre_screening_setup";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const ENGLISH_LEVEL_VALUES = new Set<EnglishLevel>([
  "beginner",
  "intermediate",
  "advanced",
  "native",
]);
const SPEAKING_SPEED_VALUES = new Set<SpeakingSpeed>(["normal", "relaxed", "slow"]);

const NATIVE_LANGUAGE_ALIASES: Record<string, NativeLanguage> = {
  tamil: "tamil",
  hindi: "hindi",
  telugu: "telugu",
  kannada: "kannada",
  malayalam: "malayalam",
  bengali: "bengali",
  bangla: "bengali",
};

function normalizeNativeLanguage(value: unknown): NativeLanguage | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return NATIVE_LANGUAGE_ALIASES[normalized];
}

function normalizeEnglishLevel(value: unknown): EnglishLevel | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "native/near-native" || normalized === "native-near-native") {
    return "native";
  }
  if (!ENGLISH_LEVEL_VALUES.has(normalized as EnglishLevel)) {
    return undefined;
  }
  return normalized as EnglishLevel;
}

function normalizeSpeakingSpeed(value: unknown): SpeakingSpeed | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "1x" || normalized === "1.0x") {
    return "normal";
  }
  if (normalized === ".7x" || normalized === "0.7x") {
    return "relaxed";
  }
  if (normalized === ".5x" || normalized === "0.5x") {
    return "slow";
  }
  if (!SPEAKING_SPEED_VALUES.has(normalized as SpeakingSpeed)) {
    return undefined;
  }
  return normalized as SpeakingSpeed;
}

function parseSetup(raw: unknown): PreScreeningSetup {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const input = raw as Record<string, unknown>;
  const setup: PreScreeningSetup = {};

  const nativeLanguage = normalizeNativeLanguage(
    input.nativeLanguage ?? input.native_language ?? input.comfortable_language,
  );
  if (nativeLanguage) {
    setup.nativeLanguage = nativeLanguage;
  }

  const englishLevel = normalizeEnglishLevel(input.englishLevel ?? input.english_level);
  if (englishLevel) {
    setup.englishLevel = englishLevel;
  }

  const speakingSpeed = normalizeSpeakingSpeed(input.speakingSpeed ?? input.speaking_speed);
  if (speakingSpeed) {
    setup.speakingSpeed = speakingSpeed;
  }

  return setup;
}

export function savePreScreeningSetup(patch: Partial<PreScreeningSetup>) {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const current = raw ? parseSetup(JSON.parse(raw)) : {};
  const next = parseSetup({ ...current, ...patch });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
