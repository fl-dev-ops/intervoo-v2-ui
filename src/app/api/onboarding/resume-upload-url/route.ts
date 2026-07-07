import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createResumeUploadUrl,
  isAllowedResumeType,
  MAX_RESUME_FILE_SIZE,
} from "@/lib/s3";

type UploadRequest = {
  fileName?: unknown;
  fileSize?: unknown;
  fileType?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UploadRequest;
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;

    if (!fileName || !isAllowedResumeType(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload a PDF, DOC, DOCX, or TXT file." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }
    if (fileSize > MAX_RESUME_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await createResumeUploadUrl({
        contentType: fileType,
        fileName,
        fileSize,
        userId: session.user.id,
      }),
    );
  } catch (error) {
    console.error("Resume upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to prepare resume upload" },
      { status: 500 },
    );
  }
}
