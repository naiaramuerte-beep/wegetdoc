import { useEffect, useState } from "react";
import { CheckCircle, ArrowRight, FileText, Download, Loader2, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function PaymentSuccess() {
  const utils = trpc.useUtils();
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [docName, setDocName] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  useEffect(() => {
    // Invalidate subscription status so it refreshes
    utils.subscription.status.invalidate();

    // Check if there's a pending document to deliver
    const pendingDocId = localStorage.getItem("pdfpro_pending_doc_id");
    const pendingDocName = localStorage.getItem("pdfpro_pending_doc_name");
    const pendingDocUrl = localStorage.getItem("pdfpro_pending_doc_url");

    if (pendingDocId && pendingDocUrl) {
      setDocName(pendingDocName ?? "document.pdf");
      setDocUrl(pendingDocUrl);
      setDownloadState("downloading");

      // Auto-download the PDF from S3
      const triggerDownload = async () => {
        try {
          const response = await fetch(pendingDocUrl);
          if (!response.ok) throw new Error("Failed to fetch PDF");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = pendingDocName ?? "document.pdf";
          a.click();
          URL.revokeObjectURL(url);
          setDownloadState("done");
          // Clear localStorage after successful delivery
          localStorage.removeItem("pdfpro_pending_doc_id");
          localStorage.removeItem("pdfpro_pending_doc_name");
          localStorage.removeItem("pdfpro_pending_doc_url");
        } catch (err) {
          console.error("Auto-download failed:", err);
          setDownloadState("error");
        }
      };

      // Small delay to let the page render first
      setTimeout(triggerDownload, 800);
    }
  }, []);

  const handleManualDownload = async () => {
    if (!docUrl || !docName) return;
    setDownloadState("downloading");
    try {
      const response = await fetch(docUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docName;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadState("done");
    } catch {
      setDownloadState("error");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "oklch(0.98 0.005 250)" }}
    >
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.12)" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "oklch(0.55 0.22 260)" }} />
      </div>

      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
      >
        ¡Pago completado!
      </h1>
      <p
        className="text-base mb-8 max-w-md"
        style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
      >
        Tu suscripción está activa. Ya puedes descargar y usar todas las herramientas PDF sin restricciones.
      </p>

      {/* PDF delivery section */}
      {docUrl && (
        <div
          className="w-full max-w-sm mb-6 p-5 rounded-xl text-left"
          style={{
            backgroundColor: "oklch(0.55 0.22 260 / 0.06)",
            border: "1px solid oklch(0.55 0.22 260 / 0.25)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
            <span
              className="font-semibold text-sm truncate"
              style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
            >
              {docName}
            </span>
          </div>

          {downloadState === "downloading" && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.45 0.02 250)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Descargando tu documento...</span>
            </div>
          )}

          {downloadState === "done" && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.40 0.18 150)" }}>
              <CheckCircle className="w-4 h-4" />
              <span>¡Documento descargado correctamente!</span>
            </div>
          )}

          {downloadState === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: "oklch(0.50 0.20 30)" }}>
                La descarga automática falló. Haz clic para descargar manualmente.
              </p>
              <button
                onClick={handleManualDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
              >
                <Download className="w-4 h-4" />
                Descargar ahora
              </button>
            </div>
          )}

          {downloadState === "done" && (
            <button
              onClick={handleManualDownload}
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium underline"
              style={{ color: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
            >
              <Download className="w-3.5 h-3.5" />
              Volver a descargar
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <Link href="/dashboard">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.55 0.22 260)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <FolderOpen className="w-4 h-4" />
            Ver mis documentos
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <Link href="/">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.92 0.01 250)",
              color: "oklch(0.35 0.02 250)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <FileText className="w-4 h-4" />
            Editar otro PDF
          </button>
        </Link>
      </div>

      {/* What you can do now */}
      <div
        className="p-5 rounded-xl max-w-sm w-full text-left"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.90 0.01 250)",
        }}
      >
        <h3
          className="font-bold mb-3 text-sm"
          style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
        >
          ¿Qué puedes hacer ahora?
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "oklch(0.40 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          {[
            "Descargar PDFs editados sin marca de agua",
            "Añadir texto, firmas y anotaciones",
            "Comprimir, fusionar y dividir PDFs",
            "Convertir páginas a imágenes JPG",
            "Acceder a tus documentos en el panel",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
