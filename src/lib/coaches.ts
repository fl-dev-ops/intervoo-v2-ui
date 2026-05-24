export type CoachOption = "Sara" | "arjun";

export const coachCards = [
  {
    value: "Sara",
    title: "Sara",
    imageSrc: "/agent/sara.png",
    tint: "#b8b25b",
  },
  {
    value: "arjun",
    title: "Arjun",
    imageSrc: "/agent/arjun.png",
    tint: "#8ea5c4",
  },
] as const satisfies Array<{
  value: CoachOption;
  title: string;
  imageSrc: string;
  tint: string;
}>;
