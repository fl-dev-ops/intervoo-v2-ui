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

export default function confetti(_config: ConfettiConfig): void {}
