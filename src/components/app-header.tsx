"use client";

import { BadgeHelp, BriefcaseBusiness, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type AppHeaderProps = {
  displayOnly?: boolean;
  user?: { email: string | null; name: string | null } | null;
  onLogout?: () => void;
};

function getInitial(user: { email: string | null; name: string | null }) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

export function AppHeader({
  displayOnly = false,
  user,
  onLogout,
}: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    if (onLogout) {
      onLogout();
      return;
    }
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <header className="border-b border-[#EDEAF0] bg-white">
      <div className="mx-auto flex h-16 w-full max-w-225 items-center justify-between px-4 md:h-[72px]">
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
        {user && displayOnly ? (
          <div className="flex size-9 items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white">
            {getInitial(user)}
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#242225] text-sm font-bold text-white transition hover:ring-2 hover:ring-[#6C47FF]/30"
                />
              }
            >
              {getInitial(user)}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-56 rounded-2xl p-3 border border-[#E5E2E7] bg-white shadow-[0_18px_45px_rgba(31,27,36,0.14)]"
            >
              <div className="px-1 pb-2">
                <p className="truncate text-base font-medium text-[#2F2B35]">
                  {user.name?.trim() || "User"}
                </p>
                {user.email ? (
                  <p className="mt-1 truncate text-sm text-[#8A858E]">
                    {user.email}
                  </p>
                ) : null}
              </div>

              <DropdownMenuSeparator className="mx-0 mb-3" />

              <DropdownMenuItem
                className="rounded-xl px-3 py-3 text-sm font-medium text-[#2F2B35] hover:bg-[#F5F3F7] focus:bg-[#F5F3F7]"
                onClick={() => router.push("/profile")}
              >
                <BriefcaseBusiness className="mr-2 size-5 text-[#56515A]" />
                Profile edit
              </DropdownMenuItem>

              <DropdownMenuItem className="mt-1 rounded-xl px-3 py-3 text-sm font-medium text-[#2F2B35] hover:bg-[#F5F3F7] focus:bg-[#F5F3F7]">
                <BadgeHelp className="mr-2 size-5 text-[#56515A]" />
                Having issue?
              </DropdownMenuItem>

              <DropdownMenuSeparator className="mx-0 my-3" />

              <DropdownMenuItem
                className="rounded-xl px-3 py-3 text-sm font-medium text-[#2F2B35] hover:bg-[#F5F3F7] focus:bg-[#F5F3F7]"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-5 text-[#56515A]" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : user === undefined ? (
          <div className="size-9 animate-pulse rounded-full bg-[#E4E0E7]" />
        ) : null}
      </div>
    </header>
  );
}
