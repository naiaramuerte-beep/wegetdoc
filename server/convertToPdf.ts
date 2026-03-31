/**
 * convertToPdf.ts
 * Converts various file types to PDF using:
 * - @matbee/libreoffice-converter (WASM) for Office docs (no native LibreOffice needed)
 * - Sharp + pdf-lib for images
 */

import * as path from "path";

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

const OFFICE_TYPES = new Set([
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
 * Singleton converter instance for reuse across requests.
 * Uses createWorkerConverter for non-blocking server usage.
 */
let converterPromise: Promise<any> | null = null;

async function getConverter() {
  if (!converterPromise) {
    converterPromise = (async () => {
      try {
        const { createWorkerConverter } = await import("@matbee/libreoffice-converter/server");
        const converter = await createWorkerConverter();
        console.log("[ConvertToPdf] LibreOffice WASM converter initialized");
        return converter;
      } catch (err) {
        console.error("[ConvertToPdf] Failed to initialize WASM converter:", err);
        converterPromise = null;
        throw err;
      }
    })();
  }
  return converterPromise;
}

/**
 * Convert Office/HTML/text documents to PDF using LibreOffice WASM
 */
async function officeToPdf(buffer: Buffer, originalName: string): Promise<Buffer> {
  const converter = await getConverter();
  const result = await converter.convert(buffer, { outputFormat: "pdf" });
  return Buffer.from(result.data);
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

  if (OFFICE_TYPES.has(mimeType)) {
    const pdfBuffer = await officeToPdf(buffer, originalName);
    return { pdfBuffer, converted: true };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export function isConvertibleType(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    IMAGE_TYPES.has(mimeType) ||
    OFFICE_TYPES.has(mimeType)
  );
}

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  ...Array.from(IMAGE_TYPES),
  ...Array.from(OFFICE_TYPES),
];

export const ACCEPTED_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.html,.txt";
