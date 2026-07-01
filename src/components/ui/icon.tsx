import type { SVGProps } from "react";

const iconRegistry = {
  "app-logo": AppLogoIcon,
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

function AppLogoIcon({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 38 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{title ?? "Intervoo logo"}</title>
      <path
        d="M28.4978 16.2053C29.8313 16.2053 30.9119 17.2859 30.9119 18.6193C30.9119 19.9527 29.8312 21.0334 28.4978 21.0334C27.1645 21.0334 26.0838 19.9527 26.0838 18.6193C26.0838 17.2859 27.1644 16.2053 28.4978 16.2053ZM23.4148 2.85175C26.6323 -0.892654 32.4072 -0.959508 35.7107 2.70917C39.9338 7.39937 36.0704 14.3165 30.4949 14.1017C30.1387 14.953 29.2977 15.551 28.3172 15.551C27.0141 15.5508 25.9578 14.4947 25.9578 13.1916V11.7287C25.9578 9.82904 27.8248 8.50375 29.6072 9.10761L29.6922 9.13788L29.9178 9.22284C31.966 9.98913 33.6667 7.49263 32.2039 5.86737C30.8043 4.31311 28.357 4.34158 26.9939 5.92792L17.7127 16.7287C13.7613 21.3272 6.67326 21.4188 2.60429 16.924C-1.06332 12.8725 -0.827919 6.63505 3.12578 2.86737C7.09143 -0.91144 13.3549 -0.837109 17.2254 3.04413L17.2928 3.11152C18.213 4.0343 18.2107 5.52919 17.2879 6.44941C16.3651 7.36913 14.871 7.36713 13.951 6.44452L13.8836 6.37616C11.8266 4.31351 8.49322 4.27146 6.38164 6.28339C4.27805 8.28787 4.1548 11.6055 6.10234 13.757C8.26507 16.1462 12.0332 16.0976 14.1336 13.6535L23.4148 2.85175Z"
        fill="#242424"
      />
    </svg>
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
