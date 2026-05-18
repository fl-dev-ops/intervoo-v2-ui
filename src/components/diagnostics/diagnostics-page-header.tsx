"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type DiagnosticsHeaderUser = {
  email: string | null;
  name: string | null;
};

type DiagnosticsPageHeaderProps = {
  title: string;
  user: DiagnosticsHeaderUser;
};

export function DiagnosticsPageHeader({
  title,
  user,
}: DiagnosticsPageHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <header className="bg-white md:bg-transparent ">
      <div className="flex items-center justify-between gap-4 px-3 py-3 md:px-4">
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#4D7ED8] bg-[#4D7ED8] text-lg font-semibold text-white shadow-[inset_0_0_0_3px_white] transition hover:bg-[#416FC1] md:size-12"
            type="button"
          >
            {getUserInitial(user)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function getUserInitial(user: DiagnosticsHeaderUser) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}
