import type { SVGProps } from "react";

const iconRegistry = {
  "resume-upload": ResumeUploadIcon,
} as const;

export type IconName = keyof typeof iconRegistry;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  title?: string;
};

export function Icon({
  height = 24,
  name,
  title,
  width = 24,
  ...props
}: IconProps) {
  const IconArtwork = iconRegistry[name];
  const isLabelled = Boolean(
    title || props["aria-label"] || props["aria-labelledby"],
  );

  return (
    <IconArtwork
      {...props}
      aria-hidden={isLabelled ? undefined : true}
      focusable="false"
      height={height}
      role={isLabelled ? "img" : undefined}
      title={title}
      width={width}
    />
  );
}

function ResumeUploadIcon({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 119 106"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{title ?? "Resume upload illustration"}</title>

      <circle cx="45" cy="59" r="28" fill="#F0ECFF" />
      <circle cx="73" cy="47" r="25" fill="#F6F3FF" />
      <ellipse
        cx="62"
        cy="59"
        rx="39"
        ry="27"
        stroke="#B9A9FF"
        strokeDasharray="2 2"
      />

      <path d="M40 24H77L87 34V82H40V24Z" fill="white" stroke="#D9D1FF" />
      <path d="M77 24V34H87L77 24Z" fill="#7654F4" />
      <circle cx="51" cy="43" r="8" fill="#E8E1FF" />
      <circle cx="51" cy="40" r="3" fill="#9D86F5" />
      <path d="M46.5 48C47.7 44.8 54.3 44.8 55.5 48" fill="#9D86F5" />
      <path
        d="M63 42H78"
        stroke="#8063F5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M63 48H82"
        stroke="#C2B5F8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M49 57H79"
        stroke="#C9C0F1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M49 64H73"
        stroke="#C9C0F1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M49 71H78"
        stroke="#C9C0F1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="45" cy="57" r="2" fill="#A892F5" />
      <circle cx="45" cy="64" r="2" fill="#A892F5" />
      <circle cx="45" cy="71" r="2" fill="#A892F5" />

      <circle cx="86" cy="78" r="17" fill="#F9FAFC" stroke="#D8DDE8" />
      <path
        d="M86 87V72"
        stroke="#00B87A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M80.5 77.5L86 72L91.5 77.5"
        stroke="#00B87A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M79 88H93"
        stroke="#00B87A"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M28 25L24 21"
        stroke="#6846E8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M34 22L33 16"
        stroke="#6846E8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M24 32L18 30"
        stroke="#6846E8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M101 33V39M98 36H104"
        stroke="#C3B4FF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 68V74M11 71H17"
        stroke="#00B87A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
