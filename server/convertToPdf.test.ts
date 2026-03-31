/**
 * Tests for convertToPdf module
 * Validates type checking, image-to-PDF conversion, and PDF passthrough
 */
import { describe, it, expect } from "vitest";
import { convertToPdf, isConvertibleType, ACCEPTED_MIME_TYPES, ACCEPTED_EXTENSIONS } from "./convertToPdf";

describe("convertToPdf", () => {
  describe("isConvertibleType", () => {
    it("returns true for PDF", () => {
      expect(isConvertibleType("application/pdf")).toBe(true);
    });

    it("returns true for image types", () => {
      expect(isConvertibleType("image/jpeg")).toBe(true);
      expect(isConvertibleType("image/png")).toBe(true);
      expect(isConvertibleType("image/gif")).toBe(true);
      expect(isConvertibleType("image/webp")).toBe(true);
      expect(isConvertibleType("image/bmp")).toBe(true);
      expect(isConvertibleType("image/tiff")).toBe(true);
    });

    it("returns true for Office document types", () => {
      expect(isConvertibleType("application/msword")).toBe(true);
      expect(isConvertibleType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
      expect(isConvertibleType("application/vnd.ms-excel")).toBe(true);
      expect(isConvertibleType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
      expect(isConvertibleType("application/vnd.ms-powerpoint")).toBe(true);
      expect(isConvertibleType("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe(true);
    });

    it("returns true for text/html and text/plain", () => {
      expect(isConvertibleType("text/html")).toBe(true);
      expect(isConvertibleType("text/plain")).toBe(true);
    });

    it("returns false for unsupported types", () => {
      expect(isConvertibleType("application/json")).toBe(false);
      expect(isConvertibleType("video/mp4")).toBe(false);
      expect(isConvertibleType("audio/mpeg")).toBe(false);
    });
  });

  describe("ACCEPTED_MIME_TYPES", () => {
    it("includes PDF", () => {
      expect(ACCEPTED_MIME_TYPES).toContain("application/pdf");
    });

    it("includes image types", () => {
      expect(ACCEPTED_MIME_TYPES).toContain("image/jpeg");
      expect(ACCEPTED_MIME_TYPES).toContain("image/png");
    });

    it("includes Office types", () => {
      expect(ACCEPTED_MIME_TYPES).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(ACCEPTED_MIME_TYPES).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });
  });

  describe("ACCEPTED_EXTENSIONS", () => {
    it("includes common extensions", () => {
      expect(ACCEPTED_EXTENSIONS).toContain(".pdf");
      expect(ACCEPTED_EXTENSIONS).toContain(".docx");
      expect(ACCEPTED_EXTENSIONS).toContain(".xlsx");
      expect(ACCEPTED_EXTENSIONS).toContain(".pptx");
      expect(ACCEPTED_EXTENSIONS).toContain(".jpg");
      expect(ACCEPTED_EXTENSIONS).toContain(".png");
    });
  });

  describe("convertToPdf passthrough", () => {
    it("returns PDF buffer unchanged with converted=false", async () => {
      const pdfHeader = Buffer.from("%PDF-1.4 test content");
      const result = await convertToPdf(pdfHeader, "application/pdf", "test.pdf");
      expect(result.converted).toBe(false);
      expect(result.pdfBuffer).toBe(pdfHeader); // Same reference — no copy
    });
  });

  describe("convertToPdf image conversion", () => {
    it("converts a 1x1 red PNG to PDF", async () => {
      // Minimal valid 1x1 red PNG
      const sharp = (await import("sharp")).default;
      const pngBuffer = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
      }).png().toBuffer();

      const result = await convertToPdf(Buffer.from(pngBuffer), "image/png", "red.png");
      expect(result.converted).toBe(true);
      expect(result.pdfBuffer.length).toBeGreaterThan(0);
      // PDF starts with %PDF
      expect(result.pdfBuffer.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("converts JPEG to PDF", async () => {
      const sharp = (await import("sharp")).default;
      const jpgBuffer = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 128, b: 255 } },
      }).jpeg().toBuffer();

      const result = await convertToPdf(Buffer.from(jpgBuffer), "image/jpeg", "blue.jpg");
      expect(result.converted).toBe(true);
      expect(result.pdfBuffer.subarray(0, 5).toString()).toBe("%PDF-");
    });
  });

  describe("convertToPdf error handling", () => {
    it("throws for unsupported MIME type", async () => {
      const buffer = Buffer.from("not a real file");
      await expect(convertToPdf(buffer, "application/json", "data.json")).rejects.toThrow(
        "Unsupported file type"
      );
    });
  });
});
