// Cloudflare R2 storage helpers (S3-compatible API)
// Uses @aws-sdk/client-s3 which is already installed

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.CF_R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID ?? "";
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucketName = process.env.CF_R2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME ?? "";
  const publicUrl = process.env.CF_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL ?? ""; // e.g. https://pub-xxx.r2.dev

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    // Fallback: check if Manus forge API is available
    const forgeUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
    const forgeKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
    if (forgeUrl && forgeKey) {
      return { mode: "manus" as const, forgeUrl, forgeKey };
    }
    throw new Error(
      "Storage credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME " +
      "or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return {
    mode: "r2" as const,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

// Lazy-initialized S3 client
let _s3Client: S3Client | null = null;
function getS3Client(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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

// ── Manus Forge fallback helpers ──────────────────────────────
function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function manusStoragePut(
  forgeUrl: string,
  forgeKey: string,
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = new URL("v1/storage/upload", ensureTrailingSlash(forgeUrl));
  url.searchParams.set("path", key);

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(url, {
    method: "POST",
    headers: buildAuthHeaders(forgeKey),
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }
  const resultUrl = (await response.json()).url;
  return { key, url: resultUrl };
}

async function manusStorageGet(
  forgeUrl: string,
  forgeKey: string,
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(forgeUrl));
  downloadApiUrl.searchParams.set("path", key);
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(forgeKey),
  });
  return { key, url: (await response.json()).url };
}

// ── Main exports ──────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getR2Config();

  // Manus fallback
  if (config.mode === "manus") {
    return manusStoragePut(config.forgeUrl, config.forgeKey, relKey, data, contentType);
  }

  // Cloudflare R2
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = config;
  const key = normalizeKey(relKey);
  const client = getS3Client(accountId, accessKeyId, secretAccessKey);

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
  const config = getR2Config();

  // Manus fallback
  if (config.mode === "manus") {
    return manusStorageGet(config.forgeUrl, config.forgeKey, relKey);
  }

  // Cloudflare R2
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = config;
  const key = normalizeKey(relKey);

  // If bucket is public, just return the public URL
  if (publicUrl) {
    return { key, url: `${publicUrl}/${key}` };
  }

  // Otherwise generate a presigned URL
  const client = getS3Client(accountId, accessKeyId, secretAccessKey);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { key, url };
}
