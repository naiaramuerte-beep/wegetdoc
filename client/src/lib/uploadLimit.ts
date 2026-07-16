import { toast } from "sonner";

// Server enforces the same cap (multer `limits.fileSize`) in server/_core/index.ts.
// Keep these two in sync.
export const MAX_UPLOAD_MB = 100;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Guards a file against the upload size limit. Returns `true` when the file is
 * within the limit; when it's too large, shows a localized error toast and
 * returns `false` so the caller can bail out before uploading.
 *
 * `message` should be the `upload_too_large` i18n string, which contains a
 * `{size}` placeholder replaced here with the file's actual size in MB.
 */
export function checkUploadSize(file: File, message: string): boolean {
  if (file.size <= MAX_UPLOAD_BYTES) return true;
  const sizeMb = Math.ceil(file.size / (1024 * 1024));
  toast.error(message.replace("{size}", String(sizeMb)));
  return false;
}
