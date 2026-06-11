"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";

type AppHeaderProps = {
  user?: { email: string | null; name: string | null } | null;
  onLogout?: () => void;
};

function getInitial(user: { email: string | null; name: string | null }) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  return (
    <header className="border-b border-[#EDEAF0] bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6 md:h-[72px]">
        <div className="flex items-center gap-3">
          <Image
            src="/intervoo-logo-light.svg"
            alt="Intervoo"
            width={38}
            height={22}
            className="brightness-0"
            priority
          />
          <div className="hidden leading-none sm:block">
            <p className="text-base font-extrabold tracking-tight text-black">
              Intervoo.ai
            </p>
            <p className="mt-1 text-xs text-black/80">by Foreverlearning.in</p>
          </div>
        </div>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex size-10 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#F4F1FA] hover:text-black"
            aria-label="Logout"
          >
            <LogOut className="size-5" />
          </button>
        ) : user ? (
          <div className="flex size-9 items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white">
            {getInitial(user)}
          </div>
        ) : null}
      </div>
    </header>
  );
}
