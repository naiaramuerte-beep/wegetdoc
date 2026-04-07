// Cloudflare R2 storage helpers (S3-compatible API)
// Uses @aws-sdk/client-s3 which is already installed

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID ?? process.env.CF_R2_ACCOUNT_ID ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.CF_R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.CF_R2_SECRET_ACCESS_KEY ?? "";
  const bucketName = process.env.R2_BUCKET_NAME ?? process.env.CF_R2_BUCKET_NAME ?? "";
  const endpoint = process.env.R2_ENDPOINT ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL ?? process.env.CF_R2_PUBLIC_URL ?? ""; // e.g. https://pub-xxx.r2.dev

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "Storage credentials missing: set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

// Lazy-initialized S3 client
let _s3Client: S3Client | null = null;
function getS3Client(accountId: string, accessKeyId: string, secretAccessKey: string, endpoint?: string): S3Client {
  if (!_s3Client) {
    const resolvedEndpoint = endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
    _s3Client = new S3Client({
      region: "auto",
      endpoint: resolvedEndpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _s3Client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// ── Main exports ──────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { accountId, accessKeyId, secretAccessKey, bucketName, endpoint, publicUrl } = getR2Config();
  const key = normalizeKey(relKey);
  const client = getS3Client(accountId, accessKeyId, secretAccessKey, endpoint);

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Build public URL
  const fileUrl = publicUrl
    ? `${publicUrl}/${key}`
    : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;

  return { key, url: fileUrl };
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const { accountId, accessKeyId, secretAccessKey, bucketName, endpoint, publicUrl } = getR2Config();
  const key = normalizeKey(relKey);

  // If bucket is public, just return the public URL
  if (publicUrl) {
    return { key, url: `${publicUrl}/${key}` };
  }

  // Otherwise generate a presigned URL
  const client = getS3Client(accountId, accessKeyId, secretAccessKey, endpoint);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { key, url };
}
