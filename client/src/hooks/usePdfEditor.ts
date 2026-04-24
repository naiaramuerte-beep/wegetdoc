/* =============================================================
   EditorPDF — usePdfEditor hook
   Manages PDF state: loaded file, pages, current tool, etc.
   ============================================================= */

import { useState, useCallback, useRef } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export type PdfTool =
  | "view"
  | "text"
  | "sign"
  | "annotate"
  | "highlight"
  | "merge"
  | "split"
  | "compress"
  | "rotate"
  | "delete-page"
  | "convert-jpg"
  | "protect";

export interface PdfState {
  file: File | null;
  pdfBytes: Uint8Array | null;
  pageCount: number;
  currentPage: number;
  isLoading: boolean;
  activeTool: PdfTool;
  fileName: string;
}

export function usePdfEditor() {
  const [state, setState] = useState<PdfState>({
    file: null,
    pdfBytes: null,
    pageCount: 0,
    currentPage: 1,
    isLoading: false,
    activeTool: "view",
    fileName: "",
  });

  const pdfDocRef = useRef<PDFDocument | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setState((s) => ({ ...s, isLoading: true, fileName: file.name }));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      pdfDocRef.current = pdfDoc;
      setState((s) => ({
        ...s,
        file,
        pdfBytes: bytes,
        pageCount: pdfDoc.getPageCount(),
        currentPage: 1,
        isLoading: false,
        activeTool: "view",
      }));
    } catch (err) {
      console.error("Error loading PDF:", err);
      setState((s) => ({ ...s, isLoading: false }));
      throw err;
    }
  }, []);

  const setTool = useCallback((tool: PdfTool) => {
    setState((s) => ({ ...s, activeTool: tool }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((s) => ({
      ...s,
      currentPage: Math.max(1, Math.min(page, s.pageCount)),
    }));
  }, []);

  // ── Add text to current page ─────────────────────────────────
  const addText = useCallback(
    async (text: string, x: number, y: number, fontSize = 14, colorHex = "#000000") => {
      if (!pdfDocRef.current) return null;
      const pdfDoc = pdfDocRef.current;
      const pages = pdfDoc.getPages();
      const page = pages[state.currentPage - 1];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Parse hex color
      const r = parseInt(colorHex.slice(1, 3), 16) / 255;
      const g = parseInt(colorHex.slice(3, 5), 16) / 255;
      const b = parseInt(colorHex.slice(5, 7), 16) / 255;

      page.drawText(text, {
        x,
        y: page.getHeight() - y - fontSize,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });

      const newBytes = await pdfDoc.save();
      setState((s) => ({ ...s, pdfBytes: newBytes }));
      return newBytes;
    },
    [state.currentPage]
  );

  // ── Rotate page ──────────────────────────────────────────────
  const rotatePage = useCallback(
    async (pageIndex: number, angle: 90 | 180 | 270) => {
      if (!pdfDocRef.current) return null;
      const pdfDoc = pdfDocRef.current;
      const pages = pdfDoc.getPages();
      const page = pages[pageIndex];
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
      const newBytes = await pdfDoc.save();
      setState((s) => ({ ...s, pdfBytes: newBytes }));
      return newBytes;
    },
    []
  );

  // ── Delete page ──────────────────────────────────────────────
  const deletePage = useCallback(
    async (pageIndex: number) => {
      if (!pdfDocRef.current) return null;
      const pdfDoc = pdfDocRef.current;
      if (pdfDoc.getPageCount() <= 1) return null;
      pdfDoc.removePage(pageIndex);
      const newBytes = await pdfDoc.save();
      const newCount = pdfDoc.getPageCount();
      setState((s) => ({
        ...s,
        pdfBytes: newBytes,
        pageCount: newCount,
        currentPage: Math.min(s.currentPage, newCount),
      }));
      return newBytes;
    },
    []
  );

  // ── Split PDF ────────────────────────────────────────────────
  const splitPdf = useCallback(
    async (splitAt: number): Promise<[Uint8Array, Uint8Array] | null> => {
      if (!pdfDocRef.current) return null;
      const pdfDoc = pdfDocRef.current;
      const total = pdfDoc.getPageCount();
      if (splitAt < 1 || splitAt >= total) return null;

      const part1 = await PDFDocument.create();
      const part2 = await PDFDocument.create();

      const pages1 = await part1.copyPages(pdfDoc, Array.from({ length: splitAt }, (_, i) => i));
      pages1.forEach((p) => part1.addPage(p));

      const pages2 = await part2.copyPages(
        pdfDoc,
        Array.from({ length: total - splitAt }, (_, i) => i + splitAt)
      );
      pages2.forEach((p) => part2.addPage(p));

      return [await part1.save(), await part2.save()];
    },
    []
  );

  // ── Merge PDFs ───────────────────────────────────────────────
  const mergePdfs = useCallback(async (files: File[]): Promise<Uint8Array | null> => {
    try {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      return await merged.save();
    } catch {
      return null;
    }
  }, []);

  // ── Compress PDF (basic: re-save without compression objects) ─
  const compressPdf = useCallback(async (): Promise<Uint8Array | null> => {
    if (!pdfDocRef.current) return null;
    const pdfDoc = pdfDocRef.current;
    // Re-save with object streams (reduces size)
    const newBytes = await pdfDoc.save({ useObjectStreams: true });
    setState((s) => ({ ...s, pdfBytes: newBytes }));
    return newBytes;
  }, []);

  // ── Download helper ──────────────────────────────────────────
  // Safari requires the anchor to be in the DOM and the blob URL to outlive
  // the click() call by at least one tick; otherwise the download never
  // starts. Chromium/Firefox tolerate the short form but this pattern works
  // everywhere.
  const downloadBytes = useCallback((bytes: Uint8Array, name: string) => {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const downloadCurrent = useCallback(() => {
    if (!state.pdfBytes) return;
    downloadBytes(state.pdfBytes, state.fileName || "documento.pdf");
  }, [state.pdfBytes, state.fileName, downloadBytes]);

  return {
    state,
    pdfDocRef,
    loadFile,
    setTool,
    setPage,
    addText,
    rotatePage,
    deletePage,
    splitPdf,
    mergePdfs,
    compressPdf,
    downloadBytes,
    downloadCurrent,
  };
}
