"use client";

import { AlertCircle, CloudUpload, FileText, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-4 pb-14 pt-9 md:pt-11">
      <h1 className="max-w-[420px] text-center font-serif text-xl font-semibold leading-tight tracking-tight text-black md:text-2xl">
        Speak better. Interview better. With
        <br className="hidden sm:block" />
        India-trained voice AI.
      </h1>

      <div className="mt-8 w-full rounded-[30px] border border-[#E1DDE5] bg-white px-7 py-9 shadow-[0_24px_70px_rgba(58,37,109,0.06)] md:px-10 md:py-10">
        <div className="text-center">
          <h2 className="text-xl font-extrabold leading-none tracking-tight text-black">
            Upload your resume
          </h2>
          <p className="mx-auto mt-5 max-w-[320px] text-base leading-6 text-[#696969]">
            Help us to personalised your interview practice by analyzing your
            background
          </p>
        </div>

        <fieldset
          className={cn(
            "relative mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#D9CDED] bg-[#FCFAFF] px-5 py-7 text-center transition-colors",
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
              <Icon
                name="resume-upload"
                width={119}
                height={106}
                title="Resume document ready to upload"
              />

              {selectedFile ? (
                <div className="mt-5 flex w-full max-w-[300px] items-center gap-3 rounded-xl border border-[#E8E6EC] bg-white px-4 py-3">
                  <FileText className="size-5 shrink-0 text-[#6846E8]" />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#2D2D2D]">
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
              ) : (
                <>
                  <p className="mt-5 text-sm font-bold text-black">
                    Drag & drop your resume or{" "}
                    <label
                      className="cursor-pointer text-[#5C40CB] hover:underline"
                      htmlFor={inputId}
                    >
                      browse files
                    </label>
                  </p>
                  <p className="mt-1 text-sm text-[#888888]">
                    PDF, DOCX, DOC, or TXT
                  </p>
                </>
              )}

              <div className="mt-5">
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
                  {selectedFile ? "Replace file" : "Upload"}
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

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-8 grid">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isParsing}
            size="lg"
          >
            Parse Resume
          </Button>
        </div>

        <div className="mt-5 flex justify-center">
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
