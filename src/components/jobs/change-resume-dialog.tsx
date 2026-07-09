"use client";

import { CloudUpload, FileText, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadResume } from "@/hooks/resume/hooks";
import { PENDING_RESUME_STORAGE_KEY } from "@/lib/resume-upload-client";
import { cn } from "@/lib/utils";

type ChangeResumeDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const RESUME_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function ChangeResumeDialog({
  onOpenChange,
  open,
}: ChangeResumeDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadResume();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isProcessing = uploadMutation.isPending;

  function handleOpenChange(nextOpen: boolean) {
    if (isProcessing) return;
    if (!nextOpen) {
      setError(null);
      setSelectedFile(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleFile(file: File) {
    setError(null);

    try {
      const resumeUrl = await uploadMutation.mutateAsync(file);
      window.sessionStorage.setItem(PENDING_RESUME_STORAGE_KEY, resumeUrl);
      window.location.assign("/profile?resume=parsing");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to replace resume",
      );
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="gap-0 rounded-[28px] px-6 pb-5 pt-7 text-center sm:max-w-[414px]"
        showCloseButton={!isProcessing}
      >
        <Image
          alt="Resume ready to upload"
          className="mx-auto"
          height={170}
          src="/upload-new-resume.svg"
          width={236}
        />

        <DialogTitle className="mt-3 font-serif text-2xl font-semibold leading-tight text-black">
          Upload a new resume?
        </DialogTitle>

        <fieldset
          aria-label="Resume upload dropzone"
          className={cn(
            "mt-5 min-w-0 rounded-2xl border border-dashed border-[#8062F3] px-4 py-5 transition-colors",
            isDragging && "bg-[#F7F3FF]",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files[0];
            if (file && !isProcessing) {
              setSelectedFile(file);
              setError(null);
            }
          }}
        >
          <p className="text-sm font-semibold text-black">
            Drag &amp; drop your resume or browse files
          </p>
          <p className="mt-1 text-xs text-[#8A858E]">PDF, DOCX, DOC, or TXT</p>

          {selectedFile ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left">
              <FileText className="size-5 text-black" />
              <span className="min-w-0 flex-1 truncate text-base font-semibold text-[#353137]">
                {selectedFile.name}
              </span>
              <button
                aria-label="Remove selected resume"
                className="rounded-md p-1 text-[#8A858E] hover:bg-muted hover:text-black"
                disabled={isProcessing}
                onClick={() => setSelectedFile(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              className="mt-4"
              disabled={isProcessing}
              onClick={() => inputRef.current?.click()}
              size="lg"
              type="button"
              variant="secondary"
            >
              <CloudUpload />
              Upload
            </Button>
          )}
        </fieldset>

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogDescription className="mt-4 rounded-xl bg-[#FFF4DC] px-4 py-3 text-left text-sm leading-5 text-[#777379]">
          <strong className="text-black">Note · </strong>
          It will replace the information we&apos;ve already extracted,
          including your basic details, education, work experience, and skills.
        </DialogDescription>
        {selectedFile ? (
          <Button
            className="mt-5 w-full"
            disabled={isProcessing}
            onClick={() => void handleFile(selectedFile)}
            size="lg"
            type="button"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : null}
            {isProcessing ? "Uploading..." : "Parse resume"}
          </Button>
        ) : null}
        <input
          accept={RESUME_ACCEPT}
          className="sr-only"
          disabled={isProcessing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              setSelectedFile(file);
              setError(null);
            }
          }}
          ref={inputRef}
          type="file"
        />
      </DialogContent>
    </Dialog>
  );
}
