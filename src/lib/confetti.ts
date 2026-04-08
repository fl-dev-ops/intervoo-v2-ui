const CELEBRATION_X_POSITIONS = [0.18, 0.35, 0.5, 0.65, 0.82] as const;

type ConfettiConfig = {
  position: {
    x: number;
    y: number;
  };
  count: number;
  size: number;
  velocity: number;
  fade: boolean;
};

type ConfettiModule = {
  default: (config: ConfettiConfig) => void;
};

export async function triggerCelebrationConfetti(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const confettiModule = (await import("@hiseb/confetti")) as ConfettiModule;

  CELEBRATION_X_POSITIONS.forEach((x) => {
    confettiModule.default({
      position: { x: window.innerWidth * x, y: 0 },
      count: 30,
      size: 1.1,
      velocity: 180,
      fade: false,
    });
  });
}
