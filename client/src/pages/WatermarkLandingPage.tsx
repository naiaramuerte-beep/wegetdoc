/* =============================================================
   WatermarkLandingPage — dedicated SEO landing for /watermark-pdf.
   Upload one PDF → type the watermark text → choose opacity +
   position (diagonal / center / footer) → pdf-lib drawText on
   every page entirely in the browser → paywall on download.
   Same pattern/visual language as Split / Compress / Rotate.
   ============================================================= */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Upload, Droplet, Loader2, CheckCircle2, RefreshCw, ArrowRight,
  Cloud, Download as DownloadIcon,
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  FileType, FileImage, Layers, Minimize2, Scissors, RotateCw,
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

type ToolEntry = {
  slug: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  iconColor: string;
  iconBg: string;
};
const ALL_TOOLS: ToolEntry[] = [
  { slug: "pdf-to-word",       label: "PDF to Word",       desc: "Editable .docx",   icon: FileText,        iconColor: "#2B579A", iconBg: "#E8F0FA" },
  { slug: "pdf-to-excel",      label: "PDF to Excel",      desc: "Tables to .xlsx",  icon: FileSpreadsheet, iconColor: "#1F7244", iconBg: "#E8F5EC" },
  { slug: "pdf-to-powerpoint", label: "PDF to PowerPoint", desc: "Slides to .pptx",  icon: Presentation,    iconColor: "#D04423", iconBg: "#FBEBE5" },
  { slug: "pdf-to-jpg",        label: "PDF to JPG",        desc: "High-res image",   icon: ImageIcon,       iconColor: "#1A1A1C", iconBg: "#F0F0F2" },
  { slug: "word-to-pdf",       label: "Word to PDF",       desc: ".docx → .pdf",     icon: FileType,        iconColor: "#2B579A", iconBg: "#E8F0FA" },
  { slug: "jpg-to-pdf",        label: "JPG to PDF",        desc: "Photos to .pdf",   icon: FileImage,       iconColor: "#E63946", iconBg: "#FEE7EA" },
  { slug: "png-to-pdf",        label: "PNG to PDF",        desc: "Images to .pdf",   icon: FileImage,       iconColor: "#0A0A0B", iconBg: "#F0F0F2" },
  { slug: "merge-pdf",         label: "Merge PDF",         desc: "Combine PDFs",     icon: Layers,          iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "split-pdf",         label: "Split PDF",         desc: "Extract pages",    icon: Scissors,        iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "compress-pdf",      label: "Compress PDF",      desc: "Reduce file size", icon: Minimize2,       iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "rotate-pdf",        label: "Rotate PDF",        desc: "Turn pages",       icon: RotateCw,        iconColor: "#5A5A62", iconBg: "#F0F0F2" },
  { slug: "watermark-pdf",     label: "Watermark PDF",     desc: "Stamp text",       icon: Droplet,         iconColor: "#5A5A62", iconBg: "#F0F0F2" },
];

type Phase = "idle" | "have-file" | "stamping" | "ready" | "awaiting-payment" | "done";
type Position = "diagonal" | "center" | "footer";

export default function WatermarkLandingPage() {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const langMatch = location.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(30); // percent
  const [position, setPosition] = useState<Position>("diagonal");
  const [phase, setPhase] = useState<Phase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [stampedBytes, setStampedBytes] = useState<Uint8Array | null>(null);
  const [stampedName, setStampedName] = useState("watermarked.pdf");
  const [showPaywall, setShowPaywall] = useState(false);

  const tr = (key: string, fallback: string): string =>
    ((t as any)[key] as string | undefined) || fallback;
  const heroTitle = tr("landing_watermark_h1", "Watermark PDF");
  const heroSubtitle = tr("landing_watermark_subtitle", "Stamp every page with text — confidential, draft, your brand. In your browser.");

  useEffect(() => {
    const prev = document.title;
    document.title = `${tr("landing_watermark_meta_title", heroTitle)} · editorpdf.net`;
    return () => { document.title = prev; };
  }, [heroTitle]);

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setText("CONFIDENTIAL");
    setOpacity(30);
    setPosition("diagonal");
    setStampedBytes(null);
    setShowPaywall(false);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptPdf = async (incoming: File | undefined) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf" && !incoming.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setFile(incoming);
    setPhase("have-file");
    try {
      const bytes = new Uint8Array(await incoming.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      toast.error("Couldn't read the PDF");
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

  const doStamp = async () => {
    if (!file || pageCount === 0) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Enter the watermark text");
      return;
    }
    setPhase("stamping");
    toast.loading("Stamping pages…", { id: "wm" });
    try {
      const doc = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
      // Helvetica is built-in — no fontkit, no extra bytes. Latin-only;
      // non-Latin text falls back to glyphs Helvetica supports and we
      // sanitize unknowns to "?" so embed doesn't throw.
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const safe = trimmed.replace(/[^\x00-\xFF]/g, "?");
      const alpha = Math.max(0.05, Math.min(1, opacity / 100));
      const grey = rgb(0.55, 0.55, 0.55);
      for (const page of doc.getPages()) {
        const { width: w, height: h } = page.getSize();
        // Per-position layout: size + xy + rotation. Diagonal scales to the
        // page diagonal so it always fills the page proportionally.
        if (position === "diagonal") {
          const diag = Math.sqrt(w * w + h * h);
          const fontSize = diag / Math.max(safe.length * 0.55, 6);
          const textWidth = font.widthOfTextAtSize(safe, fontSize);
          const cx = w / 2;
          const cy = h / 2;
          // Rotation pivot for pdf-lib's drawText is the bottom-left corner,
          // so we offset by the rotated half-width/half-height.
          const angleRad = Math.atan2(h, w);
          const halfX = (textWidth / 2) * Math.cos(angleRad) - (fontSize / 2) * Math.sin(angleRad);
          const halfY = (textWidth / 2) * Math.sin(angleRad) + (fontSize / 2) * Math.cos(angleRad);
          page.drawText(safe, {
            x: cx - halfX,
            y: cy - halfY,
            size: fontSize,
            font,
            color: grey,
            opacity: alpha,
            rotate: degrees((angleRad * 180) / Math.PI),
          });
        } else if (position === "center") {
          const fontSize = Math.min(w / Math.max(safe.length * 0.55, 6), h * 0.18);
          const textWidth = font.widthOfTextAtSize(safe, fontSize);
          page.drawText(safe, {
            x: (w - textWidth) / 2,
            y: (h - fontSize) / 2,
            size: fontSize,
            font,
            color: grey,
            opacity: alpha,
          });
        } else {
          // footer
          const fontSize = Math.min(w / Math.max(safe.length * 0.55, 12), 24);
          const textWidth = font.widthOfTextAtSize(safe, fontSize);
          page.drawText(safe, {
            x: (w - textWidth) / 2,
            y: 18,
            size: fontSize,
            font,
            color: grey,
            opacity: alpha,
          });
        }
      }
      const saved = await doc.save();
      setStampedBytes(new Uint8Array(saved));
      const base = file.name.replace(/\.pdf$/i, "");
      setStampedName(`${base}-watermarked.pdf`);
      setPhase("ready");
      toast.success(`Watermark applied to ${pageCount} page${pageCount === 1 ? "" : "s"}`, { id: "wm" });
    } catch (err) {
      console.error("[watermark] failed:", err);
      toast.error("Could not watermark the PDF", { id: "wm" });
      setPhase("have-file");
    }
  };

  const handleDownloadClick = () => {
    setPhase("awaiting-payment");
    setShowPaywall(true);
  };

  const handlePaymentSuccess = (transactionId?: string) => {
    setShowPaywall(false);
    if (!stampedBytes) return;
    const blob = new Blob([stampedBytes as unknown as ArrayBuffer], { type: "application/pdf" });
    triggerBlobDownload(blob, stampedName);
    setPhase("done");
    const txnParam = transactionId
      ? `?txn=${encodeURIComponent(transactionId)}`
      : `?txn=watermark_${Date.now()}`;
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
            WATERMARK PDF
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
                  <Droplet className="w-10 h-10" style={{ color: ACCENT }} />
                  <strong className="text-[15px] font-bold text-[#0A0A0B]">Drop your PDF here</strong>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E63946] text-white text-sm font-bold border border-[#E63946] shadow-[0_6px_16px_-6px_rgba(230,57,70,0.55)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all"
                    type="button"
                  >
                    <Upload className="w-4 h-4" />
                    Select PDF
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
                        {formatBytes(file.size)} · {pageCount} page{pageCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      onClick={reset}
                      className="text-[12px] font-semibold hover:underline"
                      style={{ color: ACCENT }}
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#0A0A0B]">Watermark text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={80}
                      placeholder="CONFIDENTIAL"
                      className="w-full px-4 py-3 rounded-xl border bg-white text-[14px] text-[#0A0A0B] placeholder:text-[#A5A5AE] focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946]"
                      style={{ borderColor: "#E8E8EC" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#0A0A0B]">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: "diagonal" as const, label: "Diagonal" },
                        { value: "center" as const, label: "Center" },
                        { value: "footer" as const, label: "Footer" },
                      ]).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPosition(value)}
                          className="relative flex items-center justify-center px-3 py-3 rounded-xl border-[1.5px] transition-all hover:border-[#0A0A0B]/30 hover:-translate-y-px"
                          style={{
                            borderColor: position === value ? ACCENT : "#E8E8EC",
                            background: position === value ? "#FFF8F8" : "#fff",
                            color: position === value ? ACCENT : "#0A0A0B",
                          }}
                        >
                          <span className="text-[13px] font-bold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#0A0A0B] flex items-center justify-between">
                      <span>Opacity</span>
                      <span className="font-mono text-[11px] font-normal" style={{ color: MUTED }}>{opacity}%</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-[#E63946]"
                    />
                  </div>

                  <button
                    onClick={doStamp}
                    disabled={!text.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Droplet className="w-4 h-4" />
                    Add watermark
                  </button>
                </div>
              )}

              {phase === "stamping" && (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center relative">
                    <Droplet className="w-7 h-7 text-white" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px] text-[#0A0A0B]">Stamping pages…</p>
                    <p className="text-[12px] mt-1 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Runs locally in your browser
                    </p>
                  </div>
                </div>
              )}

              {(phase === "ready" || phase === "awaiting-payment") && stampedBytes && (
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
                    <div className="relative flex flex-col items-center justify-center gap-2 py-8 overflow-hidden" style={{ background: "#FEF6F7", aspectRatio: "0.707" }}>
                      <span
                        className="absolute font-extrabold text-[14px] uppercase whitespace-nowrap"
                        style={{
                          color: ACCENT,
                          opacity: opacity / 100,
                          transform: position === "diagonal" ? "rotate(-30deg)" : position === "footer" ? "translateY(50px)" : "translateY(0)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {text || "WATERMARK"}
                      </span>
                      <Droplet className="w-12 h-12 opacity-30" style={{ color: ACCENT }} />
                    </div>
                  </div>

                  <div className="text-center px-2">
                    <p className="font-extrabold text-[18px] text-[#0A0A0B] tracking-[-0.01em] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#1E9E63" }} />
                      Your watermarked PDF is ready
                    </p>
                    <p className="text-[13px] mt-1 truncate max-w-[280px] mx-auto" style={{ color: MUTED }}>
                      <span className="font-semibold text-[#1A1A1C]">{stampedName}</span>
                      {" · "}{formatBytes(stampedBytes.byteLength)}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadClick}
                    disabled={phase === "awaiting-payment"}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E63946] text-white text-[15px] font-extrabold border border-[#E63946] shadow-[0_8px_20px_-6px_rgba(230,57,70,0.6)] hover:bg-[#C72738] hover:border-[#C72738] hover:-translate-y-px transition-all disabled:opacity-60"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download
                  </button>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    Only 0,50 € to unlock the download.
                  </p>
                </div>
              )}

              {phase === "done" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#E8F7EF]">
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#1E9E63" }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[17px] text-[#0A0A0B]">Download complete</p>
                    <p className="text-[13px] mt-0.5" style={{ color: MUTED }}>
                      Your file <strong className="text-[#0A0A0B]">{stampedName}</strong> has been downloaded.
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A0A0B] text-white text-sm font-bold hover:bg-[#1A1A1C] transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Watermark another PDF
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: MUTED }}>
                  <Cloud className="w-3.5 h-3.5" />
                  Files up to 100&nbsp;MB · Processed in your browser
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-[12px]" style={{ color: MUTED }}>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                No installation
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                Private — runs locally
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
                Works on any device
              </span>
            </div>
          </div>

          <div className="mt-20 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[12px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: ACCENT }}>
                All PDF tools
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-[#0A0A0B]">
                Need a different action?
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ALL_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.slug === "watermark-pdf";
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
                      <p className="text-[13px] font-bold text-[#0A0A0B] leading-tight">{tool.label}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: MUTED }}>{tool.desc}</p>
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
          if (!stampedBytes) return null;
          const base64 = bytesToBase64(stampedBytes);
          return { base64, name: stampedName, size: stampedBytes.byteLength };
        }}
        converter={{ label: "watermarked PDF", price: "0,50€" }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
