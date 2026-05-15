"use client";

import Image from "next/image";
import { TriangleAlert, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "./prejoin-components";

interface PreJoinPermissionRequestProps {
  onRequestPermission: () => void;
  showBackButton?: boolean;
}

export function PreJoinPermissionRequest({
  onRequestPermission,
  showBackButton = true,
}: PreJoinPermissionRequestProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 py-8">
      <Header showBackButton={showBackButton} />
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="flex justify-center">
          <Image
            alt="Enable device access"
            className="h-auto w-full max-w-70"
            height={287}
            priority
            src="/pre-join-access.svg"
            width={280}
          />
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Allow camera & microphone access
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your camera and microphone help us conduct the interview and
              generate accurate feedback.
            </p>
          </div>

          <div className="space-y-4 flex">
            <Button
              className="mx-auto bg-button rounded-full py-3 h-auto w-full"
              type="button"
              onClick={onRequestPermission}
            >
              <VideoIcon className="size-4 mr-2" />
              Allow access and continue
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[#EFE8BE] bg-[#FFFBE8] px-5 py-4 text-[#6B6B72]">
            <TriangleAlert className="mt-1 size-5 shrink-0 text-[#E4BE3D]" />
            <p className="text-sm">
              This interview cannot be paused{" "}
              <span className="font-semibold">(~15 mins)</span> Keep your camera
              on.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
