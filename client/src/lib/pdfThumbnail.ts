// Renders page 1 of a PDF (given its raw bytes) to a small preview JPEG data URL.
// Shared by the utility landings (merge / compress / …) so their "ready" card
// can show the real first page of the result instead of a generic placeholder.
//
// pdfjs-safe polyfills the Uint8Array hex methods pdfjs v5 needs on older Safari;
// importing it here guarantees they run before the dynamic pdfjs import.
import { pdfjsCompatOpts } from "@/lib/pdfjs-safe";

let pdfjsReady: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;
function loadPdfjs() {
  if (!pdfjsReady) {
    pdfjsReady = import("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).href;
      return mod;
    });
  }
  return pdfjsReady;
}

export async function renderPdfThumbnail(
  bytes: Uint8Array,
  maxWidth = 260
): Promise<string | null> {
  try {
    const pdfjsLib = await loadPdfjs();
    // Hand pdfjs a COPY — it may transfer/detach the buffer it's given, which
    // would corrupt the caller's bytes (they're reused to build the download).
    const data = bytes.slice();
    const doc = await pdfjsLib.getDocument({ data, ...pdfjsCompatOpts() }).promise;
    const page = await doc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    console.warn("[pdfThumbnail] preview failed:", err);
    return null;
  }
}
