/* =============================================================
   MergeLandingPage — dedicated SEO landing for /merge-pdf
   Distinct from the generic ToolLanding because the merge tool
   needs a *multi-file* upload + reorder UI before the merge runs.
   The actual merge happens in-browser via pdf-lib; the paywall
   gates the *download* of the merged result, matching the editor
   model (0,50 € intro for non-paid users; premium downloads free).
   ============================================================= */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PDFDocument } from "pdf-lib";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Upload, Layers, Loader2, CheckCircle2, RefreshCw, ArrowRight,
  X as XIcon, ArrowUp, ArrowDown, Cloud, Download as DownloadIcon,
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  FileType, FileImage, Scissors, Minimize2,
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

// Cross-tool grid identical to ConverterPage's so navigation between SEO
// landings feels consistent. Highlights the active slug ("merge-pdf") with
// a "NOW" badge.
type ToolEntry = {
  slug: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  iconColor: string;
  iconBg: string;
};
// Each tool's label + desc are looked up via i18n keys (`landing_grid_*`).
// We keep an English fallback inline so the page never shows blanks.
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

type Phase = "idle" | "have-files" | "merging" | "ready" | "awaiting-payment" | "done";

export default function MergeLandingPage() {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const langMatch = location.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [mergedName, setMergedName] = useState<string>("merged.pdf");
  const [showPaywall, setShowPaywall] = useState(false);

  // Localized copy with English fallbacks so the page never shows blanks
  // while the language context resolves. Supports {var} interpolation.
  const tr = (key: string, fallback: string, vars?: Record<string, string | number>): string => {
    let s = ((t as any)[key] as string | undefined) || fallback;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    return s;
  };
  const heroTitle = tr("landing_merge_h1", "Merge PDF files");
  const heroSubtitle = tr("landing_merge_subtitle", "Combine multiple PDFs into a single document in seconds.");
  const eyebrow = tr("landing_merge_preheader", "Merge PDF");
  const ctaSelect = tr("landing_merge_cta", "Select PDFs");
  const ctaDrag = tr("landing_merge_drag", "or drag your files here");

  useEffect(() => {
    const prev = document.title;
    document.title = `${tr("landing_merge_meta_title", heroTitle)} · editorpdf.net`;
    return () => { document.title = prev; };
  }, [heroTitle]);

  const reset = () => {
    setFiles([]);
    setPhase("idle");
    setMergedBytes(null);
    setShowPaywall(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptPdfs = (incoming: File[]) => {
    const pdfs = incoming.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) {
      toast.error(tr("landing_common_only_pdf", "Only PDF files are supported"));
      return;
    }
    setFiles((prev) => [...prev, ...pdfs]);
    setPhase("have-files");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (e.target) e.target.value = ""; // allow re-picking the same files
    acceptPdfs(incoming);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const incoming = Array.from(e.dataTransfer.files ?? []);
    acceptPdfs(incoming);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  };

  const moveFile = (idx: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const doMerge = async () => {
    if (files.length < 2) {
      toast.error(tr("landing_merge_toast_min", "Add at least two PDFs to merge"));
      return;
    }
    setPhase("merging");
    toast.loading(tr("landing_merge_toast_loading", "Merging PDFs…"), { id: "merge" });
    try {
      const merged = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();
      setMergedBytes(new Uint8Array(out));
      const base = files[0].name.replace(/\.pdf$/i, "");
      setMergedName(`${base}-merged.pdf`);
      setPhase("ready");
      toast.success(tr("landing_merge_toast_success", "Merged! Ready to download."), { id: "merge" });
    } catch (err) {
      console.error("[merge] failed:", err);
      toast.error(tr("landing_merge_toast_error", "Could not merge PDFs"), { id: "merge" });
      setPhase("have-files");
    }
  };

  const handleDownloadClick = () => {
    setPhase("awaiting-payment");
    setShowPaywall(true);
  };

  // PaywallModal calls back here on Stripe/Sipay success.
  // The merge already ran in browser, so we just trigger the download.
  const handlePaymentSuccess = (transactionId?: string) => {
    setShowPaywall(false);
    if (!mergedBytes) return;
    const blob = new Blob([mergedBytes as unknown as ArrayBuffer], { type: "application/pdf" });
    triggerBlobDownload(blob, mergedName);
    setPhase("done");
    const txnParam = transactionId
      ? `?txn=${encodeURIComponent(transactionId)}`
      : `?txn=merge_${Date.now()}`;
    window.setTimeout(() => navigate(`/${lang}/payment/success${txnParam}`), 1200);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0B]">
      <Navbar />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <section className="relative pt-16 md:pt-[72px] pb-20 overflow-hidden flex-1">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-20">
          <p className="text-center text-[12px] font-semibold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>
            {eyebrow}
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
              {/* ── Phase: idle (no files yet) ─────────────────────────────── */}
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
                  <Layers className="w-10 h-10" style={{ color: ACCENT }} />
                  <strong className="text-[15px] font-bold text-[#0A0A0B]">{ctaDrag}</strong>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E63946] text-white text-sm font-bold border border-[#E63946] shadow-[0_6px_16px_-6px_rgba(230,57,70,0.55)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all"
                    type="button"
                  >
                    <Upload className="w-4 h-4" />
                    {ctaSelect}
                  </button>
                  <p className="text-[12px] mt-1" style={{ color: MUTED }}>
                    {tr("landing_merge_drag_subtitle", "Select 2 or more PDFs · in any order")}
                  </p>
                </div>
              )}

              {/* ── Phase: files chosen, ready to merge ────────────────────── */}
              {phase === "have-files" && files.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#0A0A0B]">
                      {files.length} {files.length === 1
                        ? tr("landing_merge_file_word", "file")
                        : tr("landing_merge_files_word", "files")} · {formatBytes(totalSize)}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[12px] font-semibold inline-flex items-center gap-1 hover:underline"
                      style={{ color: ACCENT }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {tr("landing_merge_add_more", "Add more")}
                    </button>
                  </div>

                  <ul className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 p-2 rounded-xl border bg-white"
                        style={{ borderColor: "#E8E8EC" }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#FEE7EA]">
                          <FileText className="w-4.5 h-4.5" style={{ color: ACCENT, width: 18, height: 18 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0A0A0B] truncate">{f.name}</p>
                          <p className="text-[11px]" style={{ color: MUTED }}>{formatBytes(f.size)}</p>
                        </div>
                        <button
                          onClick={() => moveFile(i, -1)}
                          disabled={i === 0}
                          className="p-1.5 rounded-md hover:bg-[#F0F0F2] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" style={{ color: MUTED }} />
                        </button>
                        <button
                          onClick={() => moveFile(i, 1)}
                          disabled={i === files.length - 1}
                          className="p-1.5 rounded-md hover:bg-[#F0F0F2] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
                        </button>
                        <button
                          onClick={() => removeFile(i)}
                          className="p-1.5 rounded-md hover:bg-[#FEE7EA]"
                          aria-label="Remove"
                        >
                          <XIcon className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={doMerge}
                    disabled={files.length < 2}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Layers className="w-4 h-4" />
                    {tr("landing_merge_button", "Merge")} {files.length >= 2 ? files.length : ""} PDFs
                  </button>
                  {files.length < 2 && (
                    <p className="text-center text-[11px]" style={{ color: MUTED }}>
                      {tr("landing_merge_more_pdfs_hint", "Add at least one more PDF to merge.")}
                    </p>
                  )}
                </div>
              )}

              {/* ── Phase: merging (spinner) ───────────────────────────────── */}
              {phase === "merging" && (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center relative">
                    <Layers className="w-7 h-7 text-white" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px] text-[#0A0A0B]">{tr("landing_merge_loading_title", "Merging your PDFs…")}</p>
                    <p className="text-[12px] mt-1 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {tr("landing_merge_loading_subtitle", "This happens entirely in your browser")}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Phase: ready or awaiting-payment ──────────────────────── */}
              {(phase === "ready" || phase === "awaiting-payment") && mergedBytes && (
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
                    <div className="relative flex flex-col items-center justify-center gap-2 py-8" style={{ background: "#FEF6F7", aspectRatio: "0.707" }}>
                      <Layers className="w-12 h-12" style={{ color: ACCENT }} />
                      <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>
                        {files.length} {tr("landing_merge_card_label", "PDFs · merged")}
                      </span>
                    </div>
                  </div>

                  <div className="text-center px-2">
                    <p className="font-extrabold text-[18px] text-[#0A0A0B] tracking-[-0.01em] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#1E9E63" }} />
                      {tr("landing_merge_ready_title", "Your merged PDF is ready")}
                    </p>
                    <p className="text-[13px] mt-1 truncate max-w-[280px] mx-auto" style={{ color: MUTED }}>
                      <span className="font-semibold text-[#1A1A1C]">{mergedName}</span>
                      {" · "}{formatBytes(mergedBytes.byteLength)}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadClick}
                    disabled={phase === "awaiting-payment"}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-60"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {tr("landing_merge_download_button", "Download merged PDF")}
                  </button>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {tr("landing_common_unlock_price", "Only 0,50 € to unlock the download.")}
                  </p>
                </div>
              )}

              {/* ── Phase: done ────────────────────────────────────────────── */}
              {phase === "done" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#E8F7EF]">
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#1E9E63" }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[17px] text-[#0A0A0B]">{tr("landing_common_download_complete", "Download complete")}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: MUTED }}>
                      {tr("landing_common_file_downloaded_pre", "Your file")} <strong className="text-[#0A0A0B]">{mergedName}</strong> {tr("landing_common_file_downloaded_post", "has been downloaded.")}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A0A0B] text-white text-sm font-bold hover:bg-[#1A1A1C] transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {tr("landing_merge_another", "Merge more PDFs")}
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

          {/* ─── More tools ─── */}
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
                const isActive = tool.slug === "merge-pdf";
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

      {/* Paywall (auth + payment). Reuses the editor's PaywallModal so the
          checkout UX is identical (FastPay + Apple Pay + Google Pay + 0,50 €). */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          if (phase === "awaiting-payment") setPhase("ready");
        }}
        buildPdfForUpload={async () => {
          if (!mergedBytes) return null;
          const base64 = bytesToBase64(mergedBytes);
          return { base64, name: mergedName, size: mergedBytes.byteLength };
        }}
        converter={{ label: "merged PDF", price: "0,50€" }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
