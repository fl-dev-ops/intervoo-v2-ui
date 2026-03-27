export type PreScreeningSetup = {
  nativeLanguage?: string;
  englishLevel?: string;
  speakingSpeed?: string;
};

const STORAGE_KEY = "pre_screening_setup";

export function getPreScreeningSetup(): PreScreeningSetup {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as PreScreeningSetup;
  } catch {
    return {};
  }
}

export function savePreScreeningSetup(patch: Partial<PreScreeningSetup>) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getPreScreeningSetup();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}

export function hasCompletedPreScreeningSetup(setup = getPreScreeningSetup()) {
  return Boolean(setup.nativeLanguage && setup.englishLevel && setup.speakingSpeed);
}
