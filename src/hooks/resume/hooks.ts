import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { uploadResume } from "@/lib/resume-upload-client";

/** Upload a resume file to storage, resolving to its stored URL. */
export function useUploadResume(): UseMutationResult<string, Error, File> {
  return useMutation({
    mutationFn: (file) => uploadResume(file),
  });
}
