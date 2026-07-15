/* =============================================================
   SplitLandingPage — dedicated SEO landing for /split-pdf.
   Upload one PDF → pick a page range (e.g. "1-5" or "3,7,9-12") →
   pdf-lib extracts those pages into a new PDF entirely in the
   browser → paywall on download (same model as the editor).
   ============================================================= */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PDFDocument } from "pdf-lib";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { renderPdfThumbnail } from "@/lib/pdfThumbnail";
import {
  Upload, Scissors, Loader2, CheckCircle2, RefreshCw, ArrowRight,
  Cloud, Download as DownloadIcon,
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  FileType, FileImage, Layers, Minimize2,
} from "lucide-react";
import { toast } from "sonner";

const ACCENT = "#E63946";
const ACCENT_BORDER = "rgba(230,57,70,0.25)";
const INK = "#0A0A0B";
const MUTED = "#5A5A62";

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
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

/**
 * Parse a human page-range string ("1-5, 7, 10-12") into a sorted, unique
 * array of zero-indexed page numbers. Caps at totalPages, drops anything
 * out of bounds. Returns null if the string is empty or every range is
 * invalid — caller treats that as "extract all pages".
 */
function parseRange(input: string, totalPages: number): number[] | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const out = new Set<number>();
  for (const part of cleaned.split(",").map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) {
        if (i >= 1 && i <= totalPages) out.add(i - 1);
      }
      continue;
    }
    const single = parseInt(part, 10);
    if (Number.isFinite(single) && single >= 1 && single <= totalPages) {
      out.add(single - 1);
    }
  }
  return out.size === 0 ? null : Array.from(out).sort((a, b) => a - b);
}

// Cross-tool grid — labels/descs resolved via `landing_grid_*` i18n keys at render.
const ALL_TOOLS: { slug: string; labelKey: string; labelFallback: string; descKey: string; descFallback: string; icon: typeof FileText; iconColor: string; iconBg: string }[] = [
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

type Phase = "idle" | "have-file" | "splitting" | "ready" | "awaiting-payment" | "done";

export default function SplitLandingPage() {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const langMatch = location.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [splitBytes, setSplitBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [splitName, setSplitName] = useState("split.pdf");
  const [showPaywall, setShowPaywall] = useState(false);
  // Premium/subscribed users (incl. comped admins) download without paying.
  const { data: subData } = trpc.subscription.status.useQuery(undefined, { retry: false });
  const isPremium = subData?.isPremium ?? false;

  const tr = (key: string, fallback: string, vars?: Record<string, string | number>): string => {
    let s = ((t as any)[key] as string | undefined) || fallback;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    return s;
  };
  const heroTitle = tr("landing_split_h1", "Split PDF pages");
  const heroSubtitle = tr("landing_split_subtitle", "Extract a single page or a range — keep only what you need.");

  useEffect(() => {
    const prev = document.title;
    document.title = `${tr("landing_split_meta_title", heroTitle)} · editorpdf.net`;
    return () => { document.title = prev; };
  }, [heroTitle]);

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRange("");
    setSplitBytes(null);
    setPreviewUrl(null);
    setShowPaywall(false);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptPdf = async (incoming: File | undefined) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf" && !incoming.name.toLowerCase().endsWith(".pdf")) {
      toast.error(tr("landing_common_only_pdf", "Only PDF files are supported"));
      return;
    }
    setFile(incoming);
    setPhase("have-file");
    // Read page count immediately so the input placeholder shows the total
    try {
      const bytes = new Uint8Array(await incoming.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      toast.error(tr("landing_common_couldnt_read", "Couldn't read the PDF"));
      setPageCount(0);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = "";
    acceptPdf(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptPdf(e.dataTransfer.files?.[0]);
  };

  const doSplit = async () => {
    if (!file || pageCount === 0) return;
    const indices = parseRange(range, pageCount);
    if (!indices) {
      toast.error(tr("landing_split_toast_invalid", "Enter a valid range like 1-5 or 2,4,6"));
      return;
    }
    setPhase("splitting");
    toast.loading(tr("landing_split_loading", "Extracting pages…"), { id: "split" });
    try {
      const original = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(original, indices);
      copied.forEach(p => out.addPage(p));
      const saved = await out.save();
      const outBytes = new Uint8Array(saved);
      setSplitBytes(outBytes);
      renderPdfThumbnail(outBytes).then(setPreviewUrl).catch(() => {});
      const base = file.name.replace(/\.pdf$/i, "");
      setSplitName(`${base}-pages-${range.replace(/\s+/g, "")}.pdf`);
      setPhase("ready");
      toast.success(tr("landing_split_toast_success", "Extracted {count} pages", { count: indices.length }), { id: "split" });
    } catch (err) {
      console.error("[split] failed:", err);
      toast.error(tr("landing_split_toast_error", "Could not split the PDF"), { id: "split" });
      setPhase("have-file");
    }
  };

  const handleDownloadClick = () => {
    // Premium users skip the paywall and download directly (no redirect to the
    // payment-success page since they didn't pay).
    if (isPremium && splitBytes) {
      const blob = new Blob([splitBytes as unknown as ArrayBuffer], { type: "application/pdf" });
      triggerBlobDownload(blob, splitName);
      setPhase("done");
      return;
    }
    setPhase("awaiting-payment");
    setShowPaywall(true);
  };

  const handlePaymentSuccess = (transactionId?: string) => {
    setShowPaywall(false);
    if (!splitBytes) return;
    const blob = new Blob([splitBytes as unknown as ArrayBuffer], { type: "application/pdf" });
    triggerBlobDownload(blob, splitName);
    setPhase("done");
    const txnParam = transactionId
      ? `?txn=${encodeURIComponent(transactionId)}`
      : `?txn=split_${Date.now()}`;
    window.setTimeout(() => navigate(`/${lang}/payment/success${txnParam}`), 1200);
  };

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
            {tr("landing_split_preheader", "Split PDF")}
          </p>

          <h1 className="text-center text-3xl md:text-5xl font-extrabold leading-[1.1] tracking-[-0.02em] mb-4">
            {heroTitle.split(/\s+/).map((word, i, arr) => {
              if (word.toUpperCase() === "PDF" || word.toUpperCase() === "PDFS") {
                return (
                  <span key={i}>
                    <SquiggleUnderline>
                      <span style={{ color: ACCENT }}>{word}</span>
                    </SquiggleUnderline>
                    {i < arr.length - 1 ? " " : ""}
                  </span>
                );
              }
              return <span key={i}>{word}{i < arr.length - 1 ? " " : ""}</span>;
            })}
          </h1>
          <p className="text-center text-[15px] md:text-base max-w-xl mx-auto mb-10" style={{ color: MUTED }}>
            {heroSubtitle}
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
                  className="rounded-2xl border-[1.5px] border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 text-center"
                  style={{
                    borderColor: isDragging ? ACCENT : ACCENT_BORDER,
                    background: isDragging
                      ? "linear-gradient(180deg,#FDE3E6,#FFF1F2)"
                      : "linear-gradient(180deg,#FEF6F7,#FFFBFB)",
                    padding: "44px 24px",
                    minHeight: 180,
                  }}
                >
                  <Scissors className="w-10 h-10" style={{ color: ACCENT }} />
                  <strong className="text-[15px] font-bold text-[#0A0A0B]">{tr("landing_common_drop_here", "Drop your PDF here")}</strong>
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

              {phase === "have-file" && file && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "#E8E8EC" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#FEE7EA]">
                      <FileText className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0A0A0B] truncate">{file.name}</p>
                      <p className="text-[11px]" style={{ color: MUTED }}>
                        {formatBytes(file.size)} · {pageCount} {pageCount === 1
                          ? tr("landing_common_page_word", "page")
                          : tr("landing_common_pages_word", "pages")}
                      </p>
                    </div>
                    <button
                      onClick={reset}
                      className="text-[12px] font-semibold hover:underline"
                      style={{ color: ACCENT }}
                    >
                      {tr("landing_common_change", "Change")}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#0A0A0B]">
                      {tr("landing_split_pages_label", "Pages to extract")}
                    </label>
                    <input
                      type="text"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      placeholder={tr("landing_split_pages_placeholder", "1-5,7,10-12")}
                      className="w-full px-4 py-3 rounded-xl border bg-white text-[14px] text-[#0A0A0B] placeholder:text-[#A5A5AE] focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946]"
                      style={{ borderColor: "#E8E8EC" }}
                    />
                    <p className="text-[11px]" style={{ color: MUTED }}>
                      {tr("landing_split_pages_hint", "Enter a range — e.g. 1-5,7,10-12")} · {tr("landing_split_total_pages", "{count} pages total", { count: pageCount })}
                    </p>
                  </div>

                  <button
                    onClick={doSplit}
                    disabled={!range.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Scissors className="w-4 h-4" />
                    {tr("landing_split_button", "Split PDF")}
                  </button>
                </div>
              )}

              {phase === "splitting" && (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center relative">
                    <Scissors className="w-7 h-7 text-white" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px] text-[#0A0A0B]">{tr("landing_split_loading", "Extracting pages…")}</p>
                    <p className="text-[12px] mt-1 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {tr("landing_common_runs_locally", "Runs locally in your browser")}
                    </p>
                  </div>
                </div>
              )}

              {(phase === "ready" || phase === "awaiting-payment") && splitBytes && (
                <div className="flex flex-col items-center gap-5 py-4">
                  <div
                    className="relative rounded-xl overflow-hidden shadow-[0_12px_28px_-12px_rgba(10,10,11,0.25)]"
                    style={{
                      width: 200,
                      background: "#FFFFFF",
                      border: "1px solid rgba(10,10,11,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: ACCENT }}>
                      <span className="text-[10px] font-extrabold tracking-[0.12em] text-white">PDF</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className="w-full block" style={{ aspectRatio: "0.707", objectFit: "cover", objectPosition: "top", background: "#FFFFFF" }} />
                    ) : (
                      <div className="relative flex flex-col items-center justify-center gap-2 py-8" style={{ background: "#FEF6F7", aspectRatio: "0.707" }}>
                        <Scissors className="w-12 h-12" style={{ color: ACCENT }} />
                        <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>
                          {tr("landing_split_card_label", "pages")} {range}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-center px-2">
                    <p className="font-extrabold text-[18px] text-[#0A0A0B] tracking-[-0.01em] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#1E9E63" }} />
                      {tr("landing_split_ready_title", "Your split PDF is ready")}
                    </p>
                    <p className="text-[13px] mt-1 truncate max-w-[280px] mx-auto" style={{ color: MUTED }}>
                      <span className="font-semibold text-[#1A1A1C]">{splitName}</span>
                      {" · "}{formatBytes(splitBytes.byteLength)}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadClick}
                    disabled={phase === "awaiting-payment"}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-60"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {tr("landing_split_download_button", "Download")}
                  </button>
                </div>
              )}

              {phase === "done" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#E8F7EF]">
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#1E9E63" }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[17px] text-[#0A0A0B]">{tr("landing_common_download_complete", "Download complete")}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: MUTED }}>
                      {tr("landing_common_file_downloaded_pre", "Your file")} <strong className="text-[#0A0A0B]">{splitName}</strong> {tr("landing_common_file_downloaded_post", "has been downloaded.")}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A0A0B] text-white text-sm font-bold hover:bg-[#1A1A1C] transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {tr("landing_split_another", "Split another PDF")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: MUTED }}>
                  <Cloud className="w-3.5 h-3.5" />
                  {tr("landing_common_files_limit", "Files up to 100 MB · Processed in your browser")}
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
                {tr("landing_common_private_local", "Private — runs locally")}
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                {tr("landing_common_any_device", "Works on any device")}
              </span>
            </div>
          </div>

          <div className="mt-20 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[12px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: ACCENT }}>
                {tr("landing_common_all_tools_kicker", "All PDF tools")}
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-[#0A0A0B]">
                {tr("landing_common_need_different", "Need a different action?")}
              </h2>
              <p className="text-[14px] mt-2" style={{ color: MUTED }}>
                {tr("landing_common_pick_another", "Pick another tool — same simple flow, no installation required.")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {ALL_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.slug === "split-pdf";
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
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: tool.iconBg }}>
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

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          if (phase === "awaiting-payment") setPhase("ready");
        }}
        buildPdfForUpload={async () => {
          if (!splitBytes) return null;
          const base64 = bytesToBase64(splitBytes);
          return { base64, name: splitName, size: splitBytes.byteLength };
        }}
        converter={{ label: "extracted PDF", price: "0,50€" }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
