"use client";

import { AlertCircle, CloudUpload, FileText, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import ResumeUploadIcon from "@/components/icons/resume-upload.svg";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResumeUploadStepProps {
  onParse: (file: File) => Promise<void>;
  onSkip: () => void;
  onContinue?: () => void;
  isParsing: boolean;
  error: string | null;
  uploadedFileName?: string;
}

export function ResumeUploadStep({
  onParse,
  onSkip,
  onContinue,
  isParsing,
  error,
  uploadedFileName,
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
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
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
    <div className="mx-auto flex w-full max-w-[680px] flex-col items-center px-4 pb-14 pt-9 md:pt-11">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-black">
          Upload your resume
        </h1>
        <p className="mx-auto mt-4 max-w-[480px] text-base leading-6 text-[#696969]">
          Help us personalise your interview practice by <br />
          analyzing your background.
        </p>
      </div>

      <div className="mt-7 w-full max-w-[400px] rounded-[30px] border border-[#E1DDE5] bg-white px-6 py-8 shadow-[0_24px_70px_rgba(58,37,109,0.06)] md:px-8 md:py-8 md:pb-4">
        <fieldset
          className={cn(
            "relative flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-[#C9BCF9] bg-[#FCFAFF] p-4 text-center transition-colors",
            dragActive && "border-[#6846E8] bg-[#F6F1FF]",
            isParsing && "pointer-events-none opacity-50",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <legend className="sr-only">Resume upload</legend>
          {isParsing ? (
            <>
              <Loader2 className="size-7 animate-spin text-[#6846E8]" />
              <p className="mt-4 text-sm font-semibold text-black">
                Analyzing your resume...
              </p>
            </>
          ) : (
            <>
              <ResumeUploadIcon
                width={160}
                height={160}
                role="img"
                title="Resume document ready to upload"
              />

              <p className=" text-base font-semibold text-black">
                Drag & drop your resume or{" "}
                <label className="cursor-pointer underline" htmlFor={inputId}>
                  browse files
                </label>
              </p>
              <p className="mt-1 text-xs text-[#888888]">
                PDF, DOCX, DOC, or TXT
              </p>

              <div className="mt-6">
                <label
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: "secondary",
                    }),
                  )}
                  htmlFor={inputId}
                >
                  <CloudUpload />
                  Upload
                </label>
              </div>
            </>
          )}
          <input
            id={inputId}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="sr-only"
          />
        </fieldset>

        {selectedFile ? (
          <div className="mt-6 flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#E8E6EC] bg-[#F8F7F9] px-5 py-3">
            <FileText className="size-6 shrink-0 text-black" />
            <p className="min-w-0 flex-1 truncate text-base font-bold text-[#2D2D2D]">
              {selectedFile.name}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={removeFile}
              aria-label="Remove selected file"
            >
              <X />
            </Button>
          </div>
        ) : uploadedFileName ? (
          <div className="mt-6 flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#E8E6EC] bg-[#F8F7F9] px-5 py-3">
            <FileText className="size-6 shrink-0 text-black" />
            <p className="min-w-0 flex-1 truncate text-base font-bold text-[#2D2D2D]">
              {uploadedFileName}
            </p>
          </div>
        ) : null}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-4 grid">
          {!selectedFile && uploadedFileName ? (
            <Button onClick={onContinue} size="lg">
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isParsing}
              size="lg"
            >
              Parse Resume
            </Button>
          )}
        </div>

        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="link"
            onClick={onSkip}
            disabled={isParsing}
          >
            I do not have resume
          </Button>
        </div>
      </div>
    </div>
  );
}
