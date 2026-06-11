"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumeUploadStepProps {
  onParse: (file: File) => Promise<void>;
  onSkip: () => void;
  isParsing: boolean;
  error: string | null;
}

export function ResumeUploadStep({
  onParse,
  onSkip,
  isParsing,
  error,
}: ResumeUploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputId = "resume-upload-input";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onParse(selectedFile);
    }
  };

  const removeFile = () => setSelectedFile(null);

  return (
    <div className="mx-auto flex w-full max-w-[454px] flex-col items-center px-4 pt-9 md:pt-11">
      <h1 className="max-w-[420px] text-center text-lg font-extrabold leading-tight tracking-tight text-black md:text-xl">
        Speak better. Interview better. With<br className="hidden sm:block" />
        India-trained voice AI.
      </h1>

      <div className="mt-8 w-full rounded-[24px] border border-[#E6E1EC] bg-white px-7 py-8 shadow-[0_24px_70px_rgba(58,37,109,0.08)] md:px-8 md:py-9">
        <div className="text-center">
          <h2 className="text-xl font-extrabold leading-none tracking-tight text-black">
            Upload your resume
          </h2>
          <p className="mx-auto mt-5 max-w-[320px] text-base leading-6 text-[#696969]">
            Upload your resume to get interview questions tailored to your
            experience.
          </p>
        </div>

        <label
          htmlFor={inputId}
          className={cn(
            "relative mt-8 flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[#D9CDED] bg-[#FCFAFF] px-4 text-center transition-colors",
            dragActive && "border-[#6846E8] bg-[#F6F1FF]",
            isParsing && "pointer-events-none opacity-50",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isParsing ? (
            <>
              <Loader2 className="size-7 animate-spin text-[#6846E8]" />
              <p className="mt-4 text-sm font-semibold text-black">
                Analyzing your resume...
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="size-7 text-black" strokeWidth={2.2} />
              <p className="mt-4 text-sm font-bold text-black">
                Drag & drop your resume or browse files
              </p>
              <p className="mt-1 text-sm text-[#888888]">PDF, DOCX, DOC, or TXT</p>
            </>
          )}
          <input
            id={inputId}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {selectedFile && !isParsing && (
          <div className="mt-4 flex items-center gap-4 rounded-[14px] border border-[#E8E6EC] bg-white px-4 py-3.5">
            <FileText className="size-6 shrink-0 text-black" />
            <p className="min-w-0 flex-1 truncate text-base font-bold text-[#2D2D2D]">
              {selectedFile.name}
            </p>
            <button
              type="button"
              onClick={removeFile}
              className="rounded-full p-1 text-[#8E8E8E] transition hover:bg-[#F2EFF8] hover:text-black"
              aria-label="Remove selected file"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isParsing}
          className="mt-7 h-[54px] w-full rounded-full bg-gradient-to-r from-[#5436B8] to-[#7149F6] text-base font-bold text-white shadow-none transition hover:from-[#4B2EAA] hover:to-[#6846E8] disabled:opacity-50"
        >
          Continue
        </Button>

        <button
          type="button"
          onClick={onSkip}
          disabled={isParsing}
          className="mt-7 w-full text-center text-base font-bold text-[#5C3BD8] transition hover:text-[#4322B4] disabled:opacity-50"
        >
          I do not have resume
        </button>
      </div>
    </div>
  );
}
