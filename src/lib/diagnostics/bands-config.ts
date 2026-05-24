export type DiagnosticBand = "band1" | "band2" | "band3";

export type DiagnosticBandConfig = {
  id: DiagnosticBand;
  label: string;
  title: string;
  salary: string;
  description: string;
  companies: string[];
  accentClassName: string;
};

export const DIAGNOSTIC_BANDS: DiagnosticBandConfig[] = [
  {
    id: "band1",
    label: "Band 1",
    title: "SDE at IT Service companies",
    salary: "₹6-10 LPA",
    description:
      "Focus on aptitude, communication, and foundational domain knowledge commonly assessed.",
    companies: ["TCS Digital", "Infosys", "Wipro", "IBM", "HCL"],
    accentClassName: "text-blue-500",
  },
  {
    id: "band2",
    label: "Band 2",
    title: "SDE at Product companies",
    salary: "₹8-15 LPA",
    description:
      "Practice structured problem solving, behavioural communication, and technical fundamentals expected in growing product companies.",
    companies: ["Adobe", "Zomato", "Flipkart", "JP Morgan Tech", "Qualcomm"],
    accentClassName: "text-amber-500",
  },
  {
    id: "band3",
    label: "Band 3",
    title: "SDE at MAANG+ companies",
    salary: "₹20-40 LPA",
    description:
      "Advanced interviews that assess problem solving, system thinking, communication clarity, and depth of technical understanding.",
    companies: [
      "Google",
      "Microsoft",
      "DE Shaw",
      "NVIDIA",
      "Stripe",
      "Atlassian",
    ],
    accentClassName: "text-rose-500",
  },
] as const;

export const DEFAULT_DIAGNOSTIC_BAND: DiagnosticBand = "band2";

export function getDiagnosticBandConfig(
  band: string | null | undefined,
): DiagnosticBandConfig | undefined {
  return DIAGNOSTIC_BANDS.find((option) => option.id === band);
}

export function parseDiagnosticBand(value: unknown): DiagnosticBand | null {
  return value === "band1" || value === "band2" || value === "band3"
    ? value
    : null;
}
