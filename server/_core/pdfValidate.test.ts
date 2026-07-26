import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { validatePdfBuffer } from "./pdfValidate";

async function makeValidPdf(pages = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([300, 300]);
    p.drawText(`page ${i + 1}`);
  }
  return Buffer.from(await doc.save());
}

describe("validatePdfBuffer", () => {
  it("accepts a real 1-page PDF", async () => {
    const r = await validatePdfBuffer(await makeValidPdf(1));
    expect(r.ok).toBe(true);
    expect(r.pages).toBe(1);
  });

  it("accepts a real multi-page PDF", async () => {
    const r = await validatePdfBuffer(await makeValidPdf(3));
    expect(r.ok).toBe(true);
    expect(r.pages).toBe(3);
  });

  it("rejects a tiny/empty buffer (too-small)", async () => {
    const r = await validatePdfBuffer(Buffer.from("hi"));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-small");
  });

  it("rejects a 0-byte buffer", async () => {
    const r = await validatePdfBuffer(Buffer.alloc(0));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-small");
  });

  it("rejects a big non-PDF blob (no %PDF header)", async () => {
    const r = await validatePdfBuffer(Buffer.alloc(5000, 0));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-header");
  });

  it("rejects a %PDF header without %%EOF trailer", async () => {
    const buf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2000, 32)]);
    const r = await validatePdfBuffer(buf);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-eof");
  });

  it("rejects a corrupt PDF that has header + %%EOF but no valid pages", async () => {
    const buf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2000, 32), Buffer.from("%%EOF")]);
    const r = await validatePdfBuffer(buf);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/parse-failed|no-pages/);
  });
});
