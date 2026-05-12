export type CoachOption = "sana" | "arjun";

export const coachCards = [
  {
    value: "sana",
    title: "Sana",
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
