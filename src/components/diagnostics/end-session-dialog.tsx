"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const MIN_TURNS_FOR_REPORT = 6;

export function useEndSessionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"confirm" | "need-more">(
    "confirm",
  );
  const [exchangeCount, setExchangeCount] = useState(0);

  const incrementExchange = () => {
    setExchangeCount((c) => c + 1);
  };

  const promptEnd = (messageCount = exchangeCount) => {
    if (messageCount >= MIN_TURNS_FOR_REPORT) {
      setDialogMode("confirm");
    } else {
      setDialogMode("need-more");
    }
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  return {
    isOpen,
    dialogMode,
    exchangeCount,
    incrementExchange,
    promptEnd,
    close,
  };
}

export function EndSessionDialog({
  isOpen,
  mode,
  onConfirmEnd,
  onContinue,
  onClose,
}: {
  isOpen: boolean;
  mode: "confirm" | "need-more";
  onConfirmEnd: () => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const isConfirm = mode === "confirm";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-5 backdrop-blur-sm md:items-center">
      <div className="relative w-full max-w-sm rounded-[24px] border border-black/5 bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <Image
            src={isConfirm ? "/end-session.svg" : "/no-response.svg"}
            alt=""
            width={isConfirm ? 94 : 106}
            height={isConfirm ? 100 : 99}
            className="mb-7 h-28 w-auto"
          />

          {/* Title */}
          <h3 className="w-full text-left text-lg font-bold tracking-tight text-zinc-950">
            {isConfirm
              ? "Do you want to end this Interview?"
              : "We need more responses"}
          </h3>

          {/* Description */}
          <p className="mt-3 w-full text-left text-md leading-relaxed text-slate-500">
            {isConfirm
              ? "Your responses so far will be saved and you'll receive feedback on whatsapp"
              : "You haven't spoken enough to generate your interview report yet. Continue the interview or retake it later to view the complete report."}
          </p>

          {/* Actions */}
          <div className="mt-8 flex w-full flex-col-reverse gap-3 md:flex-row md:justify-end">
            <Button
              className="h-12 rounded-full bg-red-500 px-6 text-base font-bold text-white hover:bg-red-600 md:min-w-40"
              onClick={onConfirmEnd}
              size="lg"
              type="button"
            >
              {isConfirm ? "End Interview" : "Exit Interview"}
            </Button>

            <Button
              className="h-12 rounded-full bg-violet-700 px-6 text-base font-bold text-white hover:bg-violet-800 md:min-w-36"
              onClick={onContinue}
              size="lg"
              type="button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
