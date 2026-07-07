import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "ap-south-1",
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
    // For Cloudflare R2, uncomment and set your R2 endpoint:
    // endpoint: requiredEnv("AWS_S3_ENDPOINT"),
    // forcePathStyle: true,
  });
}

/**
 * Uploads a PDF buffer to S3 and returns a pre-signed GET URL valid for 7 days.
 */
export async function uploadReceiptToS3(params: {
  buffer: Buffer;
  key: string; // e.g. "receipts/order_abc123.pdf"
}): Promise<string> {
  const bucket = requiredEnv("AWS_S3_BUCKET");
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: "application/pdf",
      ContentDisposition: `attachment; filename="${params.key.split("/").pop()}"`,
    }),
  );

  // Return a pre-signed GET URL (7 days = 604800 seconds)
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: params.key });
  return getSignedUrl(client, getCommand, { expiresIn: 604800 });
}
