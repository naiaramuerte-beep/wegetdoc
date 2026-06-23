/* =============================================================
   ConverterPage — PDF → Office/Image converter (separate from editor)
   Used by SEO landings: pdf-to-word, pdf-to-excel, pdf-to-jpg, pdf-converter.

   Flow:
     1. User uploads a PDF
     2. Fake "Converting…" progress (~4s) — no real API call yet
     3. PaywallModal opens (handles auth + Stripe payment)
     4. On payment success: real call to /api/convert/pdf-to/:format,
        autodownload the result, then navigate to /payment/success
   ============================================================= */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Upload, FileText, Loader2, CheckCircle2, RefreshCw, Cloud, ArrowRight,
  Download as DownloadIcon, FileSpreadsheet, Presentation, Image as ImageIcon,
  FileType, FileImage, Layers, Scissors, Minimize2,
} from "lucide-react";
import { toast } from "sonner";
// pdfjs-safe polyfills Uint8Array hex methods that pdfjs v5 requires.
// Importing it here guarantees they run before the dynamic pdfjs import.
import { pdfjsCompatOpts } from "@/lib/pdfjs-safe";

// Configure pdfjs worker once per module — guards against re-init on hot-reload.
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

// Render page 1 of a PDF to a small preview JPEG (data URL).
async function renderPdfThumbnail(file: File, maxWidth = 240): Promise<string | null> {
  try {
    const pdfjsLib = await loadPdfjs();
    const arr = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arr), ...pdfjsCompatOpts() }).promise;
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
    console.warn("[ConverterPage] PDF preview failed:", err);
    return null;
  }
}

export type ConverterTarget = "docx" | "xlsx" | "pptx" | "jpg";

// Visual identity per output format — Word blue, Excel green, PPT orange, JPG gray.
// `readyKey/eyebrowKey/subtitleKey` reference i18n keys resolved at render time.
const FORMAT_META: Record<ConverterTarget, {
  label: string;
  ext: string;
  color: string;
  bgColor: string;
  eyebrowKey: string;
  subtitleKey: string;
  readyKey: string;
  readyFallback: string;
  subtitleFallback: string;
}> = {
  docx: {
    label: "Word", ext: "DOCX", color: "#2B579A", bgColor: "#E8F0FA",
    eyebrowKey: "landing_converter_eyebrow_word",
    subtitleKey: "landing_converter_subtitle_word",
    readyKey: "landing_converter_ready_word",
    readyFallback: "Your Word is ready",
    subtitleFallback: "Turn any PDF into an editable .docx in seconds. Layout, fonts and images preserved.",
  },
  xlsx: {
    label: "Excel", ext: "XLSX", color: "#1F7244", bgColor: "#E8F5EC",
    eyebrowKey: "landing_converter_eyebrow_excel",
    subtitleKey: "landing_converter_subtitle_excel",
    readyKey: "landing_converter_ready_excel",
    readyFallback: "Your Excel is ready",
    subtitleFallback: "Extract tables from your PDF into a clean .xlsx spreadsheet ready to edit.",
  },
  pptx: {
    label: "PowerPoint", ext: "PPTX", color: "#D04423", bgColor: "#FBEBE5",
    eyebrowKey: "landing_converter_eyebrow_ppt",
    subtitleKey: "landing_converter_subtitle_ppt",
    readyKey: "landing_converter_ready_ppt",
    readyFallback: "Your PowerPoint is ready",
    subtitleFallback: "Reuse a PDF as a .pptx deck with editable slides, text and images.",
  },
  jpg: {
    label: "JPG", ext: "JPG", color: "#1A1A1C", bgColor: "#F0F0F2",
    eyebrowKey: "landing_converter_eyebrow_jpg",
    subtitleKey: "landing_converter_subtitle_jpg",
    readyKey: "landing_converter_ready_jpg",
    readyFallback: "Your JPG is ready",
    subtitleFallback: "Export a PDF page as a high-quality .jpg image — perfect for sharing or embedding.",
  },
};

const ACCENT = "#E63946";
const ACCENT_BORDER = "rgba(230,57,70,0.25)";
const INK = "#0A0A0B";
const MUTED = "#5A5A62";
const FAKE_CONVERT_MS = 4000;

function LogoSvg() {
  return (
    <svg width="56" height="56" viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect x="48" y="48" width="416" height="416" rx="112" fill={INK} />
      <path
        d="M176 180v152M176 180h82a50 50 0 010 100h-82"
        stroke="white" strokeWidth="34"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="342" cy="348" r="32" fill={ACCENT} />
    </svg>
  );
}

// Red squiggle underline — same asset used on the Home hero so landings share
// the identity. Lives in SVG space so it scales with font-size around it.
function SquiggleUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-0.5">
      {children}
      <svg
        className="absolute left-0 right-0 -bottom-1.5 w-full pointer-events-none"
        viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"
        height="12"
      >
        <path d="M2 9 Q 60 4, 150 5 T 298 7 L 296 11 Q 150 9, 4 12 Z" fill={ACCENT} />
      </svg>
    </span>
  );
}

// Renders the title from an i18n template like "Convert {pdf} to {format}"
// or "{pdf} en {format} convertir". Parses the placeholders, colours PDF
// red (with the squiggle underline) and the target format in its corporate
// colour. Falls back to the English template if the lang key is missing.
function renderHeadlineFromTemplate(template: string, formatLabel: string, formatColor: string) {
  // Split on placeholders preserving the {pdf} / {format} tokens.
  const parts = template.split(/(\{pdf\}|\{format\})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{pdf}") {
          return (
            <SquiggleUnderline key={i}>
              <span style={{ color: ACCENT }}>PDF</span>
            </SquiggleUnderline>
          );
        }
        if (part === "{format}") {
          return (
            <span key={i} style={{ color: formatColor }}>
              {formatLabel}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function triggerBlobDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// All conversion tools shown in the "More tools" grid below the converter card.
// Labels/descs are resolved from i18n at render time (`landing_grid_*`).
const ALL_CONVERSION_TOOLS: { slug: string; labelKey: string; labelFallback: string; descKey: string; descFallback: string; icon: typeof FileText; iconColor: string; iconBg: string }[] = [
  { slug: "pdf-to-word",       labelKey: "landing_grid_pdf_to_word_label",  labelFallback: "PDF to Word",       descKey: "landing_grid_pdf_to_word_desc",  descFallback: "Editable .docx",   icon: FileText,        iconColor: "#2B579A", iconBg: "#E8F0FA" },
  { slug: "pdf-to-excel",      labelKey: "landing_grid_pdf_to_excel_label", labelFallback: "PDF to Excel",      descKey: "landing_grid_pdf_to_excel_desc", descFallback: "Tables to .xlsx",  icon: FileSpreadsheet, iconColor: "#1F7244", iconBg: "#E8F5EC" },
  { slug: "pdf-to-powerpoint", labelKey: "landing_grid_pdf_to_ppt_label",   labelFallback: "PDF to PowerPoint", descKey: "landing_grid_pdf_to_ppt_desc",   descFallback: "Slides to .pptx",  icon: Presentation,    iconColor: "#D04423", iconBg: "#FBEBE5" },
  { slug: "pdf-to-jpg",        labelKey: "landing_grid_pdf_to_jpg_label",   labelFallback: "PDF to JPG",        descKey: "landing_grid_pdf_to_jpg_desc",   descFallback: "High-res image",   icon: ImageIcon,       iconColor: "#1A1A1C", iconBg: "#F0F0F2" },
  { slug: "word-to-pdf",       labelKey: "landing_grid_word_to_pdf_label",  labelFallback: "Word to PDF",       descKey: "landing_grid_word_to_pdf_desc",  descFallback: ".docx → .pdf",     icon: FileType,        iconColor: "#2B579A", iconBg: "#E8F0FA" },
  { slug: "jpg-to-pdf",        labelKey: "landing_grid_jpg_to_pdf_label",   labelFallback: "JPG to PDF",        descKey: "landing_grid_jpg_to_pdf_desc",   descFallback: "Photos to .pdf",   icon: FileImage,       iconColor: "#E63946", iconBg: "#FEE7EA" },
  { slug: "png-to-pdf",        labelKey: "landing_grid_png_to_pdf_label",   labelFallback: "PNG to PDF",        descKey: "landing_grid_png_to_pdf_desc",   descFallback: "Images to .pdf",   icon: FileImage,       iconColor: "#0A0A0B", iconBg: "#F0F0F2" },
  { slug: "merge-pdf",         labelKey: "landing_grid_merge_label",        labelFallback: "Merge PDF",         descKey: "landing_grid_merge_desc",        descFallback: "Combine PDFs",     icon: Layers,          iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "split-pdf",         labelKey: "landing_grid_split_label",        labelFallback: "Split PDF",         descKey: "landing_grid_split_desc",        descFallback: "Extract pages",    icon: Scissors,        iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "compress-pdf",      labelKey: "landing_grid_compress_label",     labelFallback: "Compress PDF",      descKey: "landing_grid_compress_desc",     descFallback: "Reduce file size", icon: Minimize2,       iconColor: "#5A5A62", iconBg: "#F0F0F2" },
];

type Phase = "idle" | "fake-converting" | "ready" | "awaiting-payment" | "processing" | "done" | "error";

export default function ConverterPage({ target }: { target: ConverterTarget }) {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string): string =>
    ((t as any)[key] as string | undefined) || fallback;
  const meta = FORMAT_META[target];
  const eyebrow = tr(meta.eyebrowKey, `PDF → ${meta.label}`);
  const subtitle = tr(meta.subtitleKey, meta.subtitleFallback);
  const readyTitle = tr(meta.readyKey, meta.readyFallback);
  const titleTemplate = tr("landing_converter_title_template", "Convert {pdf} to {format}");
  const successCta = tr("landing_converter_success_cta", "Convert another PDF");
  const docTitle = titleTemplate.replace("{pdf}", "PDF").replace("{format}", meta.label);
  const [location, navigate] = useLocation();
  // Detect active landing slug to highlight (or skip) the corresponding tile in the grid below.
  const activeSlugMatch = location.match(/\/[a-z]{2}\/([^/?#]+)/);
  const activeSlug = activeSlugMatch ? activeSlugMatch[1] : "";
  const langMatch = location.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : "en";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [resultName, setResultName] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fakeTimerRef = useRef<number | null>(null);

  const reset = () => {
    if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null; }
    setFile(null);
    setPhase("idle");
    setProgress(0);
    setResultName(null);
    setShowPaywall(false);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Step 1: user picks PDF → render preview thumb in parallel + fake progress ──
  const startFakeConvert = (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error(tr("landing_common_only_pdf", "Only PDF files are supported"));
      return;
    }
    setFile(f);
    setPhase("fake-converting");
    setProgress(3);

    // Render PDF page 1 thumbnail in parallel — used for the "ready" preview card
    renderPdfThumbnail(f).then(setPreviewUrl).catch(() => setPreviewUrl(null));

    const stepMs = 200;
    const inc = Math.max(1, Math.ceil(95 / (FAKE_CONVERT_MS / stepMs)));
    fakeTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + inc, 95);
        if (next >= 95) {
          if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null; }
          // Brief settle, then jump to 100 and show "ready" card
          window.setTimeout(() => {
            setProgress(100);
            setPhase("ready");
          }, 500);
        }
        return next;
      });
    }, stepMs);
  };

  // ── Step 3: user clicks Download → open auth + paywall ──
  const handleDownloadClick = () => {
    setPhase("awaiting-payment");
    setShowPaywall(true);
  };

  // ── Step 4: after Stripe payment → real conversion + autodownload ──
  const handlePaymentSuccess = async (transactionId?: string) => {
    setShowPaywall(false);
    if (!file) return;

    setPhase("processing");
    setProgress(60);
    toast.loading(tr("landing_converter_converting", "Converting your PDF…"), { id: "post-pay-conv" });

    let downloaded = false;
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const resp = await fetch(`/api/convert/pdf-to/${target}`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!resp.ok) {
        let msg = `Conversion failed (${resp.status})`;
        try {
          const data = await resp.json();
          if (data?.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await resp.blob();
      const headerName = resp.headers.get("X-Converted-Name");
      const outName = headerName
        ? decodeURIComponent(headerName)
        : file.name.replace(/\.pdf$/i, "") + "." + target;

      triggerBlobDownload(blob, outName);
      downloaded = true;
      setResultName(outName);
      setProgress(100);
      setPhase("done");
      toast.success(tr("landing_converter_complete_title", "Conversion complete") + "!", { id: "post-pay-conv" });
    } catch (err) {
      toast.error((err as Error).message || tr("landing_converter_error_title", "Something went wrong"), { id: "post-pay-conv" });
      setPhase("error");
    }

    // Navigate to /payment/success for conversion tracking — keeps consistency with editor flow
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";
    const txnParam = transactionId
      ? `?txn=${encodeURIComponent(transactionId)}`
      : `?txn=pmt_${Date.now()}`;
    // Slight delay so the user sees the "done" state before redirect
    if (downloaded) {
      window.setTimeout(() => navigate(`/${lang}/payment/success${txnParam}`), 1200);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) startFakeConvert(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startFakeConvert(f);
  };

  // Tab title
  useEffect(() => {
    const prev = document.title;
    document.title = `${docTitle} · editorpdf.net`;
    return () => { document.title = prev; };
  }, [docTitle]);

  // Cleanup any running timer on unmount
  useEffect(() => () => {
    if (fakeTimerRef.current) clearInterval(fakeTimerRef.current);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0B]">
      <Navbar />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      <section className="relative pt-16 md:pt-[72px] pb-20 overflow-hidden flex-1">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-20">
          <p className="text-center text-[12px] font-semibold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>
            {eyebrow}
          </p>

          <h1 className="text-center text-3xl md:text-5xl font-extrabold leading-[1.1] tracking-[-0.02em] mb-4">
            {renderHeadlineFromTemplate(titleTemplate, meta.label, meta.color)}
          </h1>
          <p className="text-center text-[15px] md:text-base max-w-xl mx-auto mb-10" style={{ color: MUTED }}>
            {subtitle}
          </p>

          <div className="max-w-xl mx-auto">
            <div
              className="rounded-[22px] p-6"
              style={{
                background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
                border: "1px solid rgba(10,10,11,0.08)",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(10,10,11,0.02), 0 2px 4px rgba(10,10,11,0.04), 0 12px 24px -8px rgba(10,10,11,0.08), 0 32px 56px -16px rgba(10,10,11,0.12)",
              }}
            >
              {phase === "idle" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-[1.5px] border-dashed cursor-pointer transition-all flex flex-col md:flex-row items-center justify-center gap-3 text-center"
                  style={{
                    borderColor: isDragging ? ACCENT : ACCENT_BORDER,
                    background: isDragging
                      ? "linear-gradient(180deg,#FDE3E6,#FFF1F2)"
                      : "linear-gradient(180deg,#FEF6F7,#FFFBFB)",
                    padding: "44px 24px",
                    minHeight: 160,
                  }}
                >
                  <strong className="text-[15px] font-bold text-[#0A0A0B]">{tr("landing_common_drop_here", "Drop your PDF here")}</strong>
                  <span className="text-[15px] text-[#1A1A1C] font-medium">{tr("landing_common_or", "or")}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E63946] text-white text-sm font-bold border border-[#E63946] shadow-[0_6px_16px_-6px_rgba(230,57,70,0.55)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all"
                    type="button"
                  >
                    <Upload className="w-4 h-4" />
                    {tr("landing_common_select_pdf", "Select PDF")}
                  </button>
                </div>
              )}

              {(phase === "fake-converting" || phase === "processing") && file && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center relative">
                    <FileText className="w-7 h-7 text-white" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px] text-[#0A0A0B] truncate max-w-[280px]">{file.name}</p>
                    <p className="text-[13px]" style={{ color: MUTED }}>{formatBytes(file.size)}</p>
                  </div>
                  <div className="w-full max-w-sm">
                    <div className="h-2 rounded-full bg-[#F0F0F2] overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%`, background: ACCENT }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[12px]" style={{ color: MUTED }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {phase === "processing"
                          ? tr("landing_converter_finalizing", "Finalizing your file…")
                          : tr("landing_converter_converting", "Converting your PDF…")}
                      </span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {(phase === "ready" || phase === "awaiting-payment") && file && (() => {
                const outName = file.name.replace(/\.pdf$/i, "") + "." + target;
                return (
                  <div className="flex flex-col items-center gap-5 py-4">
                    {/* Preview card — PDF thumbnail framed as the target format */}
                    <div
                      className="relative rounded-xl overflow-hidden shadow-[0_12px_28px_-12px_rgba(10,10,11,0.25)]"
                      style={{
                        width: 200,
                        background: "#FFFFFF",
                        border: "1px solid rgba(10,10,11,0.08)",
                      }}
                    >
                      {/* Format header bar */}
                      <div
                        className="flex items-center justify-between px-3 py-1.5"
                        style={{ background: meta.color }}
                      >
                        <span className="text-[10px] font-extrabold tracking-[0.12em] text-white">
                          {meta.ext}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      {/* Page thumbnail */}
                      <div
                        className="relative flex items-center justify-center"
                        style={{ background: meta.bgColor, aspectRatio: "0.707" }}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Document preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-10 h-10" style={{ color: meta.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: meta.color }}>
                              {meta.label} {tr("landing_converter_preview_suffix", "preview")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title + filename */}
                    <div className="text-center px-2">
                      <p className="font-extrabold text-[18px] text-[#0A0A0B] tracking-[-0.01em] flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" style={{ color: "#1E9E63" }} />
                        {readyTitle}
                      </p>
                      <p className="text-[13px] mt-1 truncate max-w-[280px] mx-auto" style={{ color: MUTED }}>
                        <span className="font-semibold text-[#1A1A1C]">{outName}</span>
                        {" · "}{formatBytes(file.size)}
                      </p>
                    </div>

                    {/* Download button */}
                    <button
                      onClick={handleDownloadClick}
                      disabled={phase === "awaiting-payment"}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-60"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      {tr("landing_converter_download_prefix", "Download")} {meta.label}
                    </button>
                    <p className="text-[11px]" style={{ color: MUTED }}>
                      {tr("landing_converter_account_required", "A free account is required to download.")}
                    </p>
                  </div>
                );
              })()}

              {phase === "done" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#E8F7EF]">
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#1E9E63" }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[17px] text-[#0A0A0B]">{tr("landing_converter_complete_title", "Conversion complete")}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: MUTED }}>
                      {tr("landing_common_file_downloaded_pre", "Your file")} <strong className="text-[#0A0A0B]">{resultName}</strong> {tr("landing_common_file_downloaded_post", "has been downloaded.")}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A0A0B] text-white text-sm font-bold hover:bg-[#1A1A1C] transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {successCta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {phase === "error" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="font-bold text-[15px] text-[#0A0A0B]">{tr("landing_converter_error_title", "Something went wrong")}</p>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E63946] text-white text-sm font-bold hover:bg-[#C72738] transition-all"
                  >
                    {tr("landing_converter_try_again", "Try again")}
                  </button>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: MUTED }}>
                  <Cloud className="w-3.5 h-3.5" />
                  {tr("landing_converter_files_limit", "Files up to 100 MB · Processed securely")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-[12px]" style={{ color: MUTED }}>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                {tr("landing_common_no_installation", "No installation")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                {tr("landing_common_any_device", "Works on any device")}
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                {tr("landing_converter_high_fidelity", "High-fidelity output")}
              </span>
            </div>
          </div>

          {/* ─── More conversion tools ─── */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[12px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: ACCENT }}>
                {tr("landing_converter_all_tools_kicker", "All conversion tools")}
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-[#0A0A0B]">
                {tr("landing_converter_need_different", "Need a different conversion?")}
              </h2>
              <p className="text-[14px] mt-2" style={{ color: MUTED }}>
                {tr("landing_common_pick_another", "Pick another tool — same simple flow, no installation required.")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {ALL_CONVERSION_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.slug === activeSlug;
                const href = `/${lang}/${tool.slug}`;
                return (
                  <a
                    key={tool.slug}
                    href={href}
                    onClick={(e) => {
                      if (isActive) { e.preventDefault(); return; }
                      e.preventDefault();
                      navigate(href);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex flex-col items-start gap-2 rounded-xl p-3.5 transition-all ${
                      isActive
                        ? "border-[1.5px] cursor-default"
                        : "border bg-white hover:border-[#0A0A0B]/30 hover:-translate-y-px hover:shadow-[0_8px_20px_-10px_rgba(10,10,11,0.18)]"
                    }`}
                    style={{
                      borderColor: isActive ? ACCENT : "#E8E8EC",
                      background: isActive ? "#FFF8F8" : undefined,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: tool.iconBg }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: tool.iconColor, width: 18, height: 18 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#0A0A0B] leading-tight">{tr(tool.labelKey, tool.labelFallback)}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: MUTED }}>{tr(tool.descKey, tool.descFallback)}</p>
                    </div>
                    {isActive && (
                      <span className="absolute top-2 right-2 text-[9px] font-extrabold tracking-[0.1em] px-1.5 py-0.5 rounded" style={{ background: ACCENT, color: "white" }}>
                        NOW
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-16 opacity-90">
            <LogoSvg />
            <span className="text-[13px] font-semibold tracking-[-0.02em]">
              <span className="text-[#0A0A0B]">editorpdf</span>
              <span style={{ color: ACCENT }}>.net</span>
            </span>
          </div>
        </div>
      </section>

      <Footer />

      {/* Paywall (auth + Stripe). Opens after the fake conversion finishes. */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          if (phase === "awaiting-payment") setPhase("ready");
        }}
        buildPdfForUpload={async () => {
          if (!file) return null;
          try {
            const base64 = await fileToBase64(file);
            return { base64, name: file.name, size: file.size };
          } catch {
            return null;
          }
        }}
        thumbnailUrl={previewUrl ?? undefined}
        converter={{ label: FORMAT_META[target].label, price: "0,50€" }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
