import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Upload, ArrowRight, CheckCircle, FileUp, Download, Star,
  Shield, Zap, Globe, Lock, FileText, Layers, Scissors, Minimize2,
  Image as ImageIcon, FileSpreadsheet, RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

// ── Tool definitions ───────────────────────────────────────────
export interface ToolDef {
  slug: string;
  editorTool: string;
  acceptExtra?: string;
  i18nPrefix: string;
  icon: typeof FileText;
  accentHue: number; // oklch hue for per-tool accent
}

export const TOOL_LANDINGS: ToolDef[] = [
  { slug: "pdf-to-word",    editorTool: "convert-word",  i18nPrefix: "landing_pdf2word",    icon: FileText,        accentHue: 220 },
  { slug: "pdf-editor",     editorTool: "text",          i18nPrefix: "landing_editor",      icon: FileText,        accentHue: 264 },
  { slug: "merge-pdf",      editorTool: "merge",         i18nPrefix: "landing_merge",       icon: Layers,          accentHue: 145 },
  { slug: "compress-pdf",   editorTool: "compress",      i18nPrefix: "landing_compress",    icon: Minimize2,       accentHue: 38 },
  { slug: "jpg-to-pdf",     editorTool: "jpg-to-pdf",    i18nPrefix: "landing_jpg2pdf",     icon: ImageIcon,       accentHue: 330, acceptExtra: "image/jpeg,image/png,image/webp" },
  { slug: "pdf-to-jpg",     editorTool: "convert-jpg",   i18nPrefix: "landing_pdf2jpg",     icon: ImageIcon,       accentHue: 330 },
  { slug: "pdf-to-excel",   editorTool: "convert-excel", i18nPrefix: "landing_pdf2excel",   icon: FileSpreadsheet, accentHue: 145 },
  { slug: "word-to-pdf",    editorTool: "word-to-pdf",   i18nPrefix: "landing_word2pdf",    icon: FileText,        accentHue: 220, acceptExtra: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { slug: "split-pdf",      editorTool: "split",         i18nPrefix: "landing_split",       icon: Scissors,        accentHue: 15 },
  { slug: "pdf-converter",  editorTool: "convert-word",  i18nPrefix: "landing_converter",   icon: RotateCcw,       accentHue: 264 },
];

// ── Component ───────────────────────────────────────────────────
export default function ToolLanding({ tool }: { tool: ToolDef }) {
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();
  const { setPendingFile, setPendingTool } = usePdfFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const tr = (key: string) => (t as any)[`${tool.i18nPrefix}_${key}`] ?? "";
  const ToolIcon = tool.icon;

  useEffect(() => {
    document.title = tr("meta_title") || `${tr("h1")} | ${brandName}`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", tr("meta_desc") || tr("subtitle"));
    window.scrollTo(0, 0);
  }, [lang, tool]);

  const openEditor = useCallback((file: File) => {
    setPendingFile(file);
    setPendingTool(tool.editorTool);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang, tool.editorTool]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  const accept = tool.acceptExtra
    ? `application/pdf,.pdf,${tool.acceptExtra}`
    : "application/pdf,.pdf";

  const features: string[] = [tr("feat1"), tr("feat2"), tr("feat3"), tr("feat4")].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {/* ════════════════════════════════════════════════════════════
          HERO — white background like Home page
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />

        <div className="container relative z-10 pt-12 pb-16 md:pt-20 md:pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tool icon badge */}
            <div className="inline-flex items-center justify-center mb-6">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: colors.gradient,
                  boxShadow: `0 8px 24px ${colors.lightBg}`,
                }}
              >
                <ToolIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-5xl lg:text-[3.8rem] font-extrabold leading-[1.1] mb-5 tracking-tight"
              style={{ color: "#111" }}
            >
              {tr("h1")}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "#555" }}>
              {tr("subtitle")}
            </p>

            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer mx-auto max-w-lg rounded-2xl p-8 md:p-10 transition-all duration-300 bg-white"
              style={{
                border: isDragging ? `2px solid ${colors.primary}` : `2px dashed ${colors.lightBg}`,
                boxShadow: isDragging ? `0 0 0 4px ${colors.lightBg}` : "0 2px 12px rgba(0,0,0,0.06)",
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: colors.gradient }}
                >
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <button
                  className="px-10 py-4 rounded-xl text-white font-bold text-base md:text-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
                  style={{ background: colors.gradient, boxShadow: `0 4px 15px ${colors.lightBg}` }}
                >
                  {tr("cta") || "Upload PDF"}
                  <ArrowRight className="w-5 h-5 inline ml-2" />
                </button>
                <p className="text-sm" style={{ color: "#999" }}>
                  {tr("drag") || "or drag & drop your file here"}
                </p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              {[
                { icon: Shield, text: "SSL 256-bit" },
                { icon: Zap, text: "Fast processing" },
                { icon: Globe, text: "Any browser" },
                { icon: Lock, text: "Secure & private" },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#999" }}>
                  <badge.icon className="w-3.5 h-3.5" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps with connecting line
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ backgroundColor: "#fafafa" }}>
        <div className="container max-w-5xl mx-auto px-4">
          <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: colors.primary }}>
            {tr("how_title") || "How it works"}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16" style={{ color: "#111" }}>
            3 {lang === "es" ? "pasos sencillos" : "simple steps"}
          </h2>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-[16.5%] right-[16.5%] h-0.5" style={{ background: `linear-gradient(90deg, ${colors.primary}33, ${colors.secondary}33)` }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
              {[
                { icon: FileUp, title: tr("step1_title"), desc: tr("step1_desc"), num: "01" },
                { icon: ToolIcon, title: tr("step2_title"), desc: tr("step2_desc"), num: "02" },
                { icon: Download, title: tr("step3_title"), desc: tr("step3_desc"), num: "03" },
              ].map((step, i) => (
                <div key={i} className="relative text-center group">
                  {/* Number circle */}
                  <div className="relative mx-auto mb-6">
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto transition-transform group-hover:scale-105 group-hover:-translate-y-1"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.96 0.03 ${tool.accentHue}), oklch(0.93 0.05 ${tool.accentHue}))`,
                        boxShadow: `0 8px 24px oklch(0.5 0.1 ${tool.accentHue} / 0.12)`,
                      }}
                    >
                      <step.icon className="w-10 h-10" style={{ color: colors.primary }} />
                    </div>
                    <div
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: colors.gradient, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                    >
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#111" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed max-w-[250px] mx-auto" style={{ color: "#666" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURES — cards with icons
      ════════════════════════════════════════════════════════════ */}
      {features.length > 0 && (
        <section className="py-20 md:py-24 bg-white">
          <div className="container max-w-5xl mx-auto px-4">
            <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: colors.primary }}>
              {tr("features_title") || "Features"}
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-14" style={{ color: "#111" }}>
              {lang === "es" ? "Todo lo que necesitas" : "Everything you need"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-6 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderColor: "#eee", backgroundColor: "white" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `oklch(0.95 0.04 ${tool.accentHue})` }}
                  >
                    <CheckCircle className="w-5 h-5" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <span className="text-[15px] font-medium" style={{ color: "#222" }}>{feat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
          SOCIAL PROOF — ratings bar
      ════════════════════════════════════════════════════════════ */}
      <section className="py-10 border-y" style={{ borderColor: "#eee", backgroundColor: "#fafafa" }}>
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#1B5E20" }} />
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: "#333" }}>4.8/5</span>
            </div>
            <div className="w-px h-5" style={{ backgroundColor: "#ddd" }} />
            <span className="text-sm" style={{ color: "#666" }}>2M+ {lang === "es" ? "documentos procesados" : "documents processed"}</span>
            <div className="w-px h-5" style={{ backgroundColor: "#ddd" }} />
            <span className="text-sm" style={{ color: "#666" }}>SSL 256-bit</span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM CTA — gradient background
      ════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: colors.gradient }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            {tr("bottom_cta_title") || tr("h1")}
          </h2>
          <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.8)" }}>
            {tr("subtitle")}
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-base transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
            style={{
              backgroundColor: "white",
              color: colors.primary,
              boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            }}
          >
            <Upload className="w-5 h-5" />
            {tr("cta") || "Upload PDF"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
