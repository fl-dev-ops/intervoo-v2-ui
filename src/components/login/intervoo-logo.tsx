import AppLogoIcon from "@/components/icons/app-logo.svg";
import { cn } from "@/lib/utils";

type IntervooLogoProps = {
  className?: string;
};

export function IntervooLogo({ className }: IntervooLogoProps) {
  return (
    <AppLogoIcon
      aria-hidden="true"
      className={cn("h-11 w-auto text-foreground", className)}
    />
  );
}
