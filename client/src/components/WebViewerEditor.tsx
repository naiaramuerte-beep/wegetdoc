import { useEffect, useRef, useState, useCallback } from "react";
import WebViewer, { type WebViewerInstance } from "@pdftron/webviewer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { colors } from "@/lib/brand";
import PaywallModal from "./PaywallModal";
import { Download, X, FileText, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

// Map our lang codes to WebViewer language codes
const LANG_MAP: Record<string, string> = {
  es: "es", en: "en", fr: "fr", de: "de", pt: "pt-br", it: "it", nl: "nl", pl: "pl", ru: "ru", zh: "zh-cn",
};

export default function WebViewerEditor({ fileUrl, fileName = "document.pdf", onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<WebViewerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const { lang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: subData } = trpc.subscription.status.useQuery(undefined, { retry: false });
  const isPremium = subData?.isPremium ?? false;

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [pdfDataForPaywall, setPdfDataForPaywall] = useState<{ base64: string; name: string; size: number } | undefined>();
  const pendingActionRef = useRef<"download" | "save" | null>(null);

  // Init WebViewer
  useEffect(() => {
    if (!containerRef.current || !fileUrl) return;
    if (instanceRef.current) return;

    WebViewer(
      {
        path: "/webviewer/",
        initialDoc: fileUrl,
        licenseKey: "demo:1776209607211:632da47a03000000006982b900f2497bc31cb286c164c436388427a662",
        css: `
          :root { --primary-color: ${colors.primary}; }
          .Header { background: ${colors.primaryHover} !important; }
          .logo { display: none !important; }
          [data-element="logo"] { display: none !important; }
        `,
        disabledElements: [
          // Hide branding
          "logo",
          // Hide tools we don't need
          "measurementToolGroupButton",
          "redactionToolGroupButton",
          "compareButton",
          "cropToolButton",
          "calibrationToolButton",
          "stampToolButton",
          "rubberStampToolGroupButton",
          "calloutToolGroupButton",
          "arcMeasurementToolButton",
          "countToolButton",
          "perimeterMeasurementToolButton",
          "areaMeasurementToolButton",
          "ellipseMeasurementToolButton",
          "rectangularAreaMeasurementToolButton",
          // Hide WebViewer's own download/print (we use our paywall buttons)
          "downloadButton",
          "printButton",
          "saveAsButton",
        ],
      },
      containerRef.current
    ).then((instance) => {
      instanceRef.current = instance;
      const { UI, Core } = instance;

      // Enable content editing
      UI.enableFeatures([UI.Feature.ContentEdit]);

      // Set language
      const wvLang = LANG_MAP[lang] || "en";
      UI.setLanguage(wvLang);

      // Hide Apryse branding via DOM
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe?.contentDocument) {
        const style = iframe.contentDocument.createElement("style");
        style.textContent = `
          [data-element="logo"], .logo, .watermark { display: none !important; }
          .Header { background: ${colors.primaryHover} !important; }
        `;
        iframe.contentDocument.head.appendChild(style);
      }

      Core.documentViewer.addEventListener("documentLoaded", () => {
        console.log("[WebViewer] Document loaded");
        UI.setFitMode(UI.FitMode.FitWidth);
        setReady(true);
      });
    }).catch((err) => {
      console.error("[WebViewer] Init error:", err);
      toast.error("Error loading editor");
    });

    return () => {
      instanceRef.current = null;
      setReady(false);
    };
  }, [fileUrl, lang]);

  // Get PDF blob from WebViewer
  const getPdfBlob = useCallback(async (): Promise<Blob | null> => {
    if (!instanceRef.current) return null;
    const doc = instanceRef.current.Core.documentViewer.getDocument();
    if (!doc) return null;
    const data = await doc.getFileData({});
    return new Blob([new Uint8Array(data)], { type: "application/pdf" });
  }, []);

  // Helper: convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });

  // Guarded download — same logic as PdfEditor.tsx
  const handleDownload = useCallback(async () => {
    const blob = await getPdfBlob();
    if (!blob) return;

    // Premium → download immediately
    if (isPremium) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.editor_toast_downloaded ?? "PDF downloaded");
      return;
    }

    // Not premium → show paywall
    pendingActionRef.current = "download";
    const base64 = await blobToBase64(blob);
    setPdfDataForPaywall({ base64, name: fileName, size: blob.size });

    if (!isAuthenticated) {
      sessionStorage.setItem("cloudpdf_pending_action", "download");
    }
    setShowPaywall(true);
  }, [getPdfBlob, isPremium, isAuthenticated, fileName, t]);

  // After successful payment
  const handlePaymentSuccess = useCallback(async () => {
    setShowPaywall(false);
    if (pendingActionRef.current === "download") {
      const blob = await getPdfBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t.editor_toast_downloaded ?? "PDF downloaded");
      }
    }
    pendingActionRef.current = null;
  }, [getPdfBlob, fileName, t]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 44,
          backgroundColor: colors.primaryHover,
          color: "white",
          flexShrink: 0,
        }}
      >
        {/* Left: file name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <FileText size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName}
          </span>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!ready && (
            <span style={{ fontSize: 11, opacity: 0.6 }}>Loading...</span>
          )}
          <button
            onClick={handleDownload}
            disabled={!ready}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 14px", borderRadius: 6, border: "none",
              backgroundColor: "white", color: colors.primary,
              fontSize: 12, fontWeight: 600, cursor: ready ? "pointer" : "default",
              opacity: ready ? 1 : 0.5,
            }}
          >
            <Download size={14} />
            {t.editor_download ?? "Download PDF"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center",
                padding: 6, borderRadius: 6, border: "none",
                backgroundColor: "transparent", color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* WebViewer container */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0 }}
      />

      {/* Paywall modal — same as PdfEditor */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); pendingActionRef.current = null; }}
        action="download"
        pdfData={pdfDataForPaywall}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
