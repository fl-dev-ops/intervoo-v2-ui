import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Config() {
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new Error("S3 configuration is incomplete");
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

function createS3Client() {
  const config = getS3Config();

  return {
    client: new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      forcePathStyle: config.forcePathStyle,
    }),
    bucket: config.bucket,
  };
}

export async function getPreScreenRecordingDownloadUrl(
  sessionId: string,
  expiresInSeconds = 60 * 15,
) {
  const { client, bucket } = createS3Client();
  const key = `pre-screen-sessions/${sessionId}.mp4`;

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  );
}
