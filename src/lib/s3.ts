import { Readable } from "node:stream";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
const RESUMES_FOLDER = process.env.S3_RESUMES_FOLDER || "diagnostics/resumes";

export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

type CreateResumeUploadUrlInput = {
  contentType: string;
  fileName: string;
  fileSize: number;
  userId: string;
};

type GetResumeFileInput = {
  key: string;
  userId: string;
};

type GetResumeObjectStreamInput = {
  key: string;
  offset: number;
  signal?: AbortSignal;
};

export function isAllowedResumeType(contentType: string) {
  return ALLOWED_RESUME_TYPES.includes(
    contentType as (typeof ALLOWED_RESUME_TYPES)[number],
  );
}

export function isResumeKeyOwnedByUser(key: string, userId: string) {
  return key.startsWith(getUserResumePrefix(userId));
}

export async function createResumeUploadUrl({
  contentType,
  fileName,
  fileSize,
  userId,
}: CreateResumeUploadUrlInput) {
  assertBucketConfigured();

  const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${getUserResumePrefix(userId)}${Date.now()}_${sanitizedFilename}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentLength: fileSize,
    ContentType: contentType,
  });

  return {
    resumeUrl: key,
    uploadUrl: await getSignedUrl(s3Client, command, { expiresIn: 300 }),
  };
}

export async function getResumeFile({ key, userId }: GetResumeFileInput) {
  assertBucketConfigured();
  if (!isResumeKeyOwnedByUser(key, userId)) {
    throw new Error("Resume file not found");
  }

  const metadata = await s3Client.send(
    new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
  );
  const contentLength = metadata.ContentLength ?? 0;
  const contentType = metadata.ContentType ?? "";

  if (contentLength <= 0 || contentLength > MAX_RESUME_FILE_SIZE) {
    throw new Error("Invalid resume file size");
  }
  if (!isAllowedResumeType(contentType)) {
    throw new Error("Invalid resume file type");
  }

  return {
    contentLength,
    contentType,
    displayName: key.slice(key.lastIndexOf("/") + 1),
    key,
  };
}

export async function getResumeObjectStream({
  key,
  offset,
  signal,
}: GetResumeObjectStreamInput): Promise<Readable> {
  assertBucketConfigured();

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Range: offset > 0 ? `bytes=${offset}-` : undefined,
    }),
    { abortSignal: signal },
  );

  if (!object.Body || !(object.Body instanceof Readable)) {
    throw new Error("Unable to read resume file");
  }

  return object.Body;
}

function assertBucketConfigured() {
  if (!BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME environment variable is not set");
  }
}

function getUserResumePrefix(userId: string) {
  return `${RESUMES_FOLDER}/${userId}/`;
}
