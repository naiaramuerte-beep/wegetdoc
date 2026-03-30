/* =============================================================
   CloudPDF PdfViewer — renders PDF pages using pdfjs-dist canvas
   ============================================================= */

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PdfViewerProps {
  pdfBytes: Uint8Array | null;
  currentPage: number;
  onPageCount?: (count: number) => void;
  scale?: number;
}

export default function PdfViewer({
  pdfBytes,
  currentPage,
  onPageCount,
  scale = 1.4,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(async () => {
    if (!pdfBytes || !canvasRef.current) return;

    // Cancel any ongoing render
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
    }

    setIsRendering(true);
    setError(null);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
      const pdf = await loadingTask.promise;

      if (onPageCount) onPageCount(pdf.numPages);

      const pageNum = Math.max(1, Math.min(currentPage, pdf.numPages));
      const page = await pdf.getPage(pageNum);

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      });

      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF render error:", err);
        setError("Error al renderizar el PDF. Por favor, intenta con otro archivo.");
      }
    } finally {
      setIsRendering(false);
    }
  }, [pdfBytes, currentPage, scale, onPageCount]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  if (!pdfBytes) return null;

  return (
    <div className="relative flex justify-center">
      {isRendering && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
          style={{ backgroundColor: "oklch(0.98 0.005 250 / 0.8)" }}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "oklch(0.55 0.22 260)", borderTopColor: "transparent" }}
            />
            <span
              className="text-xs"
              style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Renderizando...
            </span>
          </div>
        </div>
      )}
      {error ? (
        <div
          className="flex items-center justify-center p-8 rounded-lg text-sm"
          style={{
            backgroundColor: "oklch(0.97 0.01 30)",
            color: "oklch(0.50 0.15 30)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-lg max-w-full"
          style={{ boxShadow: "0 4px 24px oklch(0.18 0.04 250 / 0.15)" }}
        />
      )}
    </div>
  );
}
