/**
 * convertToPdf.ts
 * Converts various file types to PDF using LibreOffice (Office docs) and Sharp (images).
 * Always returns a Buffer containing the PDF bytes.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

const execFileAsync = promisify(execFile);

export type SupportedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/jpg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/bmp"
  | "image/tiff"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.ms-powerpoint"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "text/html"
  | "text/plain";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);

const LIBREOFFICE_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/html",
  "text/plain",
]);

/**
 * Convert image buffer to PDF using Sharp + pdf-lib
 */
async function imageToPdf(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { PDFDocument } = await import("pdf-lib");

  // Convert to PNG first for consistent handling
  const pngBuffer = await sharp(buffer).png().toBuffer();
  const metadata = await sharp(pngBuffer).metadata();
  const width = metadata.width ?? 595;
  const height = metadata.height ?? 842;

  // Create PDF with image dimensions (convert px to points at 72dpi)
  const pdfDoc = await PDFDocument.create();

  // A4 max: scale down if larger, keep aspect ratio
  const A4_W = 595;
  const A4_H = 842;
  let pdfW = width;
  let pdfH = height;
  if (width > A4_W || height > A4_H) {
    const scale = Math.min(A4_W / width, A4_H / height);
    pdfW = Math.round(width * scale);
    pdfH = Math.round(height * scale);
  }

  const page = pdfDoc.addPage([pdfW, pdfH]);
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(pngImage, { x: 0, y: 0, width: pdfW, height: pdfH });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Convert Office/HTML/text documents to PDF using LibreOffice headless
 */
async function libreOfficeToPdf(buffer: Buffer, originalName: string): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-convert-"));
  const ext = path.extname(originalName) || ".tmp";
  const inputPath = path.join(tmpDir, `input${ext}`);
  const outputPath = path.join(tmpDir, "input.pdf");

  try {
    fs.writeFileSync(inputPath, buffer);

    await execFileAsync("libreoffice", [
      "--headless",
      "--norestore",
      "--nologo",
      "--nofirststartwizard",
      "--convert-to",
      "pdf",
      "--outdir",
      tmpDir,
      inputPath,
    ], { timeout: 60000 });

    if (!fs.existsSync(outputPath)) {
      // LibreOffice may name it differently
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith(".pdf"));
      if (files.length === 0) throw new Error("LibreOffice conversion produced no PDF");
      return fs.readFileSync(path.join(tmpDir, files[0]));
    }

    return fs.readFileSync(outputPath);
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Main conversion function.
 * Returns the original buffer if already PDF, otherwise converts.
 */
export async function convertToPdf(
  buffer: Buffer,
  mimeType: string,
  originalName: string = "file"
): Promise<{ pdfBuffer: Buffer; converted: boolean }> {
  // Already a PDF — return as-is
  if (mimeType === "application/pdf") {
    return { pdfBuffer: buffer, converted: false };
  }

  if (IMAGE_TYPES.has(mimeType)) {
    const pdfBuffer = await imageToPdf(buffer, mimeType);
    return { pdfBuffer, converted: true };
  }

  if (LIBREOFFICE_TYPES.has(mimeType)) {
    const pdfBuffer = await libreOfficeToPdf(buffer, originalName);
    return { pdfBuffer, converted: true };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export function isConvertibleType(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    IMAGE_TYPES.has(mimeType) ||
    LIBREOFFICE_TYPES.has(mimeType)
  );
}

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  ...Array.from(IMAGE_TYPES),
  ...Array.from(LIBREOFFICE_TYPES),
];

export const ACCEPTED_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.html,.txt";
